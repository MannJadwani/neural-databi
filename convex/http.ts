import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api, internal } from './_generated/api';
import { chunkRows, fileNameToBaseName, parseCsvText } from './csvImport';
import { generateDashboardForImport } from './dashboardGeneration';
import { hashApiKey } from './apiKeyUtils';

const http = httpRouter();

/**
 * WorkOS auth callback — exchanges authorization code for access token.
 * Called by the frontend after WorkOS redirects back with a code.
 */
http.route({
  path: '/auth/callback',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const { code, redirectUri } = await request.json();
    const apiKey = process.env.WORKOS_API_KEY;
    const clientId = process.env.WORKOS_CLIENT_ID;

    if (!apiKey || !clientId) {
      return new Response(JSON.stringify({ error: 'WorkOS not configured' }), {
        status: 500,
        headers: corsHeaders(request),
      });
    }

    if (!code || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing code or redirect URI' }), {
        status: 400,
        headers: corsHeaders(request),
      });
    }

    try {
      // Exchange code for tokens using WorkOS API
      const res = await fetch('https://api.workos.com/user_management/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: apiKey,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return new Response(JSON.stringify({ error: body }), {
          status: res.status,
          headers: corsHeaders(request),
        });
      }

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: corsHeaders(request),
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders(request),
      });
    }
  }),
});

/**
 * CORS preflight handler
 */
http.route({
  path: '/auth/callback',
  method: 'OPTIONS',
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }),
});

http.route({
  path: '/api/import/csv',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const ownerId = await requireImportApiKey(ctx, request);

      const payload = await readCsvImportRequest(request);
      const parsed = await parseCsvText(payload.csvText);
      const datasetName = payload.datasetName || fileNameToBaseName(payload.fileName);
      const dashboardName = payload.dashboardName || datasetName;
      const appUrl = getPublicAppUrl();

      const datasetId = await ctx.runMutation(internal.datasets.createImported, {
        name: datasetName,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        rowCount: parsed.schema.rowCount,
        status: 'parsing',
        ownerId,
      });

      for (const [chunkIndex, rows] of chunkRows(parsed.data).entries()) {
        await ctx.runMutation(api.dataRows.insertChunk, {
          datasetId,
          chunkIndex,
          rows,
        });
      }

      await ctx.runMutation(api.datasets.updateSchema, {
        id: datasetId,
        schema: parsed.schema,
        rowCount: parsed.schema.rowCount,
      });

      const generated = await generateDashboardForImport({
        schema: parsed.schema,
        data: parsed.data,
        prompt: payload.prompt,
        referer: appUrl,
      });

      const dashboardId = await ctx.runMutation(internal.dashboards.createImported, {
        name: dashboardName,
        datasetId,
        insights: generated.insights || undefined,
        ownerId,
      });

      const widgetBatchSize = 5;
      const widgets = generated.charts.map((chart) => ({
        dashboardId,
        chartType: chart.chartType,
        title: chart.title,
        config: chart.config,
        chartData: chart.data,
        position: chart.position || { x: 0, y: 0 },
        size: chart.size || { w: 6, h: 2 },
      }));

      for (let index = 0; index < widgets.length; index += widgetBatchSize) {
        await ctx.runMutation(api.widgets.createBatch, {
          widgets: widgets.slice(index, index + widgetBatchSize),
        });
      }

      return jsonResponse(request, {
        datasetId,
        dashboardId,
        previewPath: `/preview/${dashboardId}`,
        previewUrl: `${appUrl}/preview/${dashboardId}`,
        rowCount: parsed.schema.rowCount,
        columnCount: parsed.schema.columns.length,
        parseErrors: parsed.errors,
        generationMode: generated.mode,
      }, 201);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Failed to import CSV';
      return jsonResponse(request, { error: message }, status);
    }
  }),
});

http.route({
  path: '/api/import/csv',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, {
        methods: 'POST, OPTIONS',
      }),
    });
  }),
});

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type ImportRequestPayload = {
  csvText: string;
  fileName: string;
  fileSize: number;
  datasetName?: string;
  dashboardName?: string;
  prompt?: string;
};

async function requireImportApiKey(ctx: Parameters<typeof httpAction>[0] extends never ? never : any, request: Request) {
  const receivedApiKey = request.headers.get('x-api-key');
  if (!receivedApiKey) {
    throw new HttpError(401, 'Missing API key');
  }

  const keyHash = await hashApiKey(receivedApiKey);
  const apiKeyRecord = await ctx.runQuery(internal.apiKeys.getActiveByHash, {
    keyHash,
    scope: 'csv_import',
  });

  if (apiKeyRecord) {
    await ctx.runMutation(internal.apiKeys.markUsed, { id: apiKeyRecord._id });
    return apiKeyRecord.ownerId;
  }

  const expectedApiKey = process.env.CSV_IMPORT_API_KEY;
  if (expectedApiKey && receivedApiKey === expectedApiKey) {
    return undefined;
  }

  if (!expectedApiKey) {
    throw new HttpError(401, 'Invalid API key');
  }

  throw new HttpError(401, 'Invalid API key');
}

async function readCsvImportRequest(request: Request): Promise<ImportRequestPayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string' || typeof file.text !== 'function') {
      throw new HttpError(400, 'Expected a CSV file in form field "file"');
    }

    const csvText = await file.text();
    return {
      csvText,
      fileName: file.name || 'upload.csv',
      fileSize: file.size || csvText.length,
      datasetName: readOptionalString(formData.get('datasetName')),
      dashboardName: readOptionalString(formData.get('dashboardName')),
      prompt: readOptionalString(formData.get('prompt')),
    };
  }

  if (contentType.includes('application/json')) {
    const body = await request.json();
    if (!body || typeof body.csv !== 'string' || !body.csv.trim()) {
      throw new HttpError(400, 'Expected JSON body with non-empty "csv" string');
    }

    return {
      csvText: body.csv,
      fileName: typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName : 'upload.csv',
      fileSize: body.csv.length,
      datasetName: typeof body.datasetName === 'string' ? body.datasetName : undefined,
      dashboardName: typeof body.dashboardName === 'string' ? body.dashboardName : undefined,
      prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
    };
  }

  const csvText = await request.text();
  if (!csvText.trim()) {
    throw new HttpError(400, 'Expected CSV content in request body');
  }

  return {
    csvText,
    fileName: request.headers.get('x-file-name') || 'upload.csv',
    fileSize: csvText.length,
    datasetName: request.headers.get('x-dataset-name') || undefined,
    dashboardName: request.headers.get('x-dashboard-name') || undefined,
    prompt: request.headers.get('x-dashboard-prompt') || undefined,
  };
}

function readOptionalString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getPublicAppUrl(): string {
  return process.env.APP_BASE_URL || 'https://neural-databi.vercel.app';
}

function jsonResponse(request: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(request),
  });
}

function corsHeaders(
  request: Request,
  options?: {
    methods?: string;
  },
): Record<string, string> {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': options?.methods || 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-File-Name, X-Dataset-Name, X-Dashboard-Name, X-Dashboard-Prompt',
  };
}

export default http;

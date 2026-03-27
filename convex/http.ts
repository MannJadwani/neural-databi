import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';

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

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default http;

# NeuralBi CSV Import API

Use this API to send a CSV file to NeuralBi and receive a shareable preview link for the generated dashboard.

## Base endpoint

- Import endpoint: `https://precious-peacock-605.eu-west-1.convex.site/api/import/csv`
- Preview app: `https://neural-databi.vercel.app`

## Authentication

Every request must include a user-generated API key in the `X-API-Key` header.

Generate a key from the app:

1. Sign in to `https://neural-databi.vercel.app`
2. Open `https://neural-databi.vercel.app/settings`
3. In `API Keys`, create a new key
4. Copy the key immediately and store it securely

Notes:

- Keys are scoped for `csv_import`
- Keys are shown only once at creation time
- Revoked keys stop working immediately
- Imported datasets and dashboards are attributed to the key owner

## What the API does

On a successful request, NeuralBi:

1. Parses the CSV
2. Infers the dataset schema
3. Stores the dataset and rows
4. Generates a dashboard using AI when available, or a fallback dashboard otherwise
5. Returns a preview URL you can open directly

## Request formats

The endpoint accepts any of these formats:

### 1. JSON

Send CSV content as a string.

Request body:

```json
{
  "csv": "month,revenue,cost\nJan,100,60\nFeb,150,80",
  "fileName": "sales.csv",
  "datasetName": "Sales Dataset",
  "dashboardName": "Sales Dashboard",
  "prompt": "Focus on revenue and cost trends"
}
```

Fields:

- `csv` required string: raw CSV content
- `fileName` optional string: original file name, defaults to `upload.csv`
- `datasetName` optional string: display name for the dataset
- `dashboardName` optional string: display name for the dashboard
- `prompt` optional string: extra instructions for dashboard generation

### 2. Multipart form data

Send a real CSV file upload.

Form fields:

- `file` required file: CSV file
- `datasetName` optional string
- `dashboardName` optional string
- `prompt` optional string

### 3. Raw CSV body

Send the body as plain CSV text and pass metadata through headers.

Optional headers:

- `X-File-Name`
- `X-Dataset-Name`
- `X-Dashboard-Name`
- `X-Dashboard-Prompt`

## Required header

```text
X-API-Key: nbi_...
```

## Success response

Status: `201 Created`

```json
{
  "datasetId": "jn70y0bejyf4hyz316asft6ffs83qccx",
  "dashboardId": "jh7ez17abebzkak3t4dzvqwrr183qrmw",
  "previewPath": "/preview/jh7ez17abebzkak3t4dzvqwrr183qrmw",
  "previewUrl": "https://neural-databi.vercel.app/preview/jh7ez17abebzkak3t4dzvqwrr183qrmw",
  "rowCount": 4,
  "columnCount": 3,
  "parseErrors": [],
  "generationMode": "ai"
}
```

Response fields:

- `datasetId`: stored dataset id
- `dashboardId`: generated dashboard id
- `previewPath`: app-relative preview route
- `previewUrl`: full preview link to open or store
- `rowCount`: parsed row count
- `columnCount`: inferred column count
- `parseErrors`: CSV parsing warnings, if any
- `generationMode`: `ai` or `fallback`

## Error responses

### Missing or invalid API key

Status: `401 Unauthorized`

```json
{
  "error": "Missing API key"
}
```

or

```json
{
  "error": "Invalid API key"
}
```

### Invalid payload

Status: `400 Bad Request`

Examples:

```json
{
  "error": "Expected JSON body with non-empty \"csv\" string"
}
```

```json
{
  "error": "Expected a CSV file in form field \"file\""
}
```

### Server failure

Status: `500 Internal Server Error`

```json
{
  "error": "Failed to import CSV"
}
```

## Curl examples

### JSON

```bash
curl -X POST "https://precious-peacock-605.eu-west-1.convex.site/api/import/csv" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: nbi_your_key_here" \
  --data-binary '{
    "csv": "month,revenue,cost\nJan,100,60\nFeb,150,80\nMar,175,90",
    "fileName": "sales.csv",
    "dashboardName": "Sales Dashboard",
    "prompt": "Focus on revenue and cost trends"
  }'
```

### Multipart file upload

```bash
curl -X POST "https://precious-peacock-605.eu-west-1.convex.site/api/import/csv" \
  -H "X-API-Key: nbi_your_key_here" \
  -F "file=@./sales.csv" \
  -F "dashboardName=Sales Dashboard" \
  -F "prompt=Focus on revenue and cost trends"
```

### Raw CSV body

```bash
curl -X POST "https://precious-peacock-605.eu-west-1.convex.site/api/import/csv" \
  -H "Content-Type: text/plain" \
  -H "X-API-Key: nbi_your_key_here" \
  -H "X-File-Name: sales.csv" \
  -H "X-Dashboard-Name: Sales Dashboard" \
  --data-binary $'month,revenue\nJan,100\nFeb,150\nMar,175'
```

## JavaScript example

```js
const response = await fetch(
  'https://precious-peacock-605.eu-west-1.convex.site/api/import/csv',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEURALBI_API_KEY,
    },
    body: JSON.stringify({
      csv: csvString,
      fileName: 'sales.csv',
      dashboardName: 'Sales Dashboard',
      prompt: 'Focus on revenue and cost trends',
    }),
  }
);

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Import failed');
}

const result = await response.json();
console.log(result.previewUrl);
```

## Python example

```python
import requests

response = requests.post(
    "https://precious-peacock-605.eu-west-1.convex.site/api/import/csv",
    headers={"X-API-Key": "nbi_your_key_here"},
    files={"file": open("sales.csv", "rb")},
    data={
        "dashboardName": "Sales Dashboard",
        "prompt": "Focus on revenue and cost trends",
    },
)

response.raise_for_status()
result = response.json()
print(result["previewUrl"])
```

## Integration tips

- Use `multipart/form-data` when you already have a CSV file on disk
- Use JSON when your application already has CSV content in memory
- Store `previewUrl` in your own system so users can revisit the generated dashboard
- Log `parseErrors` if you want visibility into malformed rows
- Treat API keys like secrets; do not expose them in browser code

## Current limitations

- The API is synchronous and returns only after the dashboard is created
- There is currently one import scope: `csv_import`
- The returned preview link is a public app route, not a signed one-time URL

## Support checklist

If an integration fails, check:

1. The request includes `X-API-Key`
2. The key is active in `Settings -> API Keys`
3. The CSV has a header row
4. The request body is not empty
5. Your system is reading `previewUrl` from the JSON response

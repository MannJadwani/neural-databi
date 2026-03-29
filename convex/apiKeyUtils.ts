const API_KEY_PREFIX = 'nbi_';

export function generateApiKeySecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `${API_KEY_PREFIX}${toHex(bytes)}`;
}

export async function hashApiKey(secret: string): Promise<string> {
  const encoded = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(new Uint8Array(digest));
}

export function getApiKeyPrefix(secret: string): string {
  return secret.slice(0, 12);
}

export function maskApiKey(prefix: string): string {
  return `${prefix}...`;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

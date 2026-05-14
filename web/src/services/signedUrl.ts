import api from './api';

/**
 * Check if a signed URL has expired by reading its `expires` query param.
 * Returns true if expired or unparseable.
 */
export function isUrlExpired(url: string): boolean {
  try {
    const params = new URL(url, window.location.origin).searchParams;
    const expires = parseInt(params.get('expires') || '0', 10);
    return Date.now() / 1000 > expires;
  } catch {
    return true;
  }
}

/**
 * Extract the filename from a signed upload URL.
 * e.g. "/api/uploads/files/abc-123.jpg?expires=...&sig=..." -> "abc-123.jpg"
 */
export function extractFilename(url: string): string | null {
  const match = url.match(/\/api\/uploads\/files\/([^?]+)/);
  return match ? match[1] : null;
}

/**
 * Get a fresh signed URL for a file.
 * Calls the authenticated /api/uploads/sign/:filename endpoint.
 */
export async function refreshSignedUrl(url: string): Promise<string> {
  const filename = extractFilename(url);
  if (!filename) return url;

  try {
    const { data } = await api.get(`/uploads/sign/${filename}`);
    return data.url;
  } catch {
    return url; // Return original if refresh fails
  }
}

/**
 * Get a valid URL — returns the original if not expired, refreshes if expired.
 */
export async function getValidUrl(url: string): Promise<string> {
  if (!url || !url.includes('/api/uploads/')) return url;
  if (!isUrlExpired(url)) return url;
  return refreshSignedUrl(url);
}

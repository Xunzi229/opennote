export function getHostnameFromUrl(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol.startsWith('chrome')) return null;
    return parsed.hostname;
  } catch {
    return null;
  }
}

export function getSiteFaviconUrl(hostname: string, size = 32): string {
  const pageUrl = `https://${hostname}/`;

  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
}

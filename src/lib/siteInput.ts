import { getHostnameFromUrl } from './tabSite';

export function normalizeSiteInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const directHostname = getHostnameFromUrl(trimmed);
  if (directHostname) return directHostname;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return null;

  const hostnameWithScheme = getHostnameFromUrl(`https://${trimmed}`);
  return hostnameWithScheme;
}

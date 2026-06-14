import type { MetaStore, PageNode, WorkspaceStore } from '../types';
import type { Locale } from '../i18n';
import { availableLocales } from '../i18n';

// Logical file keys used in the remote index and local sync state.
export const CONFIG_FILE_KEY = 'config';
export const SITE_FILE_PREFIX = 'sites/';

export interface SyncIndex {
  version: 1;
  updatedAt: number;
  files: Record<string, { hash: string; updatedAt: number; version: number }>;
}

export interface ConfigPayload {
  meta: MetaStore;
  locale: Locale | null;
}

export interface SiteFilePayload {
  hostname: string;
  pages: PageNode[];
}

// --- helpers ---

export function siteFileKey(hostname: string): string {
  return `${SITE_FILE_PREFIX}${hostname}`;
}

// Map a logical file key to a remote path under the configured directory.
export function remotePathForKey(directory: string, key: string): string {
  const dir = directory.replace(/^\/+|\/+$/g, '');
  if (key === CONFIG_FILE_KEY) return `${dir}/config.json`;
  if (key.startsWith(SITE_FILE_PREFIX)) {
    const hostname = key.slice(SITE_FILE_PREFIX.length);
    return `${dir}/sites/${encodeURIComponent(hostname)}.json`;
  }
  return `${dir}/${key}.json`;
}

export function indexRemotePath(directory: string): string {
  const dir = directory.replace(/^\/+|\/+$/g, '');
  return `${dir}/index.json`;
}

// Stable JSON: sort object keys recursively so the same logical content always
// hashes identically regardless of property insertion order.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(',')}}`;
}

export function serializeStable(value: unknown): string {
  return stableStringify(value);
}

// Lightweight FNV-1a hash (hex). Good enough to detect content changes.
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// --- build (push) ---

// Group all pages by their `site` field into one file per site.
export function buildSiteFiles(workspace: WorkspaceStore): Map<string, SiteFilePayload> {
  const bySite = new Map<string, PageNode[]>();
  for (const page of Object.values(workspace.pages)) {
    const list = bySite.get(page.site) ?? [];
    list.push(page);
    bySite.set(page.site, list);
  }

  const files = new Map<string, SiteFilePayload>();
  for (const [hostname, pages] of bySite) {
    // Sort by id for stable serialization/hashing.
    const sorted = [...pages].sort((a, b) => a.id.localeCompare(b.id));
    files.set(siteFileKey(hostname), { hostname, pages: sorted });
  }
  return files;
}

export function buildConfigPayload(meta: MetaStore, locale: Locale | null): ConfigPayload {
  return { meta, locale };
}

// --- parse / reconstruct (pull) ---

export function parseConfigPayload(json: string): ConfigPayload | null {
  try {
    const parsed = JSON.parse(json) as Partial<ConfigPayload>;
    if (!parsed || typeof parsed !== 'object' || !parsed.meta) return null;
    const locale =
      parsed.locale && availableLocales.includes(parsed.locale as Locale) ? (parsed.locale as Locale) : null;
    return { meta: parsed.meta as MetaStore, locale };
  } catch {
    return null;
  }
}

export function parseSiteFile(json: string): SiteFilePayload | null {
  try {
    const parsed = JSON.parse(json) as Partial<SiteFilePayload>;
    if (!parsed || typeof parsed.hostname !== 'string' || !Array.isArray(parsed.pages)) return null;
    return { hostname: parsed.hostname, pages: parsed.pages as PageNode[] };
  } catch {
    return null;
  }
}

// Rebuild a WorkspaceStore from a set of site file payloads.
export function mergeWorkspaceFromSiteFiles(siteFiles: SiteFilePayload[]): WorkspaceStore {
  const pages: Record<string, PageNode> = {};
  for (const file of siteFiles) {
    for (const page of file.pages) {
      pages[page.id] = page;
    }
  }
  const rootIds = Object.values(pages)
    .filter((page) => page.type === 'site')
    .sort((a, b) => a.sortIndex - b.sortIndex || a.site.localeCompare(b.site))
    .map((page) => page.id);

  return { pages, rootIds };
}

import { decryptText, encryptText } from './crypto';

export interface WebdavConfig {
  url: string;
  username: string;
  password: string; // plaintext in memory; encrypted on disk
  directory: string; // remote folder, default "opennote"
  enabled: boolean; // whether debounced auto-upload is active
}

export interface WebdavSyncState {
  // hash of each logical file at last successful sync, keyed by "config" / "sites/<host>"
  files: Record<string, string>;
  lastSyncedAt: number | null;
}

const CONFIG_KEY = 'webdav_config';
const SYNC_STATE_KEY = 'webdav_sync_state';
const DEFAULT_DIRECTORY = 'opennote';

export const DEFAULT_WEBDAV_CONFIG: WebdavConfig = {
  url: '',
  username: '',
  password: '',
  directory: DEFAULT_DIRECTORY,
  enabled: false,
};

function getLocalArea(): typeof chrome.storage.local | undefined {
  if (typeof chrome === 'undefined') return undefined;
  return chrome.storage?.local;
}

interface StoredWebdavConfig {
  url: string;
  username: string;
  password: string; // encrypted
  directory: string;
  enabled: boolean;
}

export async function loadWebdavConfig(): Promise<WebdavConfig> {
  const area = getLocalArea();
  const stored = area ? await area.get(CONFIG_KEY) : {};
  const value = stored[CONFIG_KEY] as StoredWebdavConfig | undefined;
  if (!value) return { ...DEFAULT_WEBDAV_CONFIG };

  return {
    url: value.url ?? '',
    username: value.username ?? '',
    password: await decryptText(value.password ?? ''),
    directory: value.directory || DEFAULT_DIRECTORY,
    enabled: Boolean(value.enabled),
  };
}

export async function saveWebdavConfig(config: WebdavConfig): Promise<void> {
  const area = getLocalArea();
  if (!area) return;
  const toStore: StoredWebdavConfig = {
    url: config.url.trim(),
    username: config.username.trim(),
    password: await encryptText(config.password),
    directory: (config.directory || DEFAULT_DIRECTORY).trim(),
    enabled: config.enabled,
  };
  await area.set({ [CONFIG_KEY]: toStore });
}

export function isWebdavConfigured(config: WebdavConfig): boolean {
  return Boolean(config.url.trim() && config.username.trim() && config.password);
}

export async function loadSyncState(): Promise<WebdavSyncState> {
  const area = getLocalArea();
  const stored = area ? await area.get(SYNC_STATE_KEY) : {};
  const value = stored[SYNC_STATE_KEY] as WebdavSyncState | undefined;
  return value ?? { files: {}, lastSyncedAt: null };
}

export async function saveSyncState(state: WebdavSyncState): Promise<void> {
  const area = getLocalArea();
  if (!area) return;
  await area.set({ [SYNC_STATE_KEY]: state });
}

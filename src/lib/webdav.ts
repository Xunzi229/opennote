// Minimal WebDAV client: Basic-auth fetch wrappers for the methods we need.
// Ported and trimmed from the opentab project.

export interface WebdavConnection {
  url: string;
  username: string;
  password: string;
}

function buildAuthorization(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function buildHeaders(conn: WebdavConnection): Record<string, string> {
  return { Authorization: buildAuthorization(conn.username, conn.password) };
}

export function joinWebdavUrl(baseUrl: string, filePath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = filePath.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
}

export function normalizeRemotePath(remotePath: string): string {
  return remotePath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

function buildWebdavError(action: string, response: Response): Error {
  return new Error(`${action}失败：${response.status} ${response.statusText}`);
}

function getParentDirectory(remotePath: string): string {
  const normalized = normalizeRemotePath(remotePath);
  if (!normalized.includes('/')) return '';
  return normalized.slice(0, normalized.lastIndexOf('/'));
}

function buildAncestorDirectories(remotePath: string): string[] {
  const parent = getParentDirectory(remotePath);
  if (!parent) return [];
  const segments = parent.split('/').filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
}

async function ensureRemoteDirectories(remotePath: string, conn: WebdavConnection): Promise<void> {
  const directories = buildAncestorDirectories(remotePath);
  if (directories.length === 0) return;

  const headers = buildHeaders(conn);

  for (const directory of directories) {
    const directoryUrl = joinWebdavUrl(conn.url, directory);
    const propfind = await fetch(directoryUrl, { method: 'PROPFIND', headers: { ...headers, Depth: '0' } });
    if (propfind.ok) continue;
    if (propfind.status !== 404) throw buildWebdavError('WebDAV 目录检查', propfind);

    const create = await fetch(directoryUrl, { method: 'MKCOL', headers });
    // 405 = already exists (some servers return this on re-create).
    if (create.ok || create.status === 405) continue;
    throw buildWebdavError('WebDAV 目录创建', create);
  }
}

export async function verifyConnection(conn: WebdavConnection, probePath = ''): Promise<void> {
  const url = joinWebdavUrl(conn.url, normalizeRemotePath(probePath));
  const response = await fetch(url, {
    method: 'PROPFIND',
    headers: { ...buildHeaders(conn), Depth: '0' },
  });
  if (!response.ok && response.status !== 404) {
    throw buildWebdavError('WebDAV 连接检查', response);
  }
}

export async function uploadFile(
  remotePath: string,
  content: string,
  conn: WebdavConnection,
  contentType = 'application/json',
): Promise<void> {
  const normalized = normalizeRemotePath(remotePath);
  const url = joinWebdavUrl(conn.url, normalized);

  await ensureRemoteDirectories(normalized, conn);

  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...buildHeaders(conn), 'Content-Type': contentType },
    body: content,
  });
  if (!response.ok) throw buildWebdavError('WebDAV 上传', response);
}

export async function downloadFile(remotePath: string, conn: WebdavConnection): Promise<string | null> {
  const url = joinWebdavUrl(conn.url, normalizeRemotePath(remotePath));
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(conn) });

  if (response.status === 404) return null;
  if (!response.ok) throw buildWebdavError('WebDAV 下载', response);
  return await response.text();
}

export async function deleteFile(remotePath: string, conn: WebdavConnection): Promise<void> {
  const url = joinWebdavUrl(conn.url, normalizeRemotePath(remotePath));
  const response = await fetch(url, { method: 'DELETE', headers: buildHeaders(conn) });
  if (!response.ok && response.status !== 404) {
    throw buildWebdavError('WebDAV 删除', response);
  }
}

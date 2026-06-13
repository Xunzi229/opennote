import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteFile, downloadFile, joinWebdavUrl, normalizeRemotePath, uploadFile, type WebdavConnection } from './webdav';

const conn: WebdavConnection = { url: 'https://dav.example.com/dav', username: 'user', password: 'pass' };

function mockResponse(status: number, body = ''): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    text: () => Promise.resolve(body),
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('url helpers', () => {
  it('joins base and path without double slashes', () => {
    expect(joinWebdavUrl('https://x.com/dav/', '/opennote/config.json')).toBe('https://x.com/dav/opennote/config.json');
    expect(joinWebdavUrl('https://x.com/dav', '')).toBe('https://x.com/dav');
  });

  it('normalizes remote paths', () => {
    expect(normalizeRemotePath('/opennote/config.json/')).toBe('opennote/config.json');
  });
});

describe('uploadFile', () => {
  it('PUTs content with a basic auth header after ensuring directories', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PROPFIND') return mockResponse(200);
      return mockResponse(201);
    });
    vi.stubGlobal('fetch', fetchMock);

    await uploadFile('opennote/config.json', '{"a":1}', conn);

    const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(putCall).toBeDefined();
    const [url, init] = putCall as [string, RequestInit];
    expect(url).toBe('https://dav.example.com/dav/opennote/config.json');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('user:pass')}`);
    expect(init.body).toBe('{"a":1}');
  });

  it('creates a missing directory via MKCOL', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PROPFIND') return mockResponse(404);
      if (init?.method === 'MKCOL') return mockResponse(201);
      return mockResponse(201);
    });
    vi.stubGlobal('fetch', fetchMock);

    await uploadFile('opennote/sites/x.json', 'data', conn);
    const methods = fetchMock.mock.calls.map(([, init]) => (init as RequestInit)?.method);
    expect(methods).toContain('MKCOL');
    expect(methods).toContain('PUT');
  });

  it('throws on a failed PUT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'PROPFIND' ? mockResponse(200) : mockResponse(500))),
    );
    await expect(uploadFile('opennote/config.json', 'x', conn)).rejects.toThrow();
  });
});

describe('downloadFile', () => {
  it('returns text on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse(200, '{"ok":true}')));
    await expect(downloadFile('opennote/index.json', conn)).resolves.toBe('{"ok":true}');
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse(404)));
    await expect(downloadFile('opennote/index.json', conn)).resolves.toBeNull();
  });

  it('throws on other errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse(401)));
    await expect(downloadFile('opennote/index.json', conn)).rejects.toThrow();
  });
});

describe('deleteFile', () => {
  it('tolerates a 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockResponse(404)));
    await expect(deleteFile('opennote/sites/x.json', conn)).resolves.toBeUndefined();
  });
});

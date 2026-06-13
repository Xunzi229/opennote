import { describe, expect, it } from 'vitest';
import {
  buildSiteFiles,
  hashString,
  indexRemotePath,
  mergeWorkspaceFromSiteFiles,
  parseConfigPayload,
  parseSiteFile,
  remotePathForKey,
  serializeStable,
  siteFileKey,
} from './syncPayload';
import type { PageNode, WorkspaceStore } from '../types';

function page(id: string, site: string, type: PageNode['type'] = 'page', overrides: Partial<PageNode> = {}): PageNode {
  return {
    id,
    type,
    site,
    parentId: type === 'site' ? null : `site:${site}`,
    title: id,
    content: '',
    sortIndex: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function workspace(pages: PageNode[]): WorkspaceStore {
  const map: Record<string, PageNode> = {};
  for (const p of pages) map[p.id] = p;
  return {
    pages: map,
    rootIds: pages.filter((p) => p.type === 'site').map((p) => p.id),
  };
}

describe('syncPayload paths', () => {
  it('maps logical keys to remote paths and encodes hostnames', () => {
    expect(remotePathForKey('opennote', 'config')).toBe('opennote/config.json');
    expect(remotePathForKey('opennote', siteFileKey('example.com'))).toBe('opennote/sites/example.com.json');
    expect(remotePathForKey('/opennote/', siteFileKey('a b.com'))).toBe('opennote/sites/a%20b.com.json');
    expect(indexRemotePath('opennote')).toBe('opennote/index.json');
  });
});

describe('stable serialization + hash', () => {
  it('serializes object keys in a stable order', () => {
    expect(serializeStable({ b: 1, a: 2 })).toBe(serializeStable({ a: 2, b: 1 }));
  });

  it('produces the same hash for equal content and different for changed content', () => {
    const a = serializeStable({ x: 1, y: [1, 2, 3] });
    const b = serializeStable({ y: [1, 2, 3], x: 1 });
    expect(hashString(a)).toBe(hashString(b));
    expect(hashString(a)).not.toBe(hashString(serializeStable({ x: 2, y: [1, 2, 3] })));
  });
});

describe('buildSiteFiles', () => {
  it('groups pages by site into one file each', () => {
    const ws = workspace([
      page('site:example.com', 'example.com', 'site'),
      page('p1', 'example.com'),
      page('p2', 'example.com'),
      page('site:github.com', 'github.com', 'site'),
      page('p3', 'github.com'),
    ]);

    const files = buildSiteFiles(ws);
    expect(files.size).toBe(2);
    expect(files.get(siteFileKey('example.com'))?.pages).toHaveLength(3);
    expect(files.get(siteFileKey('github.com'))?.pages).toHaveLength(2);
  });

  it('serializes a site file stably regardless of page insertion order', () => {
    const a = buildSiteFiles(workspace([page('site:x.com', 'x.com', 'site'), page('p1', 'x.com'), page('p2', 'x.com')]));
    const b = buildSiteFiles(workspace([page('p2', 'x.com'), page('site:x.com', 'x.com', 'site'), page('p1', 'x.com')]));
    expect(serializeStable(a.get(siteFileKey('x.com')))).toBe(serializeStable(b.get(siteFileKey('x.com'))));
  });
});

describe('parse + reconstruct (pull)', () => {
  it('round-trips a site file', () => {
    const original = { hostname: 'example.com', pages: [page('site:example.com', 'example.com', 'site'), page('p1', 'example.com')] };
    const parsed = parseSiteFile(JSON.stringify(original));
    expect(parsed?.hostname).toBe('example.com');
    expect(parsed?.pages).toHaveLength(2);
  });

  it('rejects malformed site files', () => {
    expect(parseSiteFile('not json')).toBeNull();
    expect(parseSiteFile('{"hostname":"x"}')).toBeNull();
  });

  it('reconstructs a workspace from site files with correct rootIds', () => {
    const ws = mergeWorkspaceFromSiteFiles([
      { hostname: 'b.com', pages: [page('site:b.com', 'b.com', 'site', { sortIndex: 1 }), page('p2', 'b.com')] },
      { hostname: 'a.com', pages: [page('site:a.com', 'a.com', 'site', { sortIndex: 0 }), page('p1', 'a.com')] },
    ]);

    expect(Object.keys(ws.pages).sort()).toEqual(['p1', 'p2', 'site:a.com', 'site:b.com']);
    // rootIds sorted by sortIndex.
    expect(ws.rootIds).toEqual(['site:a.com', 'site:b.com']);
  });

  it('parses config payload and validates locale', () => {
    const meta = { lastActiveSite: null, version: 2 };
    expect(parseConfigPayload(JSON.stringify({ meta, locale: 'en-US' }))?.locale).toBe('en-US');
    expect(parseConfigPayload(JSON.stringify({ meta, locale: 'xx' }))?.locale).toBeNull();
    expect(parseConfigPayload('{"locale":"en-US"}')).toBeNull();
  });
});

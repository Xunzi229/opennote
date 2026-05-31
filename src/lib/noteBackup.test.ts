import { describe, expect, it } from 'vitest';
import {
  parseWorkspaceBackup,
  serializeWorkspaceBackup,
  serializeWorkspaceMarkdown,
} from './noteBackup';
import type { WorkspaceStore } from '../types';

const workspace: WorkspaceStore = {
  rootIds: ['site:example.com'],
  pages: {
    'site:example.com': {
      id: 'site:example.com',
      type: 'site',
      site: 'example.com',
      parentId: null,
      title: 'example.com',
      content: '',
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 2,
    },
    'page-1': {
      id: 'page-1',
      type: 'page',
      site: 'example.com',
      parentId: 'site:example.com',
      title: 'Example Note',
      content: 'hello markdown',
      sortIndex: 0,
      createdAt: Date.UTC(2026, 4, 31),
      updatedAt: Date.UTC(2026, 4, 31, 1),
      tags: ['docs', 'web'],
      source: {
        pageUrl: 'https://example.com/article',
        pageTitle: 'Example Article',
        capturedAt: Date.UTC(2026, 4, 31, 2),
        hostname: 'example.com',
      },
    },
  },
};

describe('workspace backup helpers', () => {
  it('serializes workspace with a stable backup format', () => {
    const json = serializeWorkspaceBackup(workspace, 123);
    const backup = JSON.parse(json);

    expect(backup).toEqual({
      format: 'opennote.workspace.v1',
      exportedAt: 123,
      workspace,
    });
  });

  it('parses a valid workspace backup', () => {
    const parsed = parseWorkspaceBackup(JSON.stringify({
      format: 'opennote.workspace.v1',
      exportedAt: 123,
      workspace,
    }));

    expect(parsed).toEqual(workspace);
  });

  it('rejects invalid backup content', () => {
    expect(() => parseWorkspaceBackup('not json')).toThrow('备份文件不是有效 JSON');
    expect(() => parseWorkspaceBackup(JSON.stringify({ format: 'other', workspace }))).toThrow(
      '备份格式不受支持',
    );
    expect(() => parseWorkspaceBackup(JSON.stringify({ format: 'opennote.workspace.v1', workspace: [] }))).toThrow(
      '备份文件缺少有效工作区数据',
    );
  });

  it('serializes workspace to a readable markdown document', () => {
    const markdown = serializeWorkspaceMarkdown(workspace, Date.UTC(2026, 4, 31, 3));

    expect(markdown).toContain('# OpenNote Export');
    expect(markdown).toContain('Exported at: 2026-05-31');
    expect(markdown).toContain('## example.com');
    expect(markdown).toContain('### Example Note');
    expect(markdown).toContain('- Tags: docs, web');
    expect(markdown).toContain('- Source: [Example Article](https://example.com/article)');
    expect(markdown).toContain('hello markdown');
  });
});

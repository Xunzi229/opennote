import { describe, expect, it, vi } from 'vitest';
import { saveSelectionAsPage } from './contextMenuSave';

vi.mock('./storage', () => ({
  getWorkspace: vi.fn(async () => ({
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
        updatedAt: 1,
      },
      'page-1': {
        id: 'page-1',
        type: 'page',
        site: 'example.com',
        parentId: 'site:example.com',
        title: 'Old',
        content: '已有内容',
        sortIndex: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  })),
  updatePageContent: vi.fn(async () => {}),
  addPage: vi.fn(async (_hostname, _parentId, content, title, source) => ({
    id: 'page-2',
    type: 'page',
    site: 'example.com',
    parentId: 'site:example.com',
    title,
    content,
    source,
    sortIndex: 0,
    createdAt: 2,
    updatedAt: 2,
  })),
}));

describe('saveSelectionAsPage', () => {
  it('appends markdown to an existing page', async () => {
    const { updatePageContent } = await import('./storage');

    const pageId = await saveSelectionAsPage(
      'example.com',
      { action: 'append', pageId: 'page-1' },
      { markdown: '新增内容' },
    );

    expect(pageId).toBe('page-1');
    expect(updatePageContent).toHaveBeenCalledWith('page-1', '已有内容\n\n新增内容');
  });

  it('creates a new page when append target is missing', async () => {
    const { addPage } = await import('./storage');

    const pageId = await saveSelectionAsPage(
      'example.com',
      { action: 'append', pageId: 'missing' },
      { markdown: '新页面内容' },
    );

    expect(pageId).toBe('page-2');
    expect(addPage).toHaveBeenCalled();
  });

  it('passes source context when creating a page from a selection', async () => {
    const { addPage } = await import('./storage');
    const source = {
      pageUrl: 'https://example.com/article',
      pageTitle: 'Example Article',
      capturedAt: 123,
      hostname: 'example.com',
    };

    await saveSelectionAsPage(
      'example.com',
      { action: 'create' },
      { markdown: 'selected content' },
      source,
    );

    expect(addPage).toHaveBeenLastCalledWith(
      'example.com',
      null,
      'selected content',
      expect.any(String),
      source,
    );
  });

  it('prefers formatted markdown over plain selection text', async () => {
    const { addPage } = await import('./storage');

    await saveSelectionAsPage(
      'example.com',
      { action: 'create' },
      {
        text: 'Title Bold',
        markdown: '## Title\n\n**Bold**',
      },
    );

    expect(addPage).toHaveBeenLastCalledWith(
      'example.com',
      null,
      '## Title\n\n**Bold**',
      expect.any(String),
      undefined,
    );
  });
});

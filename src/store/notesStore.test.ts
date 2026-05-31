import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotesStore } from './notesStore';
import { addPage, createEmptyWorkspace, getWorkspace, setWorkspace, siteRootId } from '../lib/storage';
import type { WorkspaceStore } from '../types';

const mockStorage: Record<string, unknown> = {};

beforeEach(() => {
  mockStorage.workspace = undefined;
  vi.clearAllMocks();
  useNotesStore.setState({
    workspace: createEmptyWorkspace(),
    currentSite: null,
    selectedPageId: null,
    selectedNoteId: null,
    searchQuery: '',
    pageFilter: 'all',
    noteFilter: 'all',
    pageSortMode: 'updated',
    noteSortMode: 'updated',
    isLoading: false,
    error: null,
  });
});

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `page-${Math.random().toString(16).slice(2)}`),
});

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | object, callback?: (result: Record<string, unknown>) => void) => {
        let result: Record<string, unknown> = {};
        if (typeof keys === 'string') {
          result = { [keys]: mockStorage[keys] };
        } else if (Array.isArray(keys)) {
          keys.forEach((key) => {
            result[key] = mockStorage[key];
          });
        } else {
          result = mockStorage;
        }
        callback?.(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        callback?.();
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    lastError: null,
  },
});

describe('workspace store', () => {
  it('sets current site without clearing the selected page', () => {
    useNotesStore.setState({ selectedPageId: 'page-1', selectedNoteId: 'page-1' });

    useNotesStore.getState().setCurrentSite('example.com');

    expect(useNotesStore.getState().currentSite).toBe('example.com');
    expect(useNotesStore.getState().selectedPageId).toBe('page-1');
  });

  it('ensures a fixed site root', async () => {
    const root = await useNotesStore.getState().ensureSiteRoot('example.com');
    const state = useNotesStore.getState();

    expect(root.id).toBe(siteRootId('example.com'));
    expect(state.workspace.rootIds).toEqual([siteRootId('example.com')]);
    expect(state.currentSite).toBe('example.com');
  });

  it('adds a child page under the selected parent', async () => {
    const root = await useNotesStore.getState().ensureSiteRoot('example.com');
    const page = await useNotesStore.getState().addPage('example.com', root.id, 'hello', 'Child');

    expect(page.parentId).toBe(root.id);
    expect(useNotesStore.getState().selectedPageId).toBe(page.id);
  });

  it('builds visible tree rows with nested pages', () => {
    const workspace: WorkspaceStore = {
      rootIds: ['site:example.com'],
      pages: {
        'site:example.com': page('site:example.com', 'site', 'example.com', null, 'example.com', 0),
        parent: page('parent', 'page', 'example.com', 'site:example.com', 'Parent', 0),
        child: page('child', 'page', 'example.com', 'parent', 'Child', 0),
      },
    };
    useNotesStore.setState({ workspace });

    expect(useNotesStore.getState().visibleTreeRows().map((row) => [row.page.id, row.depth])).toEqual([
      ['site:example.com', 0],
      ['parent', 1],
      ['child', 2],
    ]);
  });

  it('keeps ancestors visible when searching nested pages', () => {
    const workspace: WorkspaceStore = {
      rootIds: ['site:example.com'],
      pages: {
        'site:example.com': page('site:example.com', 'site', 'example.com', null, 'example.com', 0),
        parent: page('parent', 'page', 'example.com', 'site:example.com', 'Parent', 0),
        child: page('child', 'page', 'example.com', 'parent', 'Needle', 0),
      },
    };
    useNotesStore.setState({ workspace, searchQuery: 'needle' });

    expect(useNotesStore.getState().visibleTreeRows().map((row) => row.page.id)).toEqual([
      'site:example.com',
      'parent',
      'child',
    ]);
  });

  it('sorts pinned sibling pages before normal pages', () => {
    const pinned = {
      ...page('pinned', 'page', 'example.com', 'site:example.com', 'Pinned', 1),
      pinned: true,
    };
    const workspace: WorkspaceStore = {
      rootIds: ['site:example.com'],
      pages: {
        'site:example.com': page('site:example.com', 'site', 'example.com', null, 'example.com', 0),
        normal: page('normal', 'page', 'example.com', 'site:example.com', 'Normal', 0),
        pinned,
      },
    };
    useNotesStore.setState({ workspace, pageSortMode: 'updated' });

    expect(useNotesStore.getState().getChildren('site:example.com').map((item) => item.id)).toEqual([
      'pinned',
      'normal',
    ]);
  });

  it('renames normal pages but keeps site root titles fixed', async () => {
    const root = await useNotesStore.getState().ensureSiteRoot('example.com');
    const child = await useNotesStore.getState().addPage('example.com', root.id, '', 'Old');

    await useNotesStore.getState().updatePageTitle(child.id, 'New');
    await useNotesStore.getState().updatePageTitle(root.id, 'Should not change');

    const workspace = await getWorkspace();
    expect(workspace.pages[child.id].title).toBe('New');
    expect(workspace.pages[root.id].title).toBe('example.com');
  });

  it('moves pages across site roots', async () => {
    const sourceRoot = await useNotesStore.getState().ensureSiteRoot('example.com');
    const targetRoot = await useNotesStore.getState().ensureSiteRoot('other.com');
    const child = await useNotesStore.getState().addPage('example.com', sourceRoot.id, '', 'Move me');

    await useNotesStore.getState().movePage(child.id, targetRoot.id);

    const moved = useNotesStore.getState().getPage(child.id);
    expect(moved?.parentId).toBe(targetRoot.id);
    expect(moved?.site).toBe('other.com');
    expect(useNotesStore.getState().currentSite).toBe('other.com');
  });

  it('removes tags and ignores duplicate tags case-insensitively', async () => {
    const root = await useNotesStore.getState().ensureSiteRoot('example.com');
    const child = await useNotesStore.getState().addPage('example.com', root.id, '', 'Tagged');

    await useNotesStore.getState().addPageTag(child.id, ' docs ');
    await useNotesStore.getState().addPageTag(child.id, 'Docs');
    await useNotesStore.getState().removePageTag(child.id, 'docs');

    const workspace = await getWorkspace();
    expect(workspace.pages[child.id].tags).toEqual([]);
  });

  it('loads workspace from storage', async () => {
    await addPage('example.com', null, 'hello', 'Stored');
    await useNotesStore.getState().loadWorkspace();

    expect(useNotesStore.getState().siteRoots().map((root) => root.site)).toEqual(['example.com']);
  });

  it('can filter site pages by favorite', async () => {
    const root = await useNotesStore.getState().ensureSiteRoot('example.com');
    const first = await useNotesStore.getState().addPage('example.com', root.id, '', 'One');
    await useNotesStore.getState().addPage('example.com', root.id, '', 'Two');
    await setWorkspace({
      ...useNotesStore.getState().workspace,
      pages: {
        ...useNotesStore.getState().workspace.pages,
        [first.id]: { ...useNotesStore.getState().workspace.pages[first.id], favorite: true },
      },
    });
    useNotesStore.setState({ workspace: await getWorkspace(), pageFilter: 'favorite' });

    expect(useNotesStore.getState().filteredNotes('example.com').map((item) => item.id)).toEqual([first.id]);
  });
});

function page(
  id: string,
  type: 'site' | 'page',
  site: string,
  parentId: string | null,
  title: string,
  sortIndex: number,
) {
  return {
    id,
    type,
    site,
    parentId,
    title,
    content: '',
    sortIndex,
    createdAt: 1,
    updatedAt: 1,
  };
}

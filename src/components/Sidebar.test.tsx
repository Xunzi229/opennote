import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { useNotesStore } from '../store/notesStore';
import { createEmptyWorkspace } from '../lib/storage';
import { setLocale } from '../i18n';

vi.mock('../hooks/useActiveSite', () => ({
  useActiveSite: () => 'login.microsoftonline.com',
}));

let chromeLocalStorage: Record<string, unknown>;

describe('Sidebar current site entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLocale('zh-CN');
    chromeLocalStorage = {};
    const workspace = createEmptyWorkspace();
    workspace.pages['site:linux.do'] = {
      id: 'site:linux.do',
      type: 'site',
      site: 'linux.do',
      parentId: null,
      title: 'linux.do',
      content: '',
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    workspace.rootIds.push('site:linux.do');

    useNotesStore.setState({
      workspace,
      currentSite: 'login.microsoftonline.com',
      selectedPageId: 'site:linux.do',
      selectedNoteId: 'site:linux.do',
      searchQuery: '',
      pageFilter: 'all',
      pageSortMode: 'updated',
    });

    vi.stubGlobal('chrome', {
      runtime: {
        lastError: null,
      },
      storage: {
        local: {
          get: vi.fn((keys: string | string[] | object, callback?: (result: Record<string, unknown>) => void) => {
            let result: Record<string, unknown> = {};
            if (typeof keys === 'string') {
              result = { [keys]: chromeLocalStorage[keys] };
            } else if (Array.isArray(keys)) {
              keys.forEach((key) => {
                result[key] = chromeLocalStorage[key];
              });
            } else {
              result = chromeLocalStorage;
            }
            callback?.(result);
            return Promise.resolve(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
            Object.assign(chromeLocalStorage, data);
            callback?.();
            return Promise.resolve();
          }),
          getBytesInUse: vi.fn((_key, callback: (bytes: number) => void) => callback(1024)),
          QUOTA_BYTES: 10485760,
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  it('shows a direct create button when current site has no root yet', async () => {
    render(<Sidebar />);

    expect(await screen.findByRole('button', { name: '在当前站点新建页面' })).toBeInTheDocument();
  });

  it('creates the current site root and first page from the direct button', async () => {
    const ensureSiteRoot = vi.fn(async (site: string) => ({
      id: `site:${site}`,
      type: 'site' as const,
      site,
      parentId: null,
      title: site,
      content: '',
      sortIndex: 1,
      createdAt: 1,
      updatedAt: 1,
    }));
    const addPage = vi.fn(async () => ({
      id: 'page-1',
      type: 'page' as const,
      site: 'login.microsoftonline.com',
      parentId: 'site:login.microsoftonline.com',
      title: 'New page',
      content: '',
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
    }));
    useNotesStore.setState({ ensureSiteRoot, addPage });

    render(<Sidebar />);
    fireEvent.click(await screen.findByRole('button', { name: '在当前站点新建页面' }));

    expect(ensureSiteRoot).toHaveBeenCalledWith('login.microsoftonline.com');
    await waitFor(() => {
      expect(addPage).toHaveBeenCalledWith('login.microsoftonline.com', 'site:login.microsoftonline.com');
    });
  });

  it('opens a styled add-site dialog instead of the browser prompt', async () => {
    const browserPrompt = vi.spyOn(window, 'prompt').mockReturnValue('example.com');

    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: '添加站点' }));

    expect(browserPrompt).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: '添加站点' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example.com 或 https://example.com')).toBeInTheDocument();
  });

  it('creates and selects a site from the styled add-site dialog', async () => {
    const ensureSiteRoot = vi.fn(async (site: string) => ({
      id: `site:${site}`,
      type: 'site' as const,
      site,
      parentId: null,
      title: site,
      content: '',
      sortIndex: 1,
      createdAt: 1,
      updatedAt: 1,
    }));
    const selectPage = vi.fn();
    useNotesStore.setState({ ensureSiteRoot, selectPage });

    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: '添加站点' }));
    fireEvent.change(screen.getByPlaceholderText('example.com 或 https://example.com'), {
      target: { value: 'https://docs.example.com/path' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(ensureSiteRoot).toHaveBeenCalledWith('docs.example.com');
    });
    expect(selectPage).toHaveBeenCalledWith('site:docs.example.com');
  });

  it('creates a child page from a tree node add button', async () => {
    const addPage = vi.fn(async () => ({
      id: 'page-child',
      type: 'page' as const,
      site: 'linux.do',
      parentId: 'site:linux.do',
      title: 'Child',
      content: '',
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
    }));
    useNotesStore.setState({ addPage });

    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: '在 linux.do 下新建页面' }));

    expect(addPage).toHaveBeenCalledWith('linux.do', 'site:linux.do');
  });

  it('does not show an ambiguous global new page button', () => {
    render(<Sidebar />);

    expect(screen.queryByRole('button', { name: '新建页面' })).not.toBeInTheDocument();
  });

  it('uses a styled filter menu instead of the native select', () => {
    render(<Sidebar />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    fireEvent.click(screen.getByRole('option', { name: '置顶' }));

    expect(useNotesStore.getState().pageFilter).toBe('pinned');
  });

  it('renders only the visible page tree rows before scrolling', () => {
    const workspace = createEmptyWorkspace();
    workspace.pages['site:example.com'] = {
      id: 'site:example.com',
      type: 'site',
      site: 'example.com',
      parentId: null,
      title: 'example.com',
      content: '',
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    workspace.rootIds.push('site:example.com');

    for (let index = 0; index < 200; index += 1) {
      workspace.pages[`page-${index}`] = {
        id: `page-${index}`,
        type: 'page',
        site: 'example.com',
        parentId: 'site:example.com',
        title: `Page ${index}`,
        content: '',
        sortIndex: index,
        createdAt: 1,
        updatedAt: 1,
      };
    }

    useNotesStore.setState({
      workspace,
      currentSite: 'example.com',
      selectedPageId: 'site:example.com',
      selectedNoteId: 'site:example.com',
    });

    render(<Sidebar />);

    expect(screen.getByText('Page 0')).toBeInTheDocument();
    expect(screen.queryByText('Page 199')).not.toBeInTheDocument();
  });

  it('renders later page tree rows after scrolling', () => {
    const workspace = createEmptyWorkspace();
    workspace.pages['site:example.com'] = {
      id: 'site:example.com',
      type: 'site',
      site: 'example.com',
      parentId: null,
      title: 'example.com',
      content: '',
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    workspace.rootIds.push('site:example.com');

    for (let index = 0; index < 200; index += 1) {
      workspace.pages[`page-${index}`] = {
        id: `page-${index}`,
        type: 'page',
        site: 'example.com',
        parentId: 'site:example.com',
        title: `Page ${index}`,
        content: '',
        sortIndex: index,
        createdAt: 1,
        updatedAt: 1,
      };
    }

    useNotesStore.setState({
      workspace,
      currentSite: 'example.com',
      selectedPageId: 'site:example.com',
      selectedNoteId: 'site:example.com',
    });

    render(<Sidebar />);
    fireEvent.scroll(screen.getByTestId('workspace-tree'), {
      target: { scrollTop: 200 * 34 },
    });

    expect(screen.getByText('Page 199')).toBeInTheDocument();
  });

  it('shows the last updated time for page files in the tree', () => {
    const workspace = createEmptyWorkspace();
    const siteUpdatedAt = new Date(2026, 1, 3, 4, 5).getTime();
    const pageUpdatedAt = new Date(2026, 0, 2, 3, 4).getTime();
    workspace.pages['site:example.com'] = {
      id: 'site:example.com',
      type: 'site',
      site: 'example.com',
      parentId: null,
      title: 'example.com',
      content: '',
      sortIndex: 0,
      createdAt: siteUpdatedAt,
      updatedAt: siteUpdatedAt,
    };
    workspace.pages['page-updated'] = {
      id: 'page-updated',
      type: 'page',
      site: 'example.com',
      parentId: 'site:example.com',
      title: 'Updated file',
      content: '',
      sortIndex: 0,
      createdAt: pageUpdatedAt,
      updatedAt: pageUpdatedAt,
    };
    workspace.rootIds.push('site:example.com');

    useNotesStore.setState({
      workspace,
      currentSite: 'example.com',
      selectedPageId: 'site:example.com',
      selectedNoteId: 'site:example.com',
    });

    render(<Sidebar />);

    expect(screen.getByTestId('tree-page-updated-at-page-updated')).toHaveTextContent('1/2 03:04');
    expect(screen.queryByTestId('tree-page-updated-at-site:example.com')).not.toBeInTheDocument();
  });

  it('exposes the redesigned workspace hierarchy sections', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('sidebar-search-command')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-current-site')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-favorites-section')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-pinned-section')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-all-sites-section')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-utility-footer')).toBeInTheDocument();
  });

  it('does not render a shortcut hint inside the search input', () => {
    render(<Sidebar />);

    expect(screen.getByTestId('sidebar-search-command').querySelector('kbd')).toBeNull();
  });

  it('collapses the favorites quick section from its header', () => {
    addQuickSectionPages();

    render(<Sidebar />);

    const section = screen.getByTestId('sidebar-favorites-section');
    expect(within(section).getByText('Favorite Reference')).toBeInTheDocument();

    const toggle = screen.getByTestId('sidebar-favorites-toggle');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(section).queryByText('Favorite Reference')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-favorites-section')).toBeInTheDocument();
  });

  it('collapses the pinned quick section from its header', () => {
    addQuickSectionPages();

    render(<Sidebar />);

    const section = screen.getByTestId('sidebar-pinned-section');
    expect(within(section).getByText('Pinned Runbook')).toBeInTheDocument();

    const toggle = screen.getByTestId('sidebar-pinned-toggle');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(section).queryByText('Pinned Runbook')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-pinned-section')).toBeInTheDocument();
  });

  it('hides favorites and pinned quick sections from the sidebar settings menu', async () => {
    addQuickSectionPages();

    render(<Sidebar />);

    fireEvent.click(screen.getByTestId('quick-sections-settings-button'));
    fireEvent.click(screen.getByTestId('toggle-favorites-section-visibility'));
    fireEvent.click(screen.getByTestId('toggle-pinned-section-visibility'));

    expect(screen.queryByTestId('sidebar-favorites-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-pinned-section')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(chromeLocalStorage.meta).toMatchObject({
        showFavoritesSection: false,
        showPinnedSection: false,
      });
    });
  });

  it('renders quick section settings as separated switch rows', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByTestId('quick-sections-settings-button'));

    expect(screen.getByText('快捷区块')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '显示收藏' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: '显示固定' })).toHaveAttribute('aria-checked', 'true');
  });

  it('respects persisted hidden quick section preferences', async () => {
    chromeLocalStorage.meta = {
      lastActiveSite: null,
      version: 2,
      showFavoritesSection: false,
      showPinnedSection: false,
    };
    addQuickSectionPages();

    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.queryByTestId('sidebar-favorites-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar-pinned-section')).not.toBeInTheDocument();
    });
  });

  it('renders redesigned workspace labels in the active locale', () => {
    render(<Sidebar />);

    expect(screen.getByText('当前站点')).toBeInTheDocument();
    expect(screen.getByText('收藏')).toBeInTheDocument();
    expect(screen.getByText('固定')).toBeInTheDocument();
    expect(screen.getByText('全部站点')).toBeInTheDocument();
    expect(screen.queryByText('Current site')).not.toBeInTheDocument();
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
    expect(screen.queryByText('All sites')).not.toBeInTheDocument();
  });
});

function addQuickSectionPages() {
  const workspace = useNotesStore.getState().workspace;
  workspace.pages['favorite-page'] = {
    id: 'favorite-page',
    type: 'page',
    site: 'linux.do',
    parentId: 'site:linux.do',
    title: 'Favorite Reference',
    content: '',
    sortIndex: 1,
    createdAt: 2,
    updatedAt: 4,
    favorite: true,
  };
  workspace.pages['pinned-page'] = {
    id: 'pinned-page',
    type: 'page',
    site: 'linux.do',
    parentId: 'site:linux.do',
    title: 'Pinned Runbook',
    content: '',
    sortIndex: 2,
    createdAt: 3,
    updatedAt: 5,
    pinned: true,
  };
  useNotesStore.setState({ workspace });
}

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { useNotesStore } from '../store/notesStore';
import { createEmptyWorkspace } from '../lib/storage';

vi.mock('../hooks/useActiveSite', () => ({
  useActiveSite: () => 'login.microsoftonline.com',
}));

describe('Sidebar current site entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditorPanel from './EditorPanel';
import { useNotesStore } from '../store/notesStore';
import type { WorkspaceStore } from '../types';

const markdownEditorMock = vi.hoisted(() => ({ mountCount: 0 }));

vi.mock('../hooks/useActiveSite', () => ({
  useActiveSite: () => 'example.com',
}));

vi.mock('./MarkdownEditor', () => ({
  default: function MockMarkdownEditor() {
    useEffect(() => {
      markdownEditorMock.mountCount += 1;
    }, []);
    return <div data-testid="markdown-editor" />;
  },
}));

describe('EditorPanel editor lifecycle', () => {
  beforeEach(() => {
    markdownEditorMock.mountCount = 0;
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
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
          updatedAt: 1,
        },
        'page-1': {
          id: 'page-1',
          type: 'page',
          site: 'example.com',
          parentId: 'site:example.com',
          title: 'Page',
          content: 'hello',
          sortIndex: 0,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    };

    useNotesStore.setState({
      workspace,
      currentSite: 'example.com',
      selectedPageId: 'page-1',
      selectedNoteId: 'page-1',
    });
  });

  it('does not remount the markdown editor when only updatedAt changes', () => {
    render(<EditorPanel />);
    expect(markdownEditorMock.mountCount).toBe(1);

    act(() => {
      useNotesStore.setState((state) => ({
        workspace: {
          ...state.workspace,
          pages: {
            ...state.workspace.pages,
            'page-1': {
              ...state.workspace.pages['page-1'],
              updatedAt: 2,
            },
          },
        },
      }));
    });

    expect(markdownEditorMock.mountCount).toBe(1);
  });

  it('opens a more menu with useful page actions', () => {
    render(<EditorPanel />);

    fireEvent.click(screen.getByRole('button', { name: '更多操作' }));

    expect(screen.getByRole('menuitem', { name: '新建子页面' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '复制 Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '复制页面' })).toBeInTheDocument();
  });

  it('duplicates the selected page from the more menu', async () => {
    const addPage = vi.fn(async () => ({
      id: 'copy-1',
      type: 'page' as const,
      site: 'example.com',
      parentId: 'site:example.com',
      title: 'Page 副本',
      content: 'hello',
      sortIndex: 1,
      createdAt: 2,
      updatedAt: 2,
    }));
    useNotesStore.setState({ addPage });

    render(<EditorPanel />);
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '复制页面' }));

    await waitFor(() => {
      expect(addPage).toHaveBeenCalledWith('example.com', 'site:example.com', 'hello', 'Page 副本');
    });
  });

  it('copies the selected page markdown from the more menu', async () => {
    render(<EditorPanel />);

    fireEvent.click(screen.getByRole('button', { name: '更多操作' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '复制 Markdown' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
    });
  });
});

import { act, render } from '@testing-library/react';
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
});

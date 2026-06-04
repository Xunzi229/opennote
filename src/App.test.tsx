import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/Sidebar', () => ({
  default: () => <aside data-testid="workspace-panel">Workspace panel</aside>,
}));

vi.mock('./components/EditorPanel', () => ({
  default: () => <main data-testid="editor-panel">Editor panel</main>,
}));

vi.mock('./hooks/useSyncSiteWithActiveTab', () => ({
  useSyncSiteWithActiveTab: () => undefined,
}));

vi.mock('./hooks/usePendingNoteSelect', () => ({
  usePendingNoteSelect: () => undefined,
  useExtensionLifecycle: () => undefined,
}));

vi.mock('./hooks/usePersistedPanelVisibility', () => ({
  usePersistedPanelVisibility: () => ({
    showSidebar: true,
    showNoteList: true,
    setShowSidebar: vi.fn(),
    setShowNoteList: vi.fn(),
  }),
}));

describe('App layout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders lightweight loading panels before async content is ready', () => {
    render(<App />);

    expect(screen.getByText('正在加载工作区...')).toBeInTheDocument();
    expect(screen.getByText('正在准备编辑器...')).toBeInTheDocument();
  });

  it('defers loading the heavy panels until after the first paint delay', async () => {
    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByTestId('workspace-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('editor-panel')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(120);
      await vi.dynamicImportSettled();
    });

    expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    expect(screen.getByTestId('editor-panel')).toBeInTheDocument();
  });

  it('renders a single workspace panel next to the editor', async () => {
    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(120);
      await vi.dynamicImportSettled();
    });

    expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    expect(screen.getByTestId('editor-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('note-list-panel')).not.toBeInTheDocument();
  });
});

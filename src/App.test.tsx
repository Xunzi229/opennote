import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('renders a single workspace panel next to the editor', () => {
    render(<App />);

    expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    expect(screen.getByTestId('editor-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('note-list-panel')).not.toBeInTheDocument();
  });
});

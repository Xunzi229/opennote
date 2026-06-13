import { lazy, Suspense, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import { useSyncSiteWithActiveTab } from './hooks/useSyncSiteWithActiveTab';
import { usePersistedPanelVisibility } from './hooks/usePersistedPanelVisibility';
import { usePendingNoteSelect, useExtensionLifecycle } from './hooks/usePendingNoteSelect';
import { useAutoSync } from './hooks/useAutoSync';
import { t, useLocale } from './i18n';

const Sidebar = lazy(() => import('./components/Sidebar'));
const EditorPanel = lazy(() => import('./components/EditorPanel'));
const PANEL_LOAD_DELAY_MS = 100;

function App() {
  // Subscribe to locale changes so all components re-render when language is switched
  useLocale();

  const { loadWorkspace } = useNotesStore();
  const { showSidebar, setShowSidebar } = usePersistedPanelVisibility();
  const canLoadPanels = useDeferredPanelLoad();

  useSyncSiteWithActiveTab();
  useExtensionLifecycle();
  usePendingNoteSelect();
  useAutoSync();

  useEffect(() => {
    if (!canLoadPanels) return;
    loadWorkspace();
  }, [canLoadPanels, loadWorkspace]);

  return (
    <div className="app-shell">
      {showSidebar ? (
        <div className="panel-group">
          {canLoadPanels ? (
            <Suspense fallback={<WorkspacePanelFallback />}>
              <Sidebar />
            </Suspense>
          ) : (
            <WorkspacePanelFallback />
          )}
          <button
            type="button"
            onClick={() => setShowSidebar(false)}
            className="panel-rail"
            title={t('hideWorkspace')}
            aria-label={t('hideWorkspace')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSidebar(true)}
          className="panel-rail"
          title={t('showWorkspace')}
          aria-label={t('showWorkspace')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {canLoadPanels ? (
        <Suspense fallback={<EditorPanelFallback />}>
          <EditorPanel />
        </Suspense>
      ) : (
        <EditorPanelFallback />
      )}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

function useDeferredPanelLoad() {
  const [canLoadPanels, setCanLoadPanels] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanLoadPanels(true);
    }, PANEL_LOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return canLoadPanels;
}

function WorkspacePanelFallback() {
  return (
    <aside className="panel panel-sidebar panel-loading">
      <div className="loading-spinner" aria-hidden="true" />
      <span>正在加载工作区...</span>
    </aside>
  );
}

function EditorPanelFallback() {
  return (
    <main className="panel panel-editor panel-loading">
      <div className="loading-spinner" aria-hidden="true" />
      <span>正在准备编辑器...</span>
    </main>
  );
}

export default App;

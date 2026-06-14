import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import { useSyncSiteWithActiveTab } from './hooks/useSyncSiteWithActiveTab';
import { usePersistedPanelVisibility } from './hooks/usePersistedPanelVisibility';
import { usePersistedSidebarWidth, DEFAULT_SIDEBAR_WIDTH } from './hooks/usePersistedSidebarWidth';
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
  const { sidebarWidth, widthRef, setSidebarWidth, persistSidebarWidth } = usePersistedSidebarWidth();
  const canLoadPanels = useDeferredPanelLoad();
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useSyncSiteWithActiveTab();
  useExtensionLifecycle();
  usePendingNoteSelect();
  useAutoSync();

  useEffect(() => {
    if (!canLoadPanels) return;
    loadWorkspace();
  }, [canLoadPanels, loadWorkspace]);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragStateRef.current = { startX: event.clientX, startWidth: widthRef.current };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [widthRef],
  );

  const handleResizeMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      setSidebarWidth(drag.startWidth + (event.clientX - drag.startX));
    },
    [setSidebarWidth],
  );

  const handleResizeEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      persistSidebarWidth();
    },
    [persistSidebarWidth],
  );

  return (
    <div className="app-shell" style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
      {showSidebar ? (
        <div className="panel-group">
          {canLoadPanels ? (
            <Suspense fallback={<WorkspacePanelFallback />}>
              <Sidebar />
            </Suspense>
          ) : (
            <WorkspacePanelFallback />
          )}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('resizeSidebar')}
            className="panel-resize-handle"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onDoubleClick={() => persistSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
          />
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

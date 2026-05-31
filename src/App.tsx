import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import { useSyncSiteWithActiveTab } from './hooks/useSyncSiteWithActiveTab';
import { usePersistedPanelVisibility } from './hooks/usePersistedPanelVisibility';
import { usePendingNoteSelect, useExtensionLifecycle } from './hooks/usePendingNoteSelect';
import Sidebar from './components/Sidebar';
import EditorPanel from './components/EditorPanel';
import { t } from './i18n';

function App() {
  const { loadWorkspace } = useNotesStore();
  const { showSidebar, setShowSidebar } = usePersistedPanelVisibility();

  useSyncSiteWithActiveTab();
  useExtensionLifecycle();
  usePendingNoteSelect();

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    <div className="app-shell">
      {showSidebar ? (
        <div className="panel-group">
          <Sidebar />
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

      <EditorPanel />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default App;

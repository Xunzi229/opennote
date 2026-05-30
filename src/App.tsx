import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import { useSyncSiteWithActiveTab } from './hooks/useSyncSiteWithActiveTab';
import { usePersistedPanelVisibility } from './hooks/usePersistedPanelVisibility';
import { usePendingNoteSelect, useExtensionLifecycle } from './hooks/usePendingNoteSelect';
import Sidebar from './components/Sidebar';
import NoteListPanel from './components/NoteListPanel';
import EditorPanel from './components/EditorPanel';

function App() {
  const { loadNotes } = useNotesStore();
  const { showSidebar, showNoteList, setShowSidebar, setShowNoteList } = usePersistedPanelVisibility();

  useSyncSiteWithActiveTab();
  useExtensionLifecycle();
  usePendingNoteSelect();

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return (
    <div className="app-shell">
      {showSidebar ? (
        <div className="panel-group">
          <Sidebar />
          <button
            type="button"
            onClick={() => setShowSidebar(false)}
            className="panel-rail"
            title="隐藏网站列表"
            aria-label="隐藏网站列表"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSidebar(true)}
          className="panel-rail"
          title="显示网站列表"
          aria-label="显示网站列表"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {showNoteList ? (
        <div className="panel-group">
          <NoteListPanel />
          <button
            type="button"
            onClick={() => setShowNoteList(false)}
            className="panel-rail"
            title="隐藏笔记列表"
            aria-label="隐藏笔记列表"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNoteList(true)}
          className="panel-rail"
          title="显示笔记列表"
          aria-label="显示笔记列表"
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

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import { useSyncSiteWithActiveTab } from './hooks/useSyncSiteWithActiveTab';
import { usePersistedPanelVisibility } from './hooks/usePersistedPanelVisibility';
import Sidebar from './components/Sidebar';
import NoteListPanel from './components/NoteListPanel';
import EditorPanel from './components/EditorPanel';

function App() {
  const { loadNotes, addNote, setSelectedNoteId } = useNotesStore();
  const { showSidebar, showNoteList, setShowSidebar, setShowNoteList } = usePersistedPanelVisibility();

  useSyncSiteWithActiveTab();

  useEffect(() => {
    loadNotes();

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.url) return;

      try {
        const url = new URL(tab.url);
        if (url.protocol.startsWith('chrome')) return;

        const result = await chrome.storage.session.get('pendingNoteContent');
        if (result.pendingNoteContent) {
          const note = await addNote(url.hostname, result.pendingNoteContent);
          setSelectedNoteId(note.id);
          await chrome.storage.session.remove('pendingNoteContent');
        }
      } catch {
        // Invalid URL
      }
    });
  }, [loadNotes, addNote, setSelectedNoteId]);

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

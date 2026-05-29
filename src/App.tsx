import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import Sidebar from './components/Sidebar';
import EditorPanel from './components/EditorPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  const { loadNotes, setCurrentSite, addNote } = useNotesStore();
  const [showSidebar, setShowSidebar] = useState(true);

  // Load notes on mount and detect current site from active tab
  useEffect(() => {
    loadNotes();

    // Get current tab hostname
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          if (!url.protocol.startsWith('chrome')) {
            setCurrentSite(url.hostname);

            // Check for pending note content from context menu
            const result = await chrome.storage.session.get('pendingNoteContent');
            if (result.pendingNoteContent) {
              // Create a new note with the pending content
              await addNote(url.hostname, result.pendingNoteContent);
              // Clear pending content
              await chrome.storage.session.remove('pendingNoteContent');
            }
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    });
  }, [loadNotes, setCurrentSite, addNote]);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar with toggle */}
      {showSidebar && (
        <div className="flex">
          <Sidebar />
          <button
            onClick={() => setShowSidebar(false)}
            className="w-6 border-r border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
            title="隐藏网站列表"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toggle button when sidebar hidden */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="w-8 border-r border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
          title="显示网站列表"
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
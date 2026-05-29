import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import Sidebar from './components/Sidebar';
import EditorPanel from './components/EditorPanel';

function App() {
  const { loadNotes, setCurrentSite } = useNotesStore();

  // Load notes on mount and detect current site from active tab
  useEffect(() => {
    loadNotes();

    // Get current tab hostname
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          if (!url.protocol.startsWith('chrome')) {
            setCurrentSite(url.hostname);
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    });
  }, [loadNotes, setCurrentSite]);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Sidebar />
      <EditorPanel />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default App;
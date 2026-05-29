import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import Sidebar from './components/Sidebar';
import EditorPanel from './components/EditorPanel';

function App() {
  const { loadNotes, setCurrentSite, addNote } = useNotesStore();

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
              const pendingContent = {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: result.pendingNoteContent }],
                  },
                ],
              };
              await addNote(url.hostname, pendingContent);
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
      <Sidebar />
      <EditorPanel />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default App;
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useNotesStore } from './store/notesStore';
import Sidebar from './components/Sidebar';
import NoteListPanel from './components/NoteListPanel';
import EditorPanel from './components/EditorPanel';

function App() {
  const { loadNotes, setCurrentSite, addNote, setSelectedNoteId } = useNotesStore();

  useEffect(() => {
    loadNotes();

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          if (!url.protocol.startsWith('chrome')) {
            setCurrentSite(url.hostname);

            const result = await chrome.storage.session.get('pendingNoteContent');
            if (result.pendingNoteContent) {
              const note = await addNote(url.hostname, result.pendingNoteContent);
              setSelectedNoteId(note.id);
              await chrome.storage.session.remove('pendingNoteContent');
            }
          }
        } catch {
          // Invalid URL
        }
      }
    });
  }, [loadNotes, setCurrentSite, addNote, setSelectedNoteId]);

  return (
    <div className="app-shell">
      <Sidebar />
      <NoteListPanel />
      <EditorPanel />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default App;

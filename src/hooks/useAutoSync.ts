import { useEffect } from 'react';
import { useNotesStore } from '../store/notesStore';
import { isWebdavConfigured, loadWebdavConfig } from '../lib/syncConfig';
import { pushToWebdav } from '../services/webdavSync';

const AUTO_UPLOAD_DEBOUNCE_MS = 4000;

// Debounced auto-upload: when the workspace changes and WebDAV auto-upload is
// enabled, push the (incremental) changes after a short idle period. Pull stays
// manual. Errors are swallowed — manual sync surfaces them in the dialog.
export function useAutoSync(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastWorkspace = useNotesStore.getState().workspace;

    const scheduleUpload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void (async () => {
          try {
            const config = await loadWebdavConfig();
            if (!config.enabled || !isWebdavConfigured(config)) return;
            await pushToWebdav(config);
          } catch {
            // Silent: auto-upload failures should not interrupt the user.
          }
        })();
      }, AUTO_UPLOAD_DEBOUNCE_MS);
    };

    const unsubscribe = useNotesStore.subscribe((state) => {
      if (state.workspace === lastWorkspace) return;
      lastWorkspace = state.workspace;
      scheduleUpload();
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

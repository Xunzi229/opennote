import { useCallback, useEffect, useState } from 'react';
import { getMeta, setMeta } from '../lib/storage';

export function usePersistedPanelVisibility() {
  const [showSidebar, setShowSidebarState] = useState(true);
  const [showNoteList, setShowNoteListState] = useState(true);

  useEffect(() => {
    getMeta().then((meta) => {
      if (meta.showSidebar !== undefined) {
        setShowSidebarState(meta.showSidebar);
      }
      if (meta.showNoteList !== undefined) {
        setShowNoteListState(meta.showNoteList);
      }
    });
  }, []);

  const setShowSidebar = useCallback((value: boolean) => {
    setShowSidebarState(value);
    getMeta()
      .then((meta) => setMeta({ ...meta, showSidebar: value }))
      .catch(() => {});
  }, []);

  const setShowNoteList = useCallback((value: boolean) => {
    setShowNoteListState(value);
    getMeta()
      .then((meta) => setMeta({ ...meta, showNoteList: value }))
      .catch(() => {});
  }, []);

  return { showSidebar, showNoteList, setShowSidebar, setShowNoteList };
}

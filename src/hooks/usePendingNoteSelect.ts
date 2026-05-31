import { useEffect } from 'react';
import { useNotesStore } from '../store/notesStore';
import type { PendingNoteSelect } from '../lib/contextMenuSave';
import { getWorkspace } from '../lib/storage';
import {
  isExtensionContextError,
  isExtensionContextValid,
  reloadExtensionPageIfInvalid,
} from '../lib/extensionRuntime';

const PENDING_NOTE_SELECT_MESSAGE = 'opennote:pending-note-select';

async function consumePendingNoteSelect() {
  if (!isExtensionContextValid()) {
    reloadExtensionPageIfInvalid();
    return;
  }

  try {
    const result = await chrome.storage.session.get('pendingNoteSelect');
    const pending = result.pendingNoteSelect as PendingNoteSelect | undefined;
    if (!pending?.site || !pending.pageId) return;

    const workspace = await getWorkspace();
    useNotesStore.setState({ workspace });
    useNotesStore.getState().selectPage(pending.pageId);
    await chrome.storage.session.remove('pendingNoteSelect');
  } catch (error) {
    if (isExtensionContextError(error) || !isExtensionContextValid()) {
      reloadExtensionPageIfInvalid();
    }
  }
}

function isPendingNoteSelectMessage(message: unknown): message is PendingNoteSelect & { type: string } {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: string }).type === PENDING_NOTE_SELECT_MESSAGE &&
    typeof (message as PendingNoteSelect).site === 'string' &&
    typeof (message as PendingNoteSelect).pageId === 'string'
  );
}

export function usePendingNoteSelect() {
  useEffect(() => {
    void consumePendingNoteSelect();

    const handleStorageChange = (
      changes: { pendingNoteSelect?: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'session' || !changes.pendingNoteSelect?.newValue) return;
      void consumePendingNoteSelect();
    };

    const handleRuntimeMessage = (message: unknown) => {
      if (!isPendingNoteSelectMessage(message)) return;
      void consumePendingNoteSelect();
    };

    try {
      chrome.storage.onChanged.addListener(handleStorageChange);
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      };
    } catch {
      reloadExtensionPageIfInvalid();
      return undefined;
    }
  }, []);
}

export function useExtensionLifecycle() {
  useEffect(() => {
    if (!isExtensionContextValid()) {
      reloadExtensionPageIfInvalid();
      return;
    }

    let port: chrome.runtime.Port | undefined;

    try {
      port = chrome.runtime.connect({ name: 'opennote-panel' });
      port.onDisconnect.addListener(() => {
        reloadExtensionPageIfInvalid();
      });
    } catch {
      reloadExtensionPageIfInvalid();
    }

    return () => {
      try {
        port?.disconnect();
      } catch {
        // Ignore cleanup errors after extension reload.
      }
    };
  }, []);
}

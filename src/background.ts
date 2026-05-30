import { capturePageSelection } from './lib/capturePageSelection';
import { saveSelectionAsNote, type CapturedSelection } from './lib/contextMenuSave';
import {
  parseContextMenuAction,
  refreshContextMenuForActiveTab,
  registerContextMenuRefreshListeners,
  setupStaticContextMenu,
} from './lib/contextMenu';
import { bindNotesCacheSync, initNotesCache } from './lib/notesCache';
import {
  ensureTabLegacyScriptsPurged,
  purgeLegacyContentScriptsFromOpenTabs,
  resetLegacyContentScriptPurgeFlag,
} from './lib/purgeLegacyContentScripts';

function setupPanelBehavior() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

function isSpecialPage(url: string | undefined): boolean {
  if (!url) return true;
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:');
}

function getHostname(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol.startsWith('chrome')) return null;
    return parsed.hostname;
  } catch {
    return null;
  }
}

async function captureSelectionFromTab(tabId: number): Promise<CapturedSelection | null> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: capturePageSelection,
    });
    const result = injection?.result as CapturedSelection | null | undefined;
    if (result?.text || result?.html || result?.markdown) return result;
  } catch {
    // Restricted pages cannot be scripted.
  }

  return null;
}

void purgeLegacyContentScriptsFromOpenTabs();

chrome.runtime.onInstalled.addListener(() => {
  setupStaticContextMenu();
  setupPanelBehavior();
  void resetLegacyContentScriptPurgeFlag().then(() => purgeLegacyContentScriptsFromOpenTabs());
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'opennote-panel') return;
  port.onDisconnect.addListener(() => {
    // Side panel detects disconnect and reloads itself when the extension updates.
  });
});

bindNotesCacheSync();
setupPanelBehavior();
registerContextMenuRefreshListeners();

void initNotesCache().then(() => {
  refreshContextMenuForActiveTab();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const action = parseContextMenuAction(info.menuItemId);
  if (!action) return;

  const tabId = tab?.id;
  if (!tabId) return;

  if (isSpecialPage(tab?.url)) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'OpenNote',
      message: '此页面不支持笔记',
    });
    return;
  }

  const hostname = getHostname(tab?.url);
  if (!hostname) return;

  // Must run before any await, otherwise Chrome drops the user gesture.
  void chrome.sidePanel.open({ tabId }).catch(() => {});

  void (async () => {
    const ready = await ensureTabLegacyScriptsPurged(tabId);
    if (!ready) return;

    let selection: CapturedSelection | null = null;

    try {
      selection = await captureSelectionFromTab(tabId);
    } catch {
      // Fall back to plain text below.
    }

    if (!selection?.text && !selection?.html && !selection?.markdown && info.selectionText?.trim()) {
      selection = { text: info.selectionText.trim() };
    }

    if (!selection?.text && !selection?.html && !selection?.markdown) return;

    const noteId = await saveSelectionAsNote(hostname, action, selection);
    if (!noteId) return;

    await chrome.storage.session.set({
      pendingNoteSelect: {
        site: hostname,
        noteId,
      },
    });

    void chrome.runtime
      .sendMessage({
        type: 'opennote:pending-note-select',
        site: hostname,
        noteId,
      })
      .catch(() => {});
  })();
});

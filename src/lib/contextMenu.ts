import { ensureNotesCacheReady, getCachedNotes } from './notesCache';
import { getHostnameFromUrl } from './tabSite';
import { sortSiteNotes, truncateMenuTitle } from './noteSort';
import {
  CONTEXT_MENU_APPEND_PREFIX,
  CONTEXT_MENU_NEW_ID,
  CONTEXT_MENU_ROOT_ID,
  CONTEXT_MENU_SEPARATOR_ID,
  MAX_CONTEXT_MENU_NOTES,
} from './contextMenuConstants';
import type { Note } from '../types';

const dynamicMenuIds = new Set<string>();
let lastBuiltMenuKey = '';
let refreshQueue: Promise<void> = Promise.resolve();

function buildMenuKey(hostname: string | null, notes: Note[]) {
  if (!hostname) return '';
  return `${hostname}:${notes.map((note) => note.id).join(',')}`;
}

function removeDynamicMenuItems() {
  const removals = [...dynamicMenuIds].map(
    (id) =>
      new Promise<void>((resolve) => {
        chrome.contextMenus.remove(id, () => resolve());
      }),
  );
  dynamicMenuIds.clear();
  return Promise.all(removals);
}

function createDynamicMenuItems(siteNotes: Note[]) {
  return (async () => {
    if (siteNotes.length === 0) return;

    await new Promise<void>((resolve) => {
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_SEPARATOR_ID,
          parentId: CONTEXT_MENU_ROOT_ID,
          type: 'separator',
          contexts: ['selection'],
        },
        () => resolve(),
      );
    });
    dynamicMenuIds.add(CONTEXT_MENU_SEPARATOR_ID);

    for (const note of siteNotes) {
      const id = `${CONTEXT_MENU_APPEND_PREFIX}${note.id}`;
      await new Promise<void>((resolve) => {
        chrome.contextMenus.create(
          {
            id,
            parentId: CONTEXT_MENU_ROOT_ID,
            title: truncateMenuTitle(note.title),
            contexts: ['selection'],
          },
          () => resolve(),
        );
      });
      dynamicMenuIds.add(id);
    }
  })();
}

export function setupStaticContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ROOT_ID,
      title: '保存为笔记',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU_NEW_ID,
      parentId: CONTEXT_MENU_ROOT_ID,
      title: '新建笔记',
      contexts: ['selection'],
    });
  });
  lastBuiltMenuKey = '';
}

export async function refreshContextMenuForTab(tab: chrome.tabs.Tab | undefined) {
  refreshQueue = refreshQueue.then(async () => {
    await ensureNotesCacheReady();

    const hostname = getHostnameFromUrl(tab?.url);
    if (!hostname) {
      if (lastBuiltMenuKey) {
        await removeDynamicMenuItems();
        lastBuiltMenuKey = '';
      }
      return;
    }

    const siteNotes = sortSiteNotes(getCachedNotes()[hostname] || []).slice(0, MAX_CONTEXT_MENU_NOTES);
    const menuKey = buildMenuKey(hostname, siteNotes);
    if (menuKey === lastBuiltMenuKey) return;

    await removeDynamicMenuItems();
    lastBuiltMenuKey = menuKey;
    await createDynamicMenuItems(siteNotes);
  });

  return refreshQueue;
}

export function invalidateContextMenuCache() {
  lastBuiltMenuKey = '';
}

export function refreshContextMenuForActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    void refreshContextMenuForTab(tabs[0]);
  });
}

export function parseContextMenuAction(menuItemId: string | number) {
  const menuId = String(menuItemId);

  if (menuId === CONTEXT_MENU_NEW_ID) {
    return { action: 'create' as const };
  }

  if (menuId.startsWith(CONTEXT_MENU_APPEND_PREFIX)) {
    return {
      action: 'append' as const,
      noteId: menuId.slice(CONTEXT_MENU_APPEND_PREFIX.length),
    };
  }

  return null;
}

export function registerContextMenuRefreshListeners() {
  chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      void refreshContextMenuForTab(tab);
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.notes) return;
    invalidateContextMenuCache();
    refreshContextMenuForActiveTab();
  });

  const menus = chrome.contextMenus as typeof chrome.contextMenus & {
    onShown?: {
      addListener: (
        callback: (info: { contexts?: chrome.contextMenus.ContextType[] }, tab?: chrome.tabs.Tab) => void,
      ) => void;
    };
  };

  menus.onShown?.addListener((info, tab) => {
    const contexts = info.contexts as string[] | undefined;
    if (!contexts?.includes('selection')) return;
    void refreshContextMenuForTab(tab);
  });
}

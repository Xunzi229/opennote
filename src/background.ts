// OpenNote Background Service Worker

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-note',
      title: '保存为笔记',
      contexts: ['selection'],
    });
  });
}

function setupPanelBehavior() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

function isSpecialPage(url: string | undefined): boolean {
  if (!url) return true;
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:');
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu();
  setupPanelBehavior();
});

setupPanelBehavior();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-note' || !tab?.id) return;

  if (isSpecialPage(tab.url)) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'OpenNote',
      message: '此页面不支持笔记',
    });
    return;
  }

  if (info.selectionText) {
    await chrome.storage.session.set({ pendingNoteContent: info.selectionText });
  }

  await chrome.sidePanel.open({ tabId: tab.id });
});

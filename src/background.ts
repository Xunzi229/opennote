// OpenNote Background Service Worker

// Register context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-note',
    title: '保存为笔记',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-note' && tab?.id) {
    if (isSpecialPage(tab.url)) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'OpenNote',
        message: '此页面不支持笔记',
      });
      return;
    }
    // Store pending note content in session storage
    if (info.selectionText) {
      await chrome.storage.session.set({ pendingNoteContent: info.selectionText });
    }
    // Open side panel
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Check if URL is a special page that doesn't support extensions
function isSpecialPage(url: string | undefined): boolean {
  if (!url) return true;
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:');
}

// Handle toolbar icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && !isSpecialPage(tab.url)) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else if (tab.id) {
    // Show notification for special pages
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'OpenNote',
      message: '此页面不支持笔记',
    });
  }
});

// Set side panel options on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
});
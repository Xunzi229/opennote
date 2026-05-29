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
    // Store pending note content in session storage
    if (info.selectionText) {
      await chrome.storage.session.set({ pendingNoteContent: info.selectionText });
    }
    // Open side panel
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Handle toolbar icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Set side panel options on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
});
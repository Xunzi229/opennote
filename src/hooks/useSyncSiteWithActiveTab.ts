import { useEffect } from 'react';
import { useNotesStore } from '../store/notesStore';
import { getHostnameFromUrl } from '../lib/tabSite';

export function useSyncSiteWithActiveTab() {
  const setCurrentSite = useNotesStore((state) => state.setCurrentSite);

  useEffect(() => {
    const tabsApi = typeof chrome === 'undefined' ? undefined : chrome.tabs;
    if (!tabsApi?.query || !tabsApi.get || !tabsApi.onActivated || !tabsApi.onUpdated) return;

    const syncFromTab = (tab: chrome.tabs.Tab | undefined) => {
      const hostname = getHostnameFromUrl(tab?.url);
      setCurrentSite(hostname);
    };

    tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
      syncFromTab(tabs[0]);
    });

    const handleActivated = (activeInfo: { tabId: number }) => {
      tabsApi.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime?.lastError) return;
        syncFromTab(tab);
      });
    };

    const handleUpdated = (_tabId: number, changeInfo: { url?: string; status?: string }, tab: chrome.tabs.Tab) => {
      if (!tab.active) return;
      if (changeInfo.url === undefined && changeInfo.status !== 'complete') return;
      syncFromTab(tab);
    };

    tabsApi.onActivated.addListener(handleActivated);
    tabsApi.onUpdated.addListener(handleUpdated);

    return () => {
      tabsApi.onActivated.removeListener(handleActivated);
      tabsApi.onUpdated.removeListener(handleUpdated);
    };
  }, [setCurrentSite]);
}

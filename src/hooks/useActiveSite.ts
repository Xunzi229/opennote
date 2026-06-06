import { useEffect, useState } from 'react';
import { getHostnameFromUrl } from '../lib/tabSite';

export function useActiveSite() {
  const [actualCurrentSite, setActualCurrentSite] = useState<string | null>(null);

  useEffect(() => {
    const tabsApi = typeof chrome === 'undefined' ? undefined : chrome.tabs;
    if (!tabsApi?.query || !tabsApi.get || !tabsApi.onActivated || !tabsApi.onUpdated) return;

    const updateFromTab = (tab: chrome.tabs.Tab | undefined) => {
      setActualCurrentSite(getHostnameFromUrl(tab?.url));
    };

    tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
      updateFromTab(tabs[0]);
    });

    const handleActivated = (activeInfo: { tabId: number }) => {
      tabsApi.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime?.lastError) return;
        updateFromTab(tab);
      });
    };

    const handleUpdated = (_tabId: number, changeInfo: { url?: string; status?: string }, tab: chrome.tabs.Tab) => {
      if (!tab.active) return;
      if (changeInfo.url === undefined && changeInfo.status !== 'complete') return;
      updateFromTab(tab);
    };

    tabsApi.onActivated.addListener(handleActivated);
    tabsApi.onUpdated.addListener(handleUpdated);

    return () => {
      tabsApi.onActivated.removeListener(handleActivated);
      tabsApi.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  return actualCurrentSite;
}

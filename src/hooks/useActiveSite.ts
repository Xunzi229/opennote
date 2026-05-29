import { useEffect, useState } from 'react';

export function useActiveSite() {
  const [actualCurrentSite, setActualCurrentSite] = useState<string | null>(null);

  useEffect(() => {
    const updateCurrentTab = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.url) {
          try {
            const url = new URL(tab.url);
            if (!url.protocol.startsWith('chrome')) {
              setActualCurrentSite(url.hostname);
            } else {
              setActualCurrentSite(null);
            }
          } catch {
            setActualCurrentSite(null);
          }
        }
      });
    };

    updateCurrentTab();
    chrome.tabs.onActivated.addListener(updateCurrentTab);
    return () => chrome.tabs.onActivated.removeListener(updateCurrentTab);
  }, []);

  return actualCurrentSite;
}

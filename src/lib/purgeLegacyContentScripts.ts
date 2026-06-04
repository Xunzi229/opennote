const PURGE_SESSION_KEY = 'legacyContentScriptsPurged';

let purgePromise: Promise<void> | null = null;

export async function unregisterLegacyContentScripts() {
  const scripting = chrome.scripting as typeof chrome.scripting & {
    getRegisteredContentScripts?: (
      callback: (scripts: chrome.scripting.RegisteredContentScript[]) => void,
    ) => void;
  };

  if (!scripting.getRegisteredContentScripts) return;

  await new Promise<void>((resolve) => {
    scripting.getRegisteredContentScripts?.((scripts) => {
      const legacyIds = scripts
        .map((script) => script.id)
        .filter((id) => id.startsWith('opennote'));

      if (legacyIds.length === 0) {
        resolve();
        return;
      }

      chrome.scripting.unregisterContentScripts({ ids: legacyIds }, () => resolve());
    });
  });
}

async function doPurgeLegacyContentScripts() {
  const { [PURGE_SESSION_KEY]: purged } = await chrome.storage.session.get(PURGE_SESSION_KEY);
  if (purged) return;

  await unregisterLegacyContentScripts();
  await chrome.storage.session.set({ [PURGE_SESSION_KEY]: true });
}

export function purgeLegacyContentScriptsFromOpenTabs() {
  purgePromise ??= doPurgeLegacyContentScripts();
  return purgePromise;
}

export async function resetLegacyContentScriptPurgeFlag() {
  purgePromise = null;
  await chrome.storage.session.remove(PURGE_SESSION_KEY);
}

export async function ensureTabLegacyScriptsPurged(tabId: number): Promise<boolean> {
  void tabId;
  await purgeLegacyContentScriptsFromOpenTabs();
  return true;
}

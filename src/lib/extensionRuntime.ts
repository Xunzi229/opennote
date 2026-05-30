export function isExtensionContextValid() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function reloadExtensionPageIfInvalid() {
  try {
    if (!chrome.runtime?.id) {
      window.location.reload();
      return;
    }
  } catch {
    window.location.reload();
  }
}

export function isExtensionContextError(error: unknown) {
  return error instanceof Error && error.message.includes('Extension context invalidated');
}

export function isExtensionContextValid() {
  if (typeof chrome === 'undefined') return false;
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function reloadExtensionPageIfInvalid() {
  if (typeof chrome === 'undefined') return false;

  try {
    void chrome.runtime?.id;
  } catch {
    window.location.reload();
    return true;
  }

  return false;
}

export function isExtensionContextError(error: unknown) {
  return error instanceof Error && error.message.includes('Extension context invalidated');
}

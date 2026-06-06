import { afterEach, describe, expect, it, vi } from 'vitest';
import { isExtensionContextValid, reloadExtensionPageIfInvalid } from './extensionRuntime';

describe('extension runtime helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not reload localhost preview when no chrome runtime exists', () => {
    vi.stubGlobal('chrome', undefined);

    expect(isExtensionContextValid()).toBe(false);
    expect(reloadExtensionPageIfInvalid()).toBe(false);
  });

  it('does not reload when chrome exists without an extension runtime id', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        lastError: null,
      },
    });

    expect(isExtensionContextValid()).toBe(false);
    expect(reloadExtensionPageIfInvalid()).toBe(false);
  });
});

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncSiteWithActiveTab } from './useSyncSiteWithActiveTab';
import { useNotesStore } from '../store/notesStore';

function HookHarness() {
  useSyncSiteWithActiveTab();
  return null;
}

describe('useSyncSiteWithActiveTab', () => {
  const setCurrentSite = vi.fn();
  const ensureSiteRoot = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useNotesStore.setState({
      setCurrentSite,
      ensureSiteRoot,
    });

    vi.stubGlobal('chrome', {
      runtime: {
        lastError: null,
      },
      tabs: {
        query: vi.fn((_query, callback: (tabs: chrome.tabs.Tab[]) => void) => {
          callback([{ id: 1, active: true, url: 'https://example.com/docs' } as chrome.tabs.Tab]);
        }),
        get: vi.fn(),
        onActivated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onUpdated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  it('syncs the active hostname without creating a site root', () => {
    render(<HookHarness />);

    expect(setCurrentSite).toHaveBeenCalledWith('example.com');
    expect(ensureSiteRoot).not.toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveSite } from './useActiveSite';

function HookHarness() {
  const activeSite = useActiveSite();
  return <div data-testid="active-site">{activeSite ?? 'none'}</div>;
}

describe('useActiveSite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the tabs API is unavailable', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        lastError: null,
      },
    });

    expect(() => render(<HookHarness />)).not.toThrow();
    expect(screen.getByTestId('active-site')).toHaveTextContent('none');
  });
});

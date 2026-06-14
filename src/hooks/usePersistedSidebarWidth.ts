import { useCallback, useEffect, useRef, useState } from 'react';
import { getMeta, setMeta } from '../lib/storage';

export const DEFAULT_SIDEBAR_WIDTH = 336;
export const MIN_SIDEBAR_WIDTH = 240;
export const MAX_SIDEBAR_WIDTH = 600;

export function clampSidebarWidth(width: number): number {
  // Keep the editor usable: never let the sidebar eat more than the window
  // minus a reasonable editor minimum.
  const viewportMax =
    typeof window !== 'undefined' ? Math.max(MIN_SIDEBAR_WIDTH, window.innerWidth - 320) : MAX_SIDEBAR_WIDTH;
  const upper = Math.min(MAX_SIDEBAR_WIDTH, viewportMax);
  return Math.round(Math.min(upper, Math.max(MIN_SIDEBAR_WIDTH, width)));
}

export function usePersistedSidebarWidth() {
  const [sidebarWidth, setSidebarWidthState] = useState(DEFAULT_SIDEBAR_WIDTH);
  const widthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    getMeta()
      .then((meta) => {
        if (typeof meta.sidebarWidth === 'number') {
          const next = clampSidebarWidth(meta.sidebarWidth);
          widthRef.current = next;
          setSidebarWidthState(next);
        }
      })
      .catch(() => {});
  }, []);

  // Live update without persisting (used during a drag).
  const setSidebarWidth = useCallback((value: number) => {
    const next = clampSidebarWidth(value);
    widthRef.current = next;
    setSidebarWidthState(next);
  }, []);

  // Persist the current width (used when a drag ends).
  const persistSidebarWidth = useCallback((value?: number) => {
    const next = clampSidebarWidth(value ?? widthRef.current);
    widthRef.current = next;
    setSidebarWidthState(next);
    getMeta()
      .then((meta) => setMeta({ ...meta, sidebarWidth: next }))
      .catch(() => {});
  }, []);

  return { sidebarWidth, widthRef, setSidebarWidth, persistSidebarWidth };
}

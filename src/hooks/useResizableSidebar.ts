import { useCallback, useEffect, useRef, useState } from 'react';

const SIDEBAR_WIDTH_KEY = 'apexcareir_admin_sidebar_width';
export const DEFAULT_SIDEBAR_WIDTH = 288;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 520;

function clampWidth(value: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));
}

function readStoredWidth() {
  const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (!stored) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? clampWidth(parsed) : DEFAULT_SIDEBAR_WIDTH;
}

export function useResizableSidebar() {
  const [width, setWidth] = useState(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const startResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      setWidth(clampWidth(event.clientX));
    };

    const stopResize = () => {
      setIsResizing(false);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(widthRef.current));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  return {
    width,
    isResizing,
    startResize,
  };
}

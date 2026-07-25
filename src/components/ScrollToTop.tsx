import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures every in-app route change starts at the top of the page.
 * Hash links (#section) still scroll to the matching element when present.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      if (id) {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ block: 'start', behavior: 'auto' });
          return;
        }
      }
    }

    // Instant jump — avoid CSS `scroll-behavior: smooth` animating from deep scroll.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search, hash]);

  return null;
}

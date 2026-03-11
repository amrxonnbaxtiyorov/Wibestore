import { lazy } from 'react';

/**
 * lazy() wrapper that retries on chunk-load failures.
 * Common in production after a new deploy when the user still has an old HTML cached.
 *
 * Behavior:
 * - If dynamic import fails with a known "chunk load" error, we reload the page once.
 * - A sessionStorage flag prevents infinite reload loops.
 */
export function lazyWithRetry(importer, { retryKey = 'wibe_lazy_retry_once' } = {}) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      const msg = String(err?.message || err || '');
      const isChunkLoadError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError');

      if (isChunkLoadError && typeof window !== 'undefined') {
        try {
          const alreadyRetried = sessionStorage.getItem(retryKey) === '1';
          if (!alreadyRetried) {
            sessionStorage.setItem(retryKey, '1');
            window.location.reload();
            // Return a never-resolving promise; reload should take over.
            return new Promise(() => {});
          }
        } catch {
          // ignore storage errors and fall through
        }
      }

      throw err;
    }
  });
}


/**
 * PwaPrompt.tsx
 * Small toast shown when the app is ready for offline use or when a new version is waiting.
 * Registers the service worker (production builds only).
 */
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';

export default function PwaPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // The "ready offline" note is informational, so it hides itself.
  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => setOfflineReady(false), 6000);
    return () => window.clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-50 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-96"
    >
      <p className="text-sm">
        {needRefresh
          ? 'Versi baru tersedia. Muat ulang untuk memakainya. Datamu tetap aman.'
          : 'Aplikasi siap dipakai tanpa internet.'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        {needRefresh && (
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            Muat ulang
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
        >
          {needRefresh ? 'Nanti' : 'Tutup'}
        </Button>
      </div>
    </div>
  );
}

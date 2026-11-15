/**
 * useInstallPrompt.ts
 * Captures the browser's "install app" event (Chromium browsers) so Settings can offer an install button.
 * The listener lives at module level because the event usually fires before Settings is ever opened.
 */
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone =
    typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayStandalone;
}

if (typeof window !== 'undefined') {
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // use our own button instead of the browser mini-bar
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface InstallPromptState {
  /** True when the browser can show its install dialog right now */
  canInstall: boolean;
  /** True when the app already runs as an installed app */
  isInstalled: boolean;
  install: () => Promise<void>;
}

export function useInstallPrompt(): InstallPromptState {
  const canInstall = useSyncExternalStore(subscribe, () => deferredPrompt !== null);
  const isInstalled = useSyncExternalStore(subscribe, () => installed);

  async function install(): Promise<void> {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    deferredPrompt = null; // the event can only be used once
    emit();
  }

  return { canInstall, isInstalled, install };
}

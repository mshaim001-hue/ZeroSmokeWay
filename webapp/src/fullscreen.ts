/**
 * Android phone fullscreen on tap (same as chat-box-chatbot).
 * iPhone / iPad / iPadOS stay as a normal browser — no requestFullscreen.
 */

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };
type FullscreenRoot = HTMLElement & { webkitRequestFullscreen?: () => void };

export function isIos(input?: { userAgent?: string; platform?: string; maxTouchPoints?: number }): boolean {
  const ua = input?.userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  const platform = input?.platform ?? (typeof navigator === 'undefined' ? '' : navigator.platform);
  const touches = input?.maxTouchPoints ?? (typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints);
  return platform === 'MacIntel' && touches > 1;
}

function wantsFullscreen(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (isIos()) return false;
  try {
    if (new URLSearchParams(window.location.search).has('kiosk')) return true;
  } catch {
    /* ignore */
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return false;
  if (window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return false;
  return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
}

function isFullscreen(): boolean {
  const doc = document as FullscreenDocument;
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

/** Must run inside the tap. A delay drops the user-gesture token. */
export function enterFullscreen(): void {
  if (!wantsFullscreen() || isFullscreen()) return;
  const el = document.documentElement as FullscreenRoot;
  if (el.requestFullscreen) {
    void el.requestFullscreen({ navigationUI: 'hide' }).then(
      () => {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (mode: 'portrait') => Promise<void>;
        };
        void orientation.lock?.('portrait').catch(() => undefined);
      },
      () => undefined,
    );
    return;
  }
  el.webkitRequestFullscreen?.();
}

export function installFullscreen(): () => void {
  if (!wantsFullscreen()) return () => undefined;
  const onPointerUp = () => enterFullscreen();
  document.addEventListener('pointerup', onPointerUp);
  return () => document.removeEventListener('pointerup', onPointerUp);
}

const CHAT_SOUND_STORAGE_KEY = 'wibestore_chat_sound_enabled';
const CHAT_SOUND_CHANGED_EVENT = 'wibestore-chat-sound-changed';

let unlocked = false;
let lastPlayedAt = 0;

function getStored() {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(CHAT_SOUND_STORAGE_KEY);
    if (v === null) return true;
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

/**
 * Chat ovozlari yoqilganmi (default: true).
 */
export function isChatSoundEnabled() {
  return getStored();
}

/**
 * Chat ovozini yoqish/o'chirish. UI sinxronlash uchun event yuboradi.
 */
export function setChatSoundEnabled(enabled) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAT_SOUND_STORAGE_KEY, enabled ? '1' : '0');
    window.dispatchEvent(new CustomEvent(CHAT_SOUND_CHANGED_EVENT, { detail: { enabled } }));
  } catch {
    // ignore
  }
}

export function getChatSoundChangedEventName() {
  return CHAT_SOUND_CHANGED_EVENT;
}

function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

/**
 * Unlock audio playback on first user gesture.
 * Browsers block autoplay audio until user interacts.
 */
export function ensureSoundUnlocked() {
  if (typeof window === 'undefined') return;
  if (unlocked) return;

  const unlock = async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      // Resume context (required in many browsers)
      await ctx.resume?.();
      // Play a near-silent tick to finalize unlock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.frequency.value = 440;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
      unlocked = true;
      setTimeout(() => ctx.close?.(), 50);
    } catch {
      // ignore
    } finally {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    }
  };

  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

/**
 * Play short "ding" notification sound.
 * Uses WebAudio (no asset files needed).
 */
export function playChatNotificationSound() {
  if (typeof window === 'undefined') return;
  if (!getStored()) return;
  const now = Date.now();
  if (now - lastPlayedAt < 1500) return; // throttle
  lastPlayedAt = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);

    // Close context to avoid leaking audio nodes
    osc.onended = () => {
      try { ctx.close?.(); } catch { /* ignore */ }
    };
  } catch {
    // ignore
  }
}

/**
 * Ovoz: umumiy bildirishnoma (masalan akkaunt tasdiqlandi).
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastPlayedAt < 2000) return;
  lastPlayedAt = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    osc.onended = () => {
      try { ctx.close?.(); } catch { /* ignore */ }
    };
  } catch {
    // ignore
  }
}

/**
 * Play a different sound for background (when not in chat page).
 */
export function playChatBackgroundSound() {
  if (typeof window === 'undefined') return;
  if (!getStored()) return;
  const now = Date.now();
  if (now - lastPlayedAt < 1500) return; // throttle
  lastPlayedAt = now;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    // slightly lower / "different" tone than in-chat
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(390, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    osc.onended = () => {
      try { ctx.close?.(); } catch { /* ignore */ }
    };
  } catch {
    // ignore
  }
}


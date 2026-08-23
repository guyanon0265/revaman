// persistence.js — saves gameState/runtimeState to localStorage and
// restores them on load, so a page reload doesn't lose the game.
//
// gameState/clientState/runtimeState are `export const` objects that
// every other module already holds a reference to — loadPersistedState
// mutates their existing fields in place rather than reassigning them,
// since a reassignment here wouldn't be visible anywhere else in the app.

import { onStateChanged } from './network/stateChangeBus.js';
import { gameState, clientState, runtimeState } from './state.js';

const STORAGE_KEY = 'revaman-game-state';
const SAVE_DEBOUNCE_MS = 300;

// socket is a live connection object — not serializable, and meaningless
// after reload anyway, since a fresh page load always needs a fresh
// socket. Excluded explicitly rather than relying on JSON.stringify to
// skip it silently (it wouldn't — it'd throw on circular refs instead).
const PERSISTED_RUNTIME_KEYS = [
  'mode',
  'mySlot',
  'oppSlot',
  'roomId',
  'isSpectator',
  'myUsername',
  'usernames',
  'cardbacks',
];

function serialize() {
  const runtime = {};
  for (const key of PERSISTED_RUNTIME_KEYS) runtime[key] = runtimeState[key];
  return JSON.stringify({ version: 1, gameState, runtime });
}

let saveTimer = null;

// Debounced — call this from wherever the app already re-renders after
// a mutation (e.g. renderEntireBoard), without worrying about hammering
// localStorage on rapid-fire actions.
export function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize());
    } catch {
      // Storage full/unavailable — game keeps running in-memory, it
      // just won't survive a reload this time.
    }
  }, SAVE_DEBOUNCE_MS);
}

// Bypasses the debounce for pagehide/beforeunload, where a pending
// setTimeout would never get the chance to fire.
export function saveStateImmediately() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, serialize());
  } catch {
    // see saveState()
  }
}

export function clearPersistedState() {
  clearTimeout(saveTimer);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasPersistedState() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadPersistedState() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearPersistedState(); // corrupt entry — don't let it wedge every future load
    return false;
  }

  if (
    !parsed ||
    parsed.version !== 1 ||
    !parsed.gameState?.zones ||
    !parsed.runtime
  ) {
    return false;
  }

  for (const zoneId of Object.keys(gameState.zones)) {
    gameState.zones[zoneId] = Array.isArray(parsed.gameState.zones[zoneId])
      ? parsed.gameState.zones[zoneId]
      : [];
  }

  for (const key of PERSISTED_RUNTIME_KEYS) {
    if (key in parsed.runtime) runtimeState[key] = parsed.runtime[key];
  }
  runtimeState.socket = null; // never restored — see comment above

  // Selection describes what overlay is open on THIS tab, not anything
  // about the game — the DOM it points at (a highlighted thumbnail, an
  // open Card View) doesn't exist yet after a fresh page load.
  clientState.selectedInstanceId = null;
  clientState.selectedZone = null;
  clientState.selectedKind = null;
  clientState.selectedParentId = null;

  return true;
}

export function initPersistence() {
  onStateChanged(saveState);
}

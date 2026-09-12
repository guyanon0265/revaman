import { onStateChanged } from './network/stateChangeBus.js';
import { gameState, clientState, runtimeState } from './state.js';

const STORAGE_KEY = 'revaman-game-state';
const SAVE_DEBOUNCE_MS = 300;
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

export function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize());
    } catch {
      return null;
    }
  }, SAVE_DEBOUNCE_MS);
}

export function saveStateImmediately() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, serialize());
  } catch {
    return null;
  }
}

export function clearPersistedState() {
  clearTimeout(saveTimer);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
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
    clearPersistedState();
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
  runtimeState.socket = null;

  clientState.selectedInstanceId = null;
  clientState.selectedZone = null;
  clientState.selectedKind = null;
  clientState.selectedParentId = null;

  return true;
}

export function initPersistence() {
  onStateChanged(saveState);
}

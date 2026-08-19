// sidebar/multiplayer/initMultiplayer.js — wiring for the Online tab's
// join form (#mp-username / #mp-room / #mp-join-btn) and the Reset
// section's #btn-exit-room.
//
// NOTE on path: inferred, not confirmed — same caveat as
// gameboard/ui/gameActions.js and soloActions.js. Adjust the relative
// import path to networkSync.js below if this file's real location
// differs.

import { joinRoom, leaveRoom } from '../../../networkSync.js';
import { settings } from './settingsZone.js';

const CODE_LENGTH = 7;
const RESET_DELAY_MS = 2000;

let resetTimer = null;

function generateRoomCode() {
  const uuid = crypto.randomUUID().replace(/-/g, ''); // 32 hex chars, 128 bits
  const asBase36 = BigInt('0x' + uuid)
    .toString(36)
    .toUpperCase();

  // toString(36) on a 128-bit value yields ~25 chars — take the first 7.
  // Pad defensively in the astronomically unlikely case base36 comes out
  // short (would require a UUID close to all-zero).
  return asBase36.slice(0, CODE_LENGTH).padEnd(CODE_LENGTH, '0');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can reject (no permission, insecure context, etc.) —
    // the room ID still gets filled into the input either way, so this
    // failing isn't fatal, just means the user copies it manually.
    return false;
  }
}

export function initMultiplayerPanel() {
  const joinBtn = document.getElementById('mp-join-btn');
  const generateBtn = document.getElementById('mp-generate-id-btn');
  const usernameInput = document.getElementById('mp-username');
  const roomInput = document.getElementById('mp-room');
  const exitBtn = document.getElementById('btn-exit-room');

  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      const room = roomInput?.value.trim();
      const username = usernameInput?.value.trim() || 'Player';
      if (!room) return; // nothing to join without a room id
      joinRoom(room, username, settings.allowSpectators);
    });
  }

  if (generateBtn && roomInput) {
    const originalLabel = generateBtn.textContent;

    generateBtn.addEventListener('click', async () => {
      const code = generateRoomCode();
      roomInput.value = code;

      await copyToClipboard(code);

      if (resetTimer) clearTimeout(resetTimer);

      generateBtn.textContent = 'Copied';
      resetTimer = setTimeout(() => {
        generateBtn.textContent = originalLabel;
        resetTimer = null;
      }, RESET_DELAY_MS);
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      leaveRoom();
    });
  }
}

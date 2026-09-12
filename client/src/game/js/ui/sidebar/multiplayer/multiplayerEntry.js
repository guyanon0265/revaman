import { joinRoom, leaveRoom } from '../../../networkSync.js';
import { settings } from './settingsZone.js';

const CODE_LENGTH = 7;
const RESET_DELAY_MS = 2000;

let resetTimer = null;

function generateRoomCode() {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  const asBase36 = BigInt('0x' + uuid)
    .toString(36)
    .toUpperCase();
  return asBase36.slice(0, CODE_LENGTH).padEnd(CODE_LENGTH, '0');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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
      if (!room) return;
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

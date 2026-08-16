// sidebar/multiplayer/initMultiplayer.js — wiring for the Online tab's
// join form (#mp-username / #mp-room / #mp-join-btn) and the Reset
// section's #btn-exit-room.
//
// NOTE on path: inferred, not confirmed — same caveat as
// gameboard/ui/gameActions.js and soloActions.js. Adjust the relative
// import path to networkSync.js below if this file's real location
// differs.

import { joinRoom, leaveRoom } from '../../networkSync.js';

export function initMultiplayerPanel() {
  const joinBtn = document.getElementById('mp-join-btn');
  const usernameInput = document.getElementById('mp-username');
  const roomInput = document.getElementById('mp-room');
  const exitBtn = document.getElementById('btn-exit-room');

  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      const room = roomInput?.value.trim();
      const username = usernameInput?.value.trim() || 'Player';
      if (!room) return; // nothing to join without a room id
      joinRoom(room, username);
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      leaveRoom();
    });
  }
}

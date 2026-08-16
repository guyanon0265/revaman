// multiplayer/networkSync.js — client side of the state-push relay.
//
// This module's only job: turn local mutations into outgoing 'state'
// pushes, and turn incoming 'state' pushes into local gameState
// updates, matching server.js's event protocol exactly (join / joined /
// join-error / peer-joined / peer-left / state). It has zero game-rule
// knowledge — engine.js/loggingEngine.js are the only things that ever
// construct or interpret game state; this module just moves
// gameState.zones over the wire.
//
// KNOWN LIMITATION, not fixed by the sequence numbers below: they
// guarantee every client applies concurrent pushes in the SAME relative
// order as each other (an ordering guarantee). They do NOT prevent a
// remote push from silently overwriting a local mutation that hasn't
// been broadcast yet, if the remote push's snapshot was taken before
// that local mutation happened — a lost-update problem, a different
// failure mode than an ordering problem. Under normal two-person play
// this window is a single round-trip. This was an accepted tradeoff
// from the server-authoritative-vs-relay design discussion, not an
// oversight — full server-authoritative state is the only way to close
// it completely, and was deliberately not chosen here.

import { io } from 'socket.io-client';
import { gameState, runtimeState } from './gameboard/logic/state.js';
import { onStateChanged } from './gameboard/logic/stateChangeBus.js';
import { renderEntireBoard } from './gameboard/ui/render.js';
import { closeAllOverlays } from './sidebar/actions/gameActions.js';
import { onLogChanged } from './gameboard/logic/logChangeBus.js';
import { onChatChanged } from './gameboard/logic/chatChangeBus.js';
import { GameLogger } from './sidebar/chat/chatlog.js';

let lastAppliedSeq = 0;

function setStatus(text) {
  const statusEl = document.getElementById('mp-status');
  if (statusEl) statusEl.textContent = text;
}

function sendState() {
  if (runtimeState.mode !== 'multiplayer' || !runtimeState.socket) return;
  runtimeState.socket.emit('state', {
    zones: gameState.zones,
    cardbacks: runtimeState.cardbacks,
  });
}

function applyIncomingState({ seq, zones, cardbacks }) {
  if (seq <= lastAppliedSeq) return;
  lastAppliedSeq = seq;

  gameState.zones = zones;
  if (cardbacks) runtimeState.cardbacks = cardbacks;

  closeAllOverlays();
  renderEntireBoard();
}

export function joinRoom(room, username) {
  if (runtimeState.socket) return; // already connected — one connection per session

  const socket = io();
  runtimeState.socket = socket;
  setStatus('Connecting…');

  socket.on('connect', () => {
    socket.emit('join', { room, username });
  });

  socket.on('joined', ({ slot, peers }) => {
    runtimeState.mode = 'multiplayer';
    runtimeState.mySlot = slot;
    runtimeState.oppSlot = slot === 'p1' ? 'p2' : 'p1';
    runtimeState.usernames[slot] = username;
    if (peers && Array.isArray(peers)) {
      peers.forEach((p) => {
        runtimeState.usernames[p.slot] = p.username;
      });
    }
    lastAppliedSeq = 0;
    setStatus(
      `Connected as ${slot === 'p1' ? 'Player 1' : 'Player 2'} in room "${room}".`
    );
    GameLogger.logSystem(
      `You joined the room as ${slot === 'p1' ? 'Player 1' : 'Player 2'}.`
    );
  });

  socket.on('join-error', ({ message }) => {
    setStatus(`Couldn't join: ${message}`);
    socket.disconnect();
    runtimeState.socket = null;
  });

  socket.on('peer-joined', ({ username: peerUsername, slot: peerSlot }) => {
    runtimeState.usernames[peerSlot] = peerUsername;
    sendState();
    setStatus('Opponent connected.');
    GameLogger.logSystem(`${peerUsername} joined the room.`);
  });

  socket.on('peer-left', () => {
    setStatus('Opponent disconnected.');
    GameLogger.logSystem(
      `${runtimeState.usernames[runtimeState.oppSlot]} left the room.`
    );
  });

  socket.on('state', applyIncomingState);
  socket.on('log', (text) => GameLogger.logAction(runtimeState.oppSlot, text));
  socket.on('chat', (text) => GameLogger.logChat(runtimeState.oppSlot, text));

  socket.on('disconnect', () => {
    runtimeState.socket = null;
    setStatus('Disconnected.');
    // Deliberately NOT reverting runtimeState.mode/mySlot/oppSlot here —
    // matches server.js's own no-persistence stance. Manual export/
    // import is the accepted fallback for state loss, not automatic
    // reconnect/resume.
  });
}

export function leaveRoom() {
  if (!runtimeState.socket) return;
  GameLogger.logSystem('You left the room.');

  runtimeState.socket.disconnect();
  runtimeState.socket = null;
  runtimeState.mode = 'solo';
  runtimeState.mySlot = 'p1';
  runtimeState.oppSlot = 'p2';
  setStatus('Not connected');
}

// Every successful gameState mutation (loggingEngine.js) and every
// undo/redo restore (undoManager.js) emits through this same bus — see
// stateChangeBus.js. This is the ONLY place those events turn into
// network traffic; loggingEngine.js and undoManager.js have no idea
// networking exists, and never need to.
onStateChanged(sendState);

onLogChanged((text) => {
  if (runtimeState.mode !== 'multiplayer' || !runtimeState.socket) return;
  runtimeState.socket.emit('log', text);
});

onChatChanged((text) => {
  if (runtimeState.mode !== 'multiplayer' || !runtimeState.socket) return;
  runtimeState.socket.emit('chat', text);
});

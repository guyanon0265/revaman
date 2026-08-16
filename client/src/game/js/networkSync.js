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

// Placeholder — point this at your actual deployed relay. Matches
// server.js's default PORT for local dev out of the box.
const RELAY_URL = 'http://localhost:8080';

let lastAppliedSeq = 0;

function setStatus(text) {
  const statusEl = document.getElementById('mp-status');
  if (statusEl) statusEl.textContent = text;
}

function sendState() {
  if (runtimeState.mode !== 'multiplayer' || !runtimeState.socket) return;
  runtimeState.socket.emit('state', gameState.zones);
}

function applyIncomingState({ seq, zones }) {
  if (seq <= lastAppliedSeq) return; // stale relative to what we've already applied — discard
  lastAppliedSeq = seq;

  gameState.zones = zones;

  // A remote push can invalidate any locally-open overlay just as
  // drastically as an undo/redo restore can — same treatment.
  closeAllOverlays();
  renderEntireBoard();
}

export function joinRoom(room, username) {
  if (runtimeState.socket) return; // already connected — one connection per session

  const socket = io(RELAY_URL);
  runtimeState.socket = socket;
  setStatus('Connecting…');

  socket.on('connect', () => {
    socket.emit('join', { room, username });
  });

  socket.on('joined', ({ slot }) => {
    runtimeState.mode = 'multiplayer';
    runtimeState.mySlot = slot;
    runtimeState.oppSlot = slot === 'p1' ? 'p2' : 'p1';
    lastAppliedSeq = 0; // fresh room, relative to this session — matches server.js's own no-persistence stance
    setStatus(
      `Connected as ${slot === 'p1' ? 'Player 1' : 'Player 2'} in room "${room}".`
    );
  });

  socket.on('join-error', ({ message }) => {
    setStatus(`Couldn't join: ${message}`);
    socket.disconnect();
    runtimeState.socket = null;
  });

  socket.on('peer-joined', () => {
    // Someone just joined an already-in-progress room — catch them up.
    // The relay holds no state of its own to replay for them; this is
    // the peer-cooperation substitute (see server.js's own header).
    sendState();
    setStatus('Opponent connected.');
  });

  socket.on('peer-left', () => {
    setStatus('Opponent disconnected.');
  });

  socket.on('state', applyIncomingState);

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

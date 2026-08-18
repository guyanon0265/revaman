// server.js — RevaMan multiplayer relay.
//
// Game-rule-agnostic: never imports or runs engine.js. Per-room state is
// limited to what the RELAY itself needs — a sequence counter, undo/redo
// history, the current snapshot, and now role/spectator bookkeeping —
// never anything engine.js would recognize as game logic. Clients always
// push full { zones, cardbacks } snapshots; this server never diffs or
// validates them, just orders and stores them.
//
// SPECTATORS: a room's first joiner sets that room's allowSpectators
// policy for its entire lifetime (from their join payload) — later
// joiners can't retroactively change it, which avoids needing any kind
// of live-settings-update broadcast mid-game. Once both player slots
// (p1/p2) are filled, a further joiner is admitted as a 'spectator' only
// if the room allows it; otherwise rejected the same as room-full always
// was. Spectators can chat freely but are blocked, server-side, from
// 'state' / 'undo' / 'redo' / 'log' — this is the actual enforcement
// boundary; nothing about client-side UI is trusted to be the only thing
// stopping them.
//
// PROTOCOL: chat/log/peer-left now carry sender identity STAMPED BY THE
// SERVER from socket.data, not trusted from whatever the client sends.
// Previously each client assumed any incoming chat/log was from "my
// opponent" — true only because exactly 2 participants were ever
// possible. That assumption is gone now that a 3rd+ role exists; a
// spectator has no single "opponent," and misattributing a spectator's
// chat to a player would just be wrong.
//
// UNDO/REDO IS SERVER-AUTHORITATIVE (previously client-local, which
// caused each client to accumulate a different history and let a local
// undo silently discard the other client's actions). The server holds
// ONE undo/redo stack per room; clients request 'undo'/'redo' and wait
// for the resulting 'state' broadcast rather than computing anything
// locally. See undoManager.js on the client — pushSnapshot() is a no-op
// whenever runtimeState.mode === 'multiplayer'.
//
// Clients discard any incoming 'state' whose seq isn't greater than the
// last one they've applied. This guarantees every client applies
// concurrent pushes in the same relative order as each other — it does
// NOT prevent a slightly-stale remote push from overwriting a
// not-yet-broadcast local mutation (an accepted tradeoff, not an
// oversight; see the client-side networkSync module for the longer
// explanation of why full server-authoritative GAME STATE, as opposed to
// just history/sequence, was deliberately not chosen here).
//
// No reconnect/resume support and no room persistence beyond the life of
// the room: a room's state lives only as long as at least one client
// (player OR spectator) holds a connection alive server-side. If a room
// empties out entirely, it's forgotten — the next join to that same room
// id starts fresh. Manual export/import is the accepted fallback for
// state loss, not something this relay tries to solve.

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import bcrypt from 'bcryptjs';
import { PORT } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.join(__dirname, '../../client/src/game');
const ASSETS_DIR = path.join(__dirname, '../../client/src/assets');
const BUILDER_DIR = path.join(__dirname, '../../client/src/deck');

const MAX_PLAYERS_PER_ROOM = 2; // p1/p2 only — this cap never includes spectators, who are uncapped by default

// ---------------------------------------------------------------------
// CORS — two distinct origins need access, for two distinct reasons:
//  1. https://admin.socket.io — the hosted Admin UI dashboard. Fixed,
//     required exactly as-is by the Admin UI itself.
//  2. wherever the actual game client is served from. CLIENT_ORIGIN
//     below is a placeholder — set it via env var to match your real
//     frontend's origin (or extend the array if you need more than one,
//     e.g. a local dev origin AND a deployed one).
// credentials: true is required for the Admin UI's auth to work, which
// means origin can't be '*' (the CORS spec disallows combining a
// wildcard origin with credentials) — hence an explicit array instead.
// ---------------------------------------------------------------------
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const app = express();
const server = http.createServer(app);

app.use(express.static(CLIENT_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/deck', express.static(BUILDER_DIR));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (origin === 'https://admin.socket.io') return callback(null, true);
      // No CLIENT_ORIGIN configured -> reflect back whatever origin
      // asked. Convenient for local dev regardless of which port/tool
      // you're serving game.html from, but NOT safe for production —
      // set CLIENT_ORIGIN before deploying anywhere real, which locks
      // this down to that one exact origin instead.
      if (!CLIENT_ORIGIN) return callback(null, true);
      if (origin === CLIENT_ORIGIN) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

// ---------------------------------------------------------------------
// Admin UI (https://admin.socket.io) — lets you watch rooms/connections
// live while testing. Password is bcrypt-hashed rather than stored in
// plaintext, per the Admin UI's own documented setup.
//
// Set ADMIN_UI_PASSWORD_HASH in the environment to the OUTPUT of:
//   node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
// Run that once, offline, and put the resulting hash string in the env
// var — never the plaintext password itself.
//
// Falls back to a hash of a clearly-fake placeholder password if unset,
// purely so this doesn't crash on a first run with no env configured.
// Replace ADMIN_UI_PASSWORD_HASH before deploying anywhere real; the
// fallback below is not a real credential, it's a "you forgot to set
// this" tripwire.
// ---------------------------------------------------------------------
const ADMIN_UI_USERNAME = process.env.ADMIN_UI_USERNAME || 'admin';
const ADMIN_UI_PASSWORD_HASH =
  process.env.ADMIN_UI_PASSWORD_HASH ||
  bcrypt.hashSync('change-me-before-deploying', 10);

instrument(io, {
  auth: {
    type: 'basic',
    username: ADMIN_UI_USERNAME,
    password: ADMIN_UI_PASSWORD_HASH,
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
});

// ---------------------------------------------------------------------
// Room bookkeeping — roomId -> { seq, playerCount, spectatorCount,
// allowSpectators, currentState, undoStack, redoStack }. Still not
// "gameState" in the engine.js sense — currentState is just the last
// { zones, cardbacks } payload a PLAYER pushed, stored opaquely; this
// server never looks inside it. undoStack/redoStack hold the SAME kind
// of opaque payloads. seq orders everything (pushes AND undo/redo
// results) on one shared per-room counter. playerCount enforces the
// 2-player cap; spectatorCount is tracked separately and uncapped.
// Actual message routing (who's in which room) is handled by Socket.io's
// own room feature (socket.join / io.to / socket.to), not tracked here
// separately — role-based FILTERING of who's allowed to send what is
// the only thing this file adds on top of that.
// ---------------------------------------------------------------------
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      seq: 0,
      playerCount: 0,
      spectatorCount: 0,
      allowSpectators: false,
      currentState: null,
      undoStack: [],
      redoStack: [],
    });
  }
  return rooms.get(roomId);
}

function isPlayer(socket) {
  return socket.data.slot === 'p1' || socket.data.slot === 'p2';
}

io.on('connection', (socket) => {
  let joinedRoomId = null;

  socket.on('join', ({ room, username, allowSpectators } = {}) => {
    if (!room) return;
    if (joinedRoomId) return;

    const roomState = getRoom(room);

    // Only the very first participant into a brand-new room sets its
    // spectator policy — everyone after that just inherits it.
    if (roomState.playerCount === 0 && roomState.spectatorCount === 0) {
      roomState.allowSpectators = !!allowSpectators;
    }

    let slot;
    if (roomState.playerCount < MAX_PLAYERS_PER_ROOM) {
      slot = roomState.playerCount === 0 ? 'p1' : 'p2';
      roomState.playerCount += 1;
    } else if (roomState.allowSpectators) {
      slot = 'spectator';
      roomState.spectatorCount += 1;
    } else {
      socket.emit('join-error', { message: 'Room is full.' });
      return;
    }

    joinedRoomId = room;

    socket.join(room);
    socket.data.room = room;
    socket.data.slot = slot;
    socket.data.username = username;

    // Hand the newcomer everyone already in the room, by slot — the
    // newcomer's own 'joined' response is the only place this info can
    // travel, since 'peer-joined' only ever reaches EXISTING members.
    // This now naturally includes spectators (slot: 'spectator') too,
    // since it just walks the shared Socket.io room membership rather
    // than tracking players and spectators through separate lists.
    const peers = [];
    for (const socketId of io.sockets.adapter.rooms.get(room) || []) {
      const peerSocket = io.sockets.sockets.get(socketId);
      if (peerSocket && peerSocket !== socket) {
        peers.push({
          slot: peerSocket.data.slot,
          username: peerSocket.data.username,
        });
      }
    }

    // Also hand the newcomer the room's CURRENT state directly, plus the
    // seq it's at — replaces the old design where an existing client
    // had to notice 'peer-joined' and manually re-broadcast its own
    // state as a catch-up.
    socket.emit('joined', {
      slot,
      peers,
      seq: roomState.seq,
      current: roomState.currentState,
    });
    socket.to(room).emit('peer-joined', { username, slot });
  });

  socket.on('state', (payload) => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) {
      socket.emit('spectator-error', {
        message: 'Spectators cannot affect the game.',
      });
      return;
    }

    const room = getRoom(joinedRoomId);

    if (room.currentState) room.undoStack.push(room.currentState);
    room.redoStack = []; // a real new action invalidates any pending redo
    room.currentState = payload;
    room.seq += 1;

    socket.to(joinedRoomId).emit('state', { seq: room.seq, ...payload });
  });

  socket.on('undo', () => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) {
      socket.emit('spectator-error', {
        message: 'Spectators cannot affect the game.',
      });
      return;
    }

    const room = getRoom(joinedRoomId);

    if (room.undoStack.length === 0) {
      socket.emit('undo-error', { message: 'Nothing to undo.' });
      return;
    }

    room.redoStack.push(room.currentState);
    room.currentState = room.undoStack.pop();
    room.seq += 1;

    // Unlike 'state', this goes to EVERYONE including the requester —
    // the requester doesn't already know what the prior state was, the
    // server had to compute that for them.
    io.to(joinedRoomId).emit('state', { seq: room.seq, ...room.currentState });
  });

  socket.on('redo', () => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) {
      socket.emit('spectator-error', {
        message: 'Spectators cannot affect the game.',
      });
      return;
    }

    const room = getRoom(joinedRoomId);

    if (room.redoStack.length === 0) {
      socket.emit('redo-error', { message: 'Nothing to redo.' });
      return;
    }

    room.undoStack.push(room.currentState);
    room.currentState = room.redoStack.pop();
    room.seq += 1;

    io.to(joinedRoomId).emit('state', { seq: room.seq, ...room.currentState });
  });

  socket.on('chat', (payload) => {
    if (!joinedRoomId) return;
    // No role gate — spectators are explicitly allowed to chat.
    socket.to(joinedRoomId).emit('chat', {
      slot: socket.data.slot,
      username: socket.data.username,
      text: payload?.text,
    });
  });

  socket.on('log', (payload) => {
    if (!joinedRoomId) return;
    if (!isPlayer(socket)) {
      // No error emit here, unlike state/undo/redo — a spectator client
      // has no legitimate way to ever construct a 'log' event at all
      // (it only ever fires from loggingEngine.js's own successful
      // mutations, which are already blocked above), so reaching this
      // branch would mean something other than the normal UI flow sent
      // it. Silent drop is correct; there's no honest error message for
      // "you did something the client shouldn't be able to do."
      return;
    }
    socket.to(joinedRoomId).emit('log', {
      slot: socket.data.slot,
      text: payload?.text,
    });
  });

  socket.on('disconnect', () => {
    if (!joinedRoomId) return;
    const roomState = rooms.get(joinedRoomId);
    if (!roomState) return;

    if (isPlayer(socket)) {
      roomState.playerCount = Math.max(0, roomState.playerCount - 1);
    } else {
      roomState.spectatorCount = Math.max(0, roomState.spectatorCount - 1);
    }

    if (roomState.playerCount === 0 && roomState.spectatorCount === 0) {
      rooms.delete(joinedRoomId); // no persistence — the room is fully forgotten once completely empty
    }

    socket.to(joinedRoomId).emit('peer-left', {
      slot: socket.data.slot,
      username: socket.data.username,
    });
  });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'game.html'));
});

server.listen(PORT, () => {
  console.log(`RevaMan relay listening on port ${PORT}`);
});

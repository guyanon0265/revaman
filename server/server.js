// server.js — RevaMan multiplayer relay.
//
// Deliberately dumb about game rules: never imports or runs engine.js,
// holds no gameState beyond a per-room sequence counter + membership
// count. Stamps each incoming 'state' push with the next sequence
// number for that room and relays it to every OTHER socket in the room.
// Clients discard any incoming push whose seq isn't greater than the
// last one they've applied. This guarantees every client applies
// concurrent pushes in the same relative order as each other — it does
// NOT prevent a slightly-stale remote push from overwriting a
// not-yet-broadcast local mutation (an accepted tradeoff, not an
// oversight; see the client-side networkSync module for the longer
// explanation of why full server-authoritative state was deliberately
// not chosen here).
//
// No reconnect/resume support and no room persistence: a room's state
// lives only in whichever clients currently hold it. If a room empties
// out, it's forgotten entirely — the next join to that same room id
// starts fresh. Manual export/import is the accepted fallback for state
// loss, not something this relay tries to solve.

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 8080;
const MAX_CLIENTS_PER_ROOM = 2; // this is a 2-player game; a 3rd join attempt is rejected, not queued as a spectator

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
// Room bookkeeping — roomId -> { seq, size }. This is the ONLY state
// this relay holds, and neither field is gameState: seq is a counter
// for ordering pushes, size just enforces the 2-client cap. Actual
// message routing (who's in which room) is handled by Socket.io's own
// room feature (socket.join / io.to), not tracked here separately.
// ---------------------------------------------------------------------
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { seq: 0, size: 0 });
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  let joinedRoomId = null;

  socket.on('join', ({ room, username } = {}) => {
    if (!room) return;
    if (joinedRoomId) return; // already joined a room on this connection — ignore a second join attempt

    const roomState = getRoom(room);

    if (roomState.size >= MAX_CLIENTS_PER_ROOM) {
      socket.emit('join-error', { message: 'Room is full.' });
      return;
    }

    const slot = roomState.size === 0 ? 'p1' : 'p2';
    roomState.size += 1;
    joinedRoomId = room;

    socket.join(room);
    socket.data.room = room;
    socket.data.slot = slot;
    socket.data.username = username;

    socket.emit('joined', { slot });

    // Let whoever's already in the room know someone new arrived, so
    // THEY can push a full-state catch-up broadcast — this relay holds
    // no game state of its own to replay for the newcomer.
    socket.to(room).emit('peer-joined', { username, slot });
  });

  socket.on('state', (zones) => {
    if (!joinedRoomId) return; // never joined a room — ignore silently, don't trust an unjoined socket
    const roomState = getRoom(joinedRoomId);
    roomState.seq += 1;
    socket.to(joinedRoomId).emit('state', { seq: roomState.seq, zones });
  });

  socket.on('disconnect', () => {
    if (!joinedRoomId) return;
    const roomState = rooms.get(joinedRoomId);
    if (!roomState) return;

    roomState.size = Math.max(0, roomState.size - 1);
    if (roomState.size === 0) rooms.delete(joinedRoomId); // no persistence — the room is fully forgotten once empty

    socket.to(joinedRoomId).emit('peer-left', { slot: socket.data.slot });
  });
});

app.get('/', (_req, res) => {
  res.send('RevaMan relay is running.');
});

server.listen(PORT, () => {
  console.log(`RevaMan relay listening on port ${PORT}`);
});

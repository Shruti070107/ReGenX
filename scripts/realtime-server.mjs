import express from 'express';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { VALID_ROLES, isWriteAuthorized } from './realtime-writes-auth.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const stateFile = path.join(rootDir, 'data', 'realtime-state.json');
const PORT = Number(process.env.PORT || 4173);
const ALLOWED_ORIGINS = new Set(
  String(process.env.ALLOWED_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
let REALTIME_AUTH_TOKEN = String(process.env.REALTIME_AUTH_TOKEN || '');

if (!REALTIME_AUTH_TOKEN) {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  REALTIME_AUTH_TOKEN = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  console.warn('[realtime] No REALTIME_AUTH_TOKEN set. Generated a temporary token for this session.');
  console.warn('[realtime] Set REALTIME_AUTH_TOKEN in .env for a persistent token.');
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

// Server-side session registry.  Populated by session:join events and
// consulted by the write-authorization check in the operational:event handler.
// Never derived from the payload of the event being authorized.
const socketSessions = new Map();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by realtime server CORS policy'));
    },
    credentials: true
  }
});

io.use((socket, next) => {
  if (!REALTIME_AUTH_TOKEN) {
    next(new Error('Realtime authentication is not configured'));
    return;
  }

  const authToken =
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.['x-realtime-token'];

  if (authToken !== REALTIME_AUTH_TOKEN) {
    next(new Error('Unauthorized realtime connection'));
    return;
  }

  next();
});

const initialState = {
  version: 1,
  records: {}
};

let state = { ...initialState };

async function loadState() {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.records) {
      state = {
        version: Number(parsed.version || 1),
        records: parsed.records
      };
    }
  } catch {
    state = { ...initialState };
  }
}

async function persistState() {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

function broadcastToRooms(payload) {
  const rooms = Array.from(new Set([...(payload.rooms || []), 'network_room']));
  rooms.forEach((room) => {
    io.to(room).emit('sync:patch', payload);
  });
}

/**
 * Apply a list of state updates, enforcing write-authorization for each key.
 * Updates that do not pass the ownership check are silently dropped and
 * logged.  The version counter is incremented only when at least one update
 * was accepted.
 *
 * @param {Array}  updates   - Array of { key, value, action } objects.
 * @param {string} socketId  - ID of the socket that submitted the payload.
 * @returns {number} Count of accepted updates.
 */
function applyUpdates(updates = [], socketId = null) {
  const session = socketId ? socketSessions.get(socketId) : null;
  let accepted = 0;
  const rejected = [];

  updates.forEach((update) => {
    if (!update || !update.key) return;

    if (!isWriteAuthorized(session, update.key)) {
      rejected.push(update.key);
      return;
    }

    if (update.action === 'remove' || typeof update.value === 'undefined') {
      delete state.records[update.key];
    } else {
      state.records[update.key] = update.value;
    }
    accepted++;
  });

  if (accepted > 0) state.version += 1;

  if (rejected.length > 0) {
    const sessionDesc = session
      ? `role=${session.role} id=${session.sessionId}`
      : 'no-session';
    console.warn(
      `[realtime] Rejected ${rejected.length} unauthorized write(s) ` +
      `from socket ${socketId} (${sessionDesc}): ${rejected.join(', ')}`
    );
  }

  return accepted;
}

app.use(express.static(rootDir, { extensions: ['html'] }));

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.__REALTIME_CONFIG__ = ${JSON.stringify({ token: REALTIME_AUTH_TOKEN })};`);
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, version: state.version });
});

io.on('connection', (socket) => {
  socket.emit('sync:snapshot', { version: state.version, records: state.records });

  socket.on('session:join', ({ session, rooms = [] } = {}) => {
    // Store a server-side copy of the session so the write-authorization
    // check can use it without trusting later payloads.
    const role      = VALID_ROLES.has(session?.role) ? session.role : null;
    const sessionId = typeof session?.id === 'string' && session.id
      ? session.id
      : null;
    socketSessions.set(socket.id, { role, sessionId });

    const joinedRooms = new Set(['network_room', ...(rooms || [])]);
    if (session?.role) joinedRooms.add(`${session.role}s_room`);
    if (session?.role) joinedRooms.add(`${session.role}_room`);
    if (session?.id) joinedRooms.add(`session:${session.id}`);
    joinedRooms.forEach((room) => socket.join(room));
  });

  socket.on('session:leave', () => {
    socketSessions.delete(socket.id);
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });
  });

  socket.on('snapshot:request', () => {
    socket.emit('sync:snapshot', { version: state.version, records: state.records });
  });

  socket.on('operational:event', async (payload = {}) => {
    const updates = Array.isArray(payload.updates) ? payload.updates : [];

    // No-update broadcasts (notifications, toasts) pass through as before.
    if (!updates.length) {
      broadcastToRooms({
        ...payload,
        sourceId: socket.id,
        version: state.version,
        ts: Date.now()
      });
      return;
    }

    // Apply only the updates that pass ownership validation.
    const accepted = applyUpdates(updates, socket.id);

    // If every update in the payload was rejected, skip persistence and
    // broadcast — there is nothing to propagate.
    if (accepted === 0) return;

    await persistState();

    const response = {
      ...payload,
      sourceId: socket.id,
      version: state.version,
      ts: Date.now()
    };
    broadcastToRooms(response);
  });

  socket.on('disconnect', () => {
    socketSessions.delete(socket.id);
    socket.removeAllListeners();
  });
});

await loadState();

httpServer.listen(PORT, () => {
  console.log(`ReGenX realtime server listening on http://localhost:${PORT}`);
});

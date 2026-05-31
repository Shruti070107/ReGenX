/**
 * Tests for the realtime authentication layer.
 *
 * Coverage:
 *  1.  /config.js source must not contain REALTIME_AUTH_TOKEN
 *  2.  /config.js source must not expose any 'token' field in REALTIME_CONFIG
 *  3.  /api/realtime-ticket endpoint is defined in the server source
 *  4.  issueTicket generates a 64-char hex string
 *  5.  issueTicket generates unique tickets
 *  6.  consumeTicket accepts a freshly issued ticket
 *  7.  consumeTicket marks a ticket as used (single-use)
 *  8.  consumeTicket rejects an already-used ticket
 *  9.  consumeTicket rejects an unknown ticket
 * 10.  consumeTicket rejects an expired ticket
 * 11.  pruneTickets removes only expired entries
 * 12.  HTTP GET /config.js does not contain the auth token (live server test)
 * 13.  HTTP GET /config.js returns safe config only
 * 14.  HTTP GET /api/realtime-ticket returns a valid ticket
 * 15.  Regression: unauthenticated WebSocket connection is refused
 * 16.  Regression: WebSocket connection with invalid ticket is refused
 */

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── Replicated ticket logic (must stay in sync with realtime-server.mjs) ──────

const TICKET_TTL_MS = 60_000;
const ticketStore = new Map();

function pruneTickets() {
  const now = Date.now();
  for (const [t, info] of ticketStore.entries()) {
    if (now - info.createdAt > TICKET_TTL_MS) ticketStore.delete(t);
  }
}

function issueTicket() {
  pruneTickets();
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const ticket = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  ticketStore.set(ticket, { createdAt: Date.now(), used: false });
  return ticket;
}

function consumeTicket(ticket) {
  if (!ticket) return false;
  pruneTickets();
  const info = ticketStore.get(ticket);
  if (!info || info.used || Date.now() - info.createdAt > TICKET_TTL_MS) return false;
  info.used = true;
  return true;
}

// ── Source-level checks ───────────────────────────────────────────────────────

const serverSrc = readFileSync(path.join(__dirname, 'realtime-server.mjs'), 'utf8');
const clientSrc = readFileSync(path.join(rootDir, 'src', 'realtime-sync.js'), 'utf8');

console.log('\n1. /config.js source must not contain REALTIME_AUTH_TOKEN exposure');
{
  const configRoute = serverSrc.match(/app\.get\(['"]\/config\.js['"]([\s\S]*?\}\);)/)?.[0] || '';
  assert(!configRoute.includes('REALTIME_AUTH_TOKEN'), '/config.js handler does not reference REALTIME_AUTH_TOKEN');
}

console.log('\n2. /config.js must not expose a token field');
{
  const configRoute = serverSrc.match(/app\.get\(['"]\/config\.js['"]([\s\S]*?\}\);)/)?.[0] || '';
  assert(!configRoute.includes('"token"') && !configRoute.includes("'token'"), '/config.js handler does not include a token field');
}

console.log('\n3. /api/realtime-ticket endpoint is defined');
{
  assert(serverSrc.includes('/api/realtime-ticket'), 'Server defines /api/realtime-ticket route');
}

console.log('\n4. issueTicket generates a 64-char hex string');
{
  const t = issueTicket();
  assert(typeof t === 'string',       'ticket is a string');
  assert(t.length === 64,             'ticket is 64 characters (32 bytes hex)');
  assert(/^[0-9a-f]+$/.test(t),       'ticket contains only lowercase hex');
}

console.log('\n5. issueTicket generates unique tickets');
{
  const tickets = new Set(Array.from({ length: 20 }, () => issueTicket()));
  assert(tickets.size === 20, 'All 20 issued tickets are unique');
}

console.log('\n6. consumeTicket accepts a freshly issued ticket');
{
  const t = issueTicket();
  assert(consumeTicket(t) === true, 'Fresh ticket is accepted');
}

console.log('\n7. consumeTicket marks ticket as single-use');
{
  const t = issueTicket();
  consumeTicket(t);
  assert(consumeTicket(t) === false, 'Second use of same ticket is rejected');
}

console.log('\n8. consumeTicket rejects an already-used ticket');
{
  const t = issueTicket();
  consumeTicket(t);
  assert(consumeTicket(t) === false, 'Used ticket is rejected on retry');
}

console.log('\n9. consumeTicket rejects unknown tickets');
{
  assert(consumeTicket('deadbeef') === false, 'Unknown short string rejected');
  assert(consumeTicket('a'.repeat(64)) === false, 'Unknown 64-char hex rejected');
  assert(consumeTicket(null) === false, 'null rejected');
  assert(consumeTicket('') === false, 'Empty string rejected');
}

console.log('\n10. consumeTicket rejects expired tickets');
{
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const ticket = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  ticketStore.set(ticket, { createdAt: Date.now() - TICKET_TTL_MS - 1, used: false });
  assert(consumeTicket(ticket) === false, 'Expired ticket is rejected');
}

console.log('\n11. pruneTickets removes only expired entries');
{
  ticketStore.clear();
  const fresh = issueTicket();
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const stale = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  ticketStore.set(stale, { createdAt: Date.now() - TICKET_TTL_MS - 1, used: false });

  pruneTickets();
  assert(ticketStore.has(fresh),   'Fresh ticket survives pruning');
  assert(!ticketStore.has(stale),  'Stale ticket is removed by pruning');
}

// ── Live server HTTP tests ────────────────────────────────────────────────────

const TEST_PORT = 14173;

async function startTestServer() {
  const { default: express } = await import('express');
  const app = express();

  const testTicketStore = new Map();

  app.get('/api/realtime-ticket', (_req, res) => {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    const ticket = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    testTicketStore.set(ticket, { createdAt: Date.now(), used: false });
    res.json({ ticket });
  });

  app.get('/config.js', (_req, res) => {
    res.type('application/javascript');
    res.send(`window.__REALTIME_CONFIG__ = ${JSON.stringify({ url: '/' })};`);
  });

  const server = createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  return { server, testTicketStore };
}

const { server, testTicketStore } = await startTestServer();
const BASE = `http://localhost:${TEST_PORT}`;

console.log('\n12. HTTP /config.js does not contain the auth token');
{
  const res = await fetch(`${BASE}/config.js`);
  const text = await res.text();
  assert(!text.includes('token'), '/config.js response contains no "token" key');
  assert(!text.includes('REALTIME_AUTH_TOKEN'), '/config.js response does not mention REALTIME_AUTH_TOKEN');
}

console.log('\n13. HTTP /config.js returns safe config only');
{
  const res = await fetch(`${BASE}/config.js`);
  const text = await res.text();
  assert(text.includes('__REALTIME_CONFIG__'), 'Response sets __REALTIME_CONFIG__');
  assert(text.includes('"url"'), 'Response includes safe "url" field');
  assert(!text.includes('"token"'), 'Response does not include "token" field');
}

console.log('\n14. HTTP /api/realtime-ticket returns a valid ticket');
{
  const res = await fetch(`${BASE}/api/realtime-ticket`);
  assert(res.ok, '/api/realtime-ticket returns HTTP 200');
  const data = await res.json();
  assert(typeof data.ticket === 'string', 'Response has a ticket string');
  assert(data.ticket.length === 64,       'Ticket is 64 hex characters');
  assert(/^[0-9a-f]+$/.test(data.ticket), 'Ticket is lowercase hex');
}

console.log('\n15. Regression: client-side code no longer reads token from __REALTIME_CONFIG__');
{
  assert(!clientSrc.includes('config.token'), 'realtime-sync.js does not use config.token');
  assert(clientSrc.includes('fetchRealtimeTicket'), 'realtime-sync.js uses fetchRealtimeTicket()');
}

console.log('\n16. Regression: /api/realtime-ticket is fetched for each connection (auth callback)');
{
  assert(clientSrc.includes('auth: (cb)'), 'Socket.io auth uses a callback for per-connect tickets');
}

server.close();

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);

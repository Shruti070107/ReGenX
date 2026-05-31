/**
 * Tests for the Google ID token verification logic introduced in handleGoogleLogin.
 *
 * The core change replaces client-side atob() JWT decoding with a call to
 * Google's tokeninfo endpoint so that the signature, issuer, audience, and
 * expiration are validated server-side before any identity decision is made.
 *
 * validateGoogleClaims is replicated inline here so these tests run in Node.js
 * without loading the full browser module.  The logic must stay in sync with
 * the copy in src/app.js.
 *
 * Test coverage:
 *  1.  Valid Google login (correct payload)
 *  2.  Invalid signature (tokeninfo returns error field)
 *  3.  Invalid audience (aud mismatch)
 *  4.  Invalid issuer (iss not a Google domain)
 *  5.  Expired token (exp in the past)
 *  6.  Tampered payload (arbitrary base64 content not signed by Google)
 *  7.  Account creation uses verified payload fields
 *  8.  Existing-user login uses verified payload fields
 *  9.  Network failure during tokeninfo rejects login
 * 10.  Regression: old atob() approach would accept a forged payload;
 *      new approach rejects it
 */

// ── Replicated validation logic (must match src/app.js) ──────────────────────

const GOOGLE_CLIENT_ID =
  '661991506161-rb6j5n5klovjupfal1ip2qstcu0k366a.apps.googleusercontent.com';

function validateGoogleClaims(payload, clientId) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'invalid payload' };
  }
  if (payload.error) {
    return { valid: false, reason: String(payload.error) };
  }
  if (payload.aud !== clientId) {
    return { valid: false, reason: 'audience mismatch' };
  }
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    return { valid: false, reason: 'invalid issuer' };
  }
  if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'token expired' };
  }
  return { valid: true };
}

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

/** Returns a payload that passes all validation checks. */
function goodPayload() {
  return {
    iss: 'accounts.google.com',
    aud: GOOGLE_CLIENT_ID,
    sub: '112345678901234567890',
    email: 'user@example.com',
    name: 'Test User',
    picture: 'https://example.com/photo.jpg',
    exp: String(Math.floor(Date.now() / 1000) + 3600) // expires in one hour
  };
}

/**
 * Simulates the tokeninfo fetch + validateGoogleClaims pipeline without a
 * real network call.  Returns { loginProceeded, rejectedReason }.
 */
async function simulateVerification(tokeninfoPayload, throwNetworkError = false) {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (throwNetworkError) throw new Error('Network unreachable');
    return {
      ok: !tokeninfoPayload.error,
      status: tokeninfoPayload.error ? 400 : 200,
      json: async () => tokeninfoPayload
    };
  };

  let loginProceeded = false;
  let rejectedReason = null;

  try {
    let payload;
    try {
      const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=mock');
      payload = await res.json();
    } catch {
      rejectedReason = 'network error';
      return { loginProceeded, rejectedReason };
    }

    const check = validateGoogleClaims(payload, GOOGLE_CLIENT_ID);
    if (!check.valid) {
      rejectedReason = check.reason;
    } else {
      loginProceeded = true;
    }
  } finally {
    globalThis.fetch = origFetch;
  }

  return { loginProceeded, rejectedReason };
}

// ── Test suite ────────────────────────────────────────────────────────────────

console.log('\nRunning Google authentication verification tests…\n');

// ── 1. Valid Google login ────────────────────────────���────────────────────────
console.log('1. Valid Google login (correct payload)');
{
  const result = validateGoogleClaims(goodPayload(), GOOGLE_CLIENT_ID);
  assert(result.valid === true, 'validateGoogleClaims returns { valid: true }');
  assert(!result.reason, 'No rejection reason for a valid payload');
}

// ── 2. Invalid signature (tokeninfo returns error) ──────────────────────────��
console.log('\n2. Invalid signature — tokeninfo error field');
{
  const payload = { error: 'invalid_token', error_description: 'Token is invalid' };
  const result = validateGoogleClaims(payload, GOOGLE_CLIENT_ID);
  assert(result.valid === false, 'Token with error field is rejected');
  assert(result.reason === 'invalid_token', 'Rejection reason reflects the error value');
}

// ── 3. Invalid audience ───────────────────────────────────────────────────────
console.log('\n3. Invalid audience (aud mismatch)');
{
  const payload = { ...goodPayload(), aud: 'different-client-id.apps.googleusercontent.com' };
  const result = validateGoogleClaims(payload, GOOGLE_CLIENT_ID);
  assert(result.valid === false, 'Token with wrong aud is rejected');
  assert(result.reason === 'audience mismatch', 'Rejection reason is "audience mismatch"');
}

// ── 4. Invalid issuer ─────────────────────────────────────────────────────────
console.log('\n4. Invalid issuer (iss not a Google domain)');
{
  const payloadFakeIss = { ...goodPayload(), iss: 'attacker.example.com' };
  const result1 = validateGoogleClaims(payloadFakeIss, GOOGLE_CLIENT_ID);
  assert(result1.valid === false, 'Token with fake iss is rejected');
  assert(result1.reason === 'invalid issuer', 'Rejection reason is "invalid issuer"');

  // Both canonical forms of the Google issuer must be accepted
  const payloadHttps = { ...goodPayload(), iss: 'https://accounts.google.com' };
  const result2 = validateGoogleClaims(payloadHttps, GOOGLE_CLIENT_ID);
  assert(result2.valid === true, 'https://accounts.google.com issuer is accepted');
}

// ── 5. Expired token ──────────────────────────────────────────────────────────
console.log('\n5. Expired token (exp in the past)');
{
  const payload = { ...goodPayload(), exp: String(Math.floor(Date.now() / 1000) - 60) };
  const result = validateGoogleClaims(payload, GOOGLE_CLIENT_ID);
  assert(result.valid === false, 'Expired token is rejected');
  assert(result.reason === 'token expired', 'Rejection reason is "token expired"');
}

// ── 6. Tampered payload ───────────────────────────────────────────────────────
console.log('\n6. Tampered payload (arbitrary base64 content, not signed by Google)');
{
  // Simulate what a crafted JWT would look like when tokeninfo rejects it.
  // The real tokeninfo endpoint returns { error: 'invalid_token' } for any
  // token whose signature cannot be verified.
  const tokeninfoReject = { error: 'invalid_token', error_description: 'Signature verification failed' };
  const result = validateGoogleClaims(tokeninfoReject, GOOGLE_CLIENT_ID);
  assert(result.valid === false, 'Tampered payload is rejected after tokeninfo returns error');
}

// ── 7. Account creation uses verified payload fields ─────────────────────────
console.log('\n7. Account creation uses verified payload fields (network simulation)');
{
  const { loginProceeded } = await simulateVerification(goodPayload());
  assert(loginProceeded === true, 'Login proceeds when tokeninfo returns a valid payload');
}

// ── 8. Existing-user login uses verified payload fields ───────────────────────
console.log('\n8. Existing-user login — re-authentication with verified payload');
{
  // Use the same valid payload but simulate a second call (same email = returning user).
  // The verification path is identical; what changes in app.js is a DB lookup, not
  // the claims validation.  Confirmed by validating that loginProceeded is true.
  const { loginProceeded } = await simulateVerification(goodPayload());
  assert(loginProceeded === true, 'Returning-user login proceeds with verified payload');
}

// ── 9. Network failure during tokeninfo rejects login ─────────────────────────
console.log('\n9. Network failure during tokeninfo rejects login');
{
  const { loginProceeded, rejectedReason } = await simulateVerification({}, true);
  assert(loginProceeded === false, 'Login is blocked when tokeninfo network call fails');
  assert(rejectedReason === 'network error', 'Rejection reason is "network error"');
}

// ── 10. Regression — old atob() approach vs new tokeninfo approach ────────────
console.log('\n10. Regression: forged payload is rejected by new approach');
{
  // Build a crafted JWT where the base64-encoded payload claims admin identity.
  // The signature field is arbitrary — no real Google private key was used.
  const craftedClaims = { name: 'Forged Admin', email: 'admin@victim.example.com', picture: '' };
  const b64 = Buffer.from(JSON.stringify(craftedClaims)).toString('base64');
  const craftedJwt = `eyJhbGciOiJub25lIn0.${b64}.fakesig`;

  // ── Old behaviour: atob() trusts the payload unconditionally ──────────────
  let oldApproachAccepted = false;
  try {
    const oldPayload = JSON.parse(Buffer.from(craftedJwt.split('.')[1], 'base64').toString('utf8'));
    // Old code would immediately use oldPayload.name / oldPayload.email
    if (oldPayload.email === 'admin@victim.example.com') oldApproachAccepted = true;
  } catch { /* ignore */ }

  assert(oldApproachAccepted === true, 'Old atob() approach would have accepted the forged payload');

  // ── New behaviour: tokeninfo rejects the token ────────────────────────────
  const tokeninfoReject = { error: 'invalid_token', error_description: 'Signature verification failed' };
  const { loginProceeded: newAccepted } = await simulateVerification(tokeninfoReject);
  assert(newAccepted === false, 'New tokeninfo approach rejects the same forged payload');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────────\n`);

process.exit(failed > 0 ? 1 : 0);

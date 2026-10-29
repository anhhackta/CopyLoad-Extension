// PIN lock. This is a privacy screen for the UI (and the paste picker):
// it keeps casual onlookers out. IndexedDB data itself is not encrypted;
// use an encrypted export for data at rest.

async function getLockConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LOCK_CONFIG);
  return result[STORAGE_KEYS.LOCK_CONFIG] || null;
}

async function isLockEnabled() {
  const config = await getLockConfig();
  return Boolean(config && config.enabled);
}

async function readUnlockState() {
  const result = await chrome.storage.session.get(STORAGE_KEYS.UNLOCK_STATE);
  return result[STORAGE_KEYS.UNLOCK_STATE] || null;
}

// True when no lock is set, or the last unlock is still within the timeout.
async function isUnlockValid() {
  if (!(await isLockEnabled())) return true;
  const { lockTimeoutMin } = await getSettings();
  if (lockTimeoutMin <= 0) return false;
  const state = await readUnlockState();
  if (!state) return false;
  return Date.now() - state.lastActive <= lockTimeoutMin * 60 * 1000;
}

async function markUnlocked() {
  await chrome.storage.session.set({ [STORAGE_KEYS.UNLOCK_STATE]: { lastActive: Date.now() } });
}

async function lockNow() {
  await chrome.storage.session.remove(STORAGE_KEYS.UNLOCK_STATE);
}

function isValidPin(pin) {
  return typeof pin === 'string'
    && new RegExp(`^\\d{${LIMITS.PIN_MIN_LENGTH},${LIMITS.PIN_MAX_LENGTH}}$`).test(pin);
}

async function setupPin(pin) {
  if (!isValidPin(pin)) throw new Error('Invalid PIN format');
  const salt = randomBase64(16);
  const iterations = LIMITS.PIN_PBKDF2_ITERATIONS;
  const hash = await hashPin(pin, salt, iterations);
  await chrome.storage.local.set({
    [STORAGE_KEYS.LOCK_CONFIG]: { enabled: true, salt, hash, iterations, length: pin.length }
  });
  await chrome.storage.local.remove(STORAGE_KEYS.LOCK_FAIL);
  await markUnlocked();
}

async function removeLock() {
  await chrome.storage.local.remove([STORAGE_KEYS.LOCK_CONFIG, STORAGE_KEYS.LOCK_FAIL]);
  await lockNow();
}

// Returns { ok } or { ok:false, lockedUntil } / { ok:false, attemptsLeft }.
async function verifyPin(pin) {
  const config = await getLockConfig();
  if (!config || !config.enabled) return { ok: true };

  const failResult = await chrome.storage.local.get(STORAGE_KEYS.LOCK_FAIL);
  const fail = failResult[STORAGE_KEYS.LOCK_FAIL] || { count: 0, until: 0 };
  if (fail.until > Date.now()) return { ok: false, lockedUntil: fail.until };

  const hash = await hashPin(pin, config.salt, config.iterations);
  if (constantTimeEquals(hash, config.hash)) {
    await chrome.storage.local.remove(STORAGE_KEYS.LOCK_FAIL);
    await markUnlocked();
    return { ok: true };
  }

  const count = fail.count + 1;
  if (count >= LIMITS.PIN_MAX_ATTEMPTS) {
    const until = Date.now() + LIMITS.PIN_LOCKOUT_MS;
    await chrome.storage.local.set({ [STORAGE_KEYS.LOCK_FAIL]: { count: 0, until } });
    return { ok: false, lockedUntil: until };
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.LOCK_FAIL]: { count, until: 0 } });
  return { ok: false, attemptsLeft: LIMITS.PIN_MAX_ATTEMPTS - count };
}

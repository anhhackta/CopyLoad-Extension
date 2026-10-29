// Crypto helpers (Web Crypto only, no dependencies).
// Used for PIN hashing and for encrypted backups.

const cryptoEncoder = new TextEncoder();
const cryptoDecoder = new TextDecoder();
const BASE64_CHUNK = 0x8000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AES_KEY_BITS = 256;

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBase64(byteLength) {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function importPasswordKey(password) {
  return crypto.subtle.importKey('raw', cryptoEncoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}

async function hashPin(pin, saltBase64, iterations) {
  const baseKey = await importPasswordKey(pin);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(saltBase64), iterations },
    baseKey,
    AES_KEY_BITS
  );
  return bytesToBase64(new Uint8Array(bits));
}

function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function deriveAesKey(password, saltBytes, iterations) {
  const baseKey = await importPasswordKey(password);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
    baseKey,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

// Returns a JSON-serialisable envelope. Only someone with the password can read it.
async function encryptWithPassword(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const iterations = LIMITS.EXPORT_PBKDF2_ITERATIONS;
  const key = await deriveAesKey(password, salt, iterations);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, cryptoEncoder.encode(plainText));
  return {
    app: EXPORT_FORMAT.APP,
    schema: EXPORT_FORMAT.SCHEMA,
    encrypted: true,
    kdf: EXPORT_FORMAT.KDF,
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipher))
  };
}

// Throws when the password is wrong or the file was modified (AES-GCM authenticates).
async function decryptWithPassword(envelope, password) {
  const key = await deriveAesKey(password, base64ToBytes(envelope.salt), envelope.iterations);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.data)
  );
  return cryptoDecoder.decode(plain);
}

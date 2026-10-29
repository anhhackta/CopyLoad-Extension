// Shared constants. Loaded as a classic script in every context
// (service worker via importScripts, content scripts, extension pages).

const MSG = Object.freeze({
  SAVE_TEXT: 'copyload:save-text',
  SAVE_IMAGE: 'copyload:save-image',
  PICKER_OPEN: 'copyload:picker-open',
  PICKER_GET_TEXT: 'copyload:picker-get-text',
  PICKER_GET_BY_INDEX: 'copyload:picker-get-by-index'
});

const MENU_IDS = Object.freeze({
  SAVE_TEXT: 'copyload-save-text',
  SAVE_IMAGE: 'copyload-save-image'
});

const LIMITS = Object.freeze({
  MAX_TEXT_CHARS: 200000,
  MAX_IMAGE_BYTES: 10 * 1024 * 1024,
  TEMP_MAX_ITEMS: 100,
  TEMP_MAX_CHARS: 20000,
  PREVIEW_CHARS: 400,
  PICKER_PREVIEW_CHARS: 120,
  PAGE_SIZE: 30,
  THUMB_MAX_SIDE: 240,
  THUMB_QUALITY: 0.85,
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 6,
  PIN_MAX_ATTEMPTS: 5,
  PIN_LOCKOUT_MS: 30 * 1000,
  PIN_PBKDF2_ITERATIONS: 150000,
  EXPORT_PBKDF2_ITERATIONS: 210000,
  EXPORT_MIN_PASSWORD: 6
});

const TIMING = Object.freeze({
  // How long after a Ctrl+V keydown a paste event still counts as "keyboard paste".
  PASTE_KEY_WINDOW_MS: 400,
  // Quick mode: time the user has to press a digit after Ctrl+V.
  QUICK_PASTE_WINDOW_MS: 300,
  CLEANUP_INTERVAL_MS: 6 * 60 * 60 * 1000,
  UNLOCK_TOUCH_THROTTLE_MS: 10 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000
});

const KIND = Object.freeze({
  TEXT: 'text',
  LINK: 'link',
  EMAIL: 'email',
  NUMBER: 'number',
  CODE: 'code'
});

const STORE = Object.freeze({
  TEXTS: 'texts',
  IMAGES: 'images'
});

const DB_CONFIG = Object.freeze({
  NAME: 'CopyLoadDB',
  // v2 adds the sparse "pinned" index. Existing records stay valid (no migration of data).
  VERSION: 2
});

const STORAGE_KEYS = Object.freeze({
  LOCK_CONFIG: 'lockConfig',
  LOCK_FAIL: 'lockFail',
  LAST_CLEANUP_AT: 'lastCleanupAt',
  UNLOCK_STATE: 'unlockState',
  TEMP_TEXTS: 'tempTexts'
});

// area: where the value lives. sync = follows the user's browser profile,
// local = this device only. legacyLocal = v2.0.x kept it in local; read it as fallback.
const SETTINGS_SCHEMA = Object.freeze({
  theme: { area: 'sync', default: 'dark', allowed: ['light', 'dark', 'system'], legacyLocal: true },
  language: { area: 'sync', default: 'vi', allowed: ['vi', 'en'], legacyLocal: true },
  pasteMode: { area: 'sync', default: 'box', allowed: ['box', 'quick'] },
  pasteCount: { area: 'sync', default: 5, allowed: [5, 7, 10] },
  enableCtrlC: { area: 'local', default: true },
  enablePersistent: { area: 'local', default: true },
  enablePasteMulti: { area: 'local', default: false },
  autoDeleteDays: { area: 'local', default: 0, allowed: [0, 7, 30, 90, 180] },
  lockTimeoutMin: { area: 'local', default: 1, allowed: [0, 1, 5, 15, 60] }
});

const EXPORT_FORMAT = Object.freeze({
  APP: 'CopyLoad',
  SCHEMA: 1,
  KDF: 'PBKDF2-SHA256'
});

const LINKS = Object.freeze({
  AUTHOR: 'https://github.com/anhhackta/',
  PROJECT: 'https://anhhackta.github.io/',
  FACEBOOK: 'https://facebook.com/anhhackta.official',
  DONATE: 'https://www.buymeacoffee.com/anhhackta'
});

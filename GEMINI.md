# CopyLoad — Project Rules

## Overview
Chrome/Edge extension (Manifest V3) that saves copy history. Vanilla JS + HTML + CSS only. No build step, no frameworks, no npm dependencies unless I approve.

## Architecture (do not mix responsibilities)
- `src/background/background.js`: service worker. Context menu, DB writes, message handling, auto-cleanup. Stateless: never keep data in global variables (worker can be killed anytime).
- `src/content/content.js`: only listens to copy/cut/paste/keydown and sends typed messages. `picker.js` is the Paste Multi box (Shadow DOM, no storage logic).
- `src/app/*`: popup + manager UI (one codebase, `data-view="popup|manager"`). UI only, never touches page DOM.
- `src/shared/*`: `constants.js` (storage keys, message types, limits, settings schema), `i18n.js`, `db.js`, `settings.js`, `lock.js`, `crypto.js`, `temp.js`, `classify.js`. No magic strings elsewhere.

## Storage
- Clipboard data (text + images) → IndexedDB (`CopyLoadDB`). Records: texts `{ id, content, hash, savedAt, kind, pinned? }`, images `{ id, blob, thumbnail, savedAt, size, type, pinned? }`.
- Settings: `chrome.storage.sync` for preferences (theme, language, paste mode/count); `chrome.storage.local` for device switches, PIN config, timestamps. Temporary entries (`temp: true`) → `chrome.storage.session`.
- Changing the data shape requires a migration step and my confirmation (users have saved data). Adding optional fields is fine if old records stay valid.
- "Delete all" always needs a confirm step. Never auto-clear data, except the opt-in "auto-delete old items" setting (pinned items are always kept).
- Unlimited history: render lists lazily/limited (cursor paging) to avoid popup lag.
- PIN lock is a UI privacy screen (PBKDF2 hash in `storage.local`); IndexedDB itself is not encrypted. Exports can be AES-GCM encrypted with a password.

## Privacy & Permissions
- Clipboard data never leaves the device: no network requests, no analytics, no remote scripts.
- Minimum permissions. Warn me before adding any entry to `permissions` / `host_permissions`.
- Always use `textContent`, never `innerHTML` with saved text (XSS).
- Skip saving on password fields; ignore empty or whitespace-only text.

## i18n & Theme
- All UI strings go through one i18n dictionary (VI/EN). No hardcoded text in logic.
- Theme via CSS variables (light/dark/system). No inline colors.

## Compatibility
- Must work on Chrome and Edge. Use `chrome.*` APIs only with MV3 syntax (promises).
- Content script must tolerate pages that block copy events or run in iframes.

## Workflow
- Read `manifest.json` and the file you're about to change before editing. Don't assume structure.
- Small changes → show only changed snippets + 2-line summary + how to test (reload at chrome://extensions).
- New feature → 3-5 line plan first, then code.
- Bump `version` in manifest.json only when I say "release".
- Commits: conventional (`feat:`, `fix:`, `refactor:`, `docs:`).
- Keep `index.html` (landing) and `convert_icons.html` (util) out of extension logic; propose moving them to `/docs` or `/tools` before touching.
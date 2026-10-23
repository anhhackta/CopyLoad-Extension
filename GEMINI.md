# CopyLoad — Project Rules

## Overview
Chrome/Edge extension (Manifest V3) that saves copy history. Vanilla JS + HTML + CSS only. No build step, no frameworks, no npm dependencies unless I approve.

## Architecture (do not mix responsibilities)
- `background.js`: service worker. Context menu, storage writes, message handling. Stateless: never keep data in global variables (worker can be killed anytime).
- `content.js`: only listens to the `copy` event and sends messages. No UI, no storage logic.
- `popup.*`: UI only. Reads/writes via storage or messages, never touches page DOM.
- Shared constants (storage keys, message types, limits) in one `constants.js`. No magic strings.

## Storage
- Permanent → `chrome.storage.local`. Temporary → `chrome.storage.session`. Entry shape: `{ id, text, createdAt, temp }`.
- Changing the data shape requires a migration step and my confirmation (users have saved data).
- "Delete all" always needs a confirm step. Never auto-clear data.
- Unlimited history: render lists lazily/limited (e.g. paginate or virtualize) to avoid popup lag.

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
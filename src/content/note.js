// Floating pinned note ("Ghim note") rendered in a closed Shadow DOM.
// Persists position/size across tabs via chrome.storage.local and updates in real time
// whenever new clipboard items are saved. Saved text is rendered with textContent only.

(() => {
  'use strict';

  if (window.top !== window.self) return;

  const NOTE_Z_INDEX = '2147483646';
  const VIEWPORT_MARGIN = 8;
  const MIN_WIDTH = 220;
  const MAX_WIDTH = 520;
  const MIN_HEIGHT = 160;
  const MAX_HEIGHT = 640;
  const DEFAULT_BOUNDS = Object.freeze({
    right: 20,
    top: 72,
    width: 280,
    height: 310,
    minimized: false
  });

  const STYLE = `
    :host { all: initial; }
    .note {
      position: fixed;
       display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: var(--bg);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 11px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
      font: 12.5px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
      overflow: hidden;
      user-select: none;
    }
    .note[data-theme='dark'] {
      --bg: #181c23;
      --surface: #20252e;
      --hover: #282e3a;
      --fg: #e6e9ee;
      --muted: #8b94a1;
      --border: #2d3340;
      --accent: #8b8cf6;
      --accent-weak: #25284e;
      --on-accent: #101217;
    }
    .note[data-theme='light'] {
      --bg: #ffffff;
      --surface: #f4f6f8;
      --hover: #eaeef2;
      --fg: #1b1f24;
      --muted: #636c76;
      --border: #dcdfe4;
      --accent: #4f46e5;
      --accent-weak: #eceafd;
      --on-accent: #ffffff;
    }
    .note.minimized {
      height: auto !important;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 7px 8px 7px 10px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      cursor: move;
      touch-action: none;
    }
    .note.minimized .header {
      border-bottom: 0;
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      flex: none;
    }
    .title {
      font-weight: 600;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .count {
      padding: 0 5px;
      border-radius: 7px;
      background: var(--accent-weak);
      color: var(--accent);
      font-size: 10.5px;
      font-weight: 600;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: none;
    }
    .hbtn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: none;
      border: 0;
      border-radius: 5px;
      color: var(--muted);
      cursor: pointer;
      font: 600 14px/1 system-ui, sans-serif;
    }
    .hbtn:hover {
      background: var(--hover);
      color: var(--fg);
    }
    .body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .note.minimized .body {
      display: none;
    }
    .list {
      flex: 1;
      min-height: 0;
      margin: 0;
      padding: 5px;
      list-style: none;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 8px;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      transition: background 0.1s;
    }
    .item:hover {
      background: var(--hover);
    }
    .item.copied {
      background: var(--accent-weak);
    }
    .badge {
      flex: none;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 4px;
      background: var(--surface);
      color: var(--muted);
      font-size: 10.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .item.pinned .badge {
      background: var(--accent-weak);
      color: var(--accent);
    }
    .item.copied .badge {
      background: var(--accent);
      color: var(--on-accent);
    }
    .text {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .empty {
      padding: 22px 12px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }
    .footer {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 18px 4px 10px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 10.5px;
    }
    .resize-grip {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 16px;
      height: 16px;
      cursor: nwse-resize;
      touch-action: none;
    }
    .resize-grip::after {
      content: '';
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 7px;
      height: 7px;
      border-right: 2px solid var(--muted);
      border-bottom: 2px solid var(--muted);
      opacity: 0.7;
    }
  `;

  let settings = {
    enableFloatingNote: false,
    language: 'vi',
    theme: 'dark'
  };
  let bounds = { ...DEFAULT_BOUNDS };
  let host = null;
  let ui = null;

  function resolveTheme(theme) {
    if (theme === 'light' || theme === 'dark') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  async function sendToBackground(message) {
    try {
      if (!chrome.runtime || !chrome.runtime.id) return null;
      return await chrome.runtime.sendMessage(message);
    } catch (_) {
      return null;
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;left:-9999px;opacity:0;';
      document.documentElement.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function applyBounds() {
    if (!ui) return;
    const width = clamp(Number(bounds.width) || DEFAULT_BOUNDS.width, MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2));
    const height = clamp(Number(bounds.height) || DEFAULT_BOUNDS.height, MIN_HEIGHT, Math.min(MAX_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2));
    const right = clamp(Number(bounds.right) ?? DEFAULT_BOUNDS.right, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN));
    const top = clamp(Number(bounds.top) ?? DEFAULT_BOUNDS.top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - 44));

    ui.note.style.width = `${width}px`;
    ui.note.style.height = `${height}px`;
    ui.note.style.right = `${right}px`;
    ui.note.style.top = `${top}px`;
    ui.note.classList.toggle('minimized', Boolean(bounds.minimized));
    ui.minBtn.textContent = bounds.minimized ? '+' : '−';
    ui.minBtn.title = translate(settings.language, bounds.minimized ? 'noteExpand' : 'noteMinimize');
  }

  async function saveBounds() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.FLOATING_NOTE_STATE]: bounds });
    } catch (_) { /* ignore */ }
  }

  async function loadBounds() {
    try {
      const res = await chrome.storage.local.get(STORAGE_KEYS.FLOATING_NOTE_STATE);
      if (res && res[STORAGE_KEYS.FLOATING_NOTE_STATE]) {
        bounds = { ...DEFAULT_BOUNDS, ...res[STORAGE_KEYS.FLOATING_NOTE_STATE] };
      }
    } catch (_) { /* keep default */ }
  }

  function wireDrag(headerEl) {
    headerEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();
      headerEl.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const startRight = bounds.right;
      const startTop = bounds.top;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        bounds.right = clamp(startRight - dx, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - bounds.width - VIEWPORT_MARGIN));
        bounds.top = clamp(startTop + dy, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - 44));
        applyBounds();
      }

      function onUp(upEvent) {
        headerEl.removeEventListener('pointermove', onMove);
        headerEl.removeEventListener('pointerup', onUp);
        headerEl.removeEventListener('pointercancel', onUp);
        if (headerEl.hasPointerCapture(upEvent.pointerId)) {
          headerEl.releasePointerCapture(upEvent.pointerId);
        }
        saveBounds();
      }

      headerEl.addEventListener('pointermove', onMove);
      headerEl.addEventListener('pointerup', onUp);
      headerEl.addEventListener('pointercancel', onUp);
    });
  }

  function wireResize(gripEl) {
    gripEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      gripEl.setPointerCapture(event.pointerId);
      const rect = ui.note.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;
      const startRight = bounds.right;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const newWidth = clamp(startWidth + dx, MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2));
        const newHeight = clamp(startHeight + dy, MIN_HEIGHT, Math.min(MAX_HEIGHT, window.innerHeight - bounds.top - VIEWPORT_MARGIN));
        bounds.right = clamp(startRight - (newWidth - startWidth), VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - newWidth - VIEWPORT_MARGIN));
        bounds.width = newWidth;
        bounds.height = newHeight;
        applyBounds();
      }

      function onUp(upEvent) {
        gripEl.removeEventListener('pointermove', onMove);
        gripEl.removeEventListener('pointerup', onUp);
        gripEl.removeEventListener('pointercancel', onUp);
        if (gripEl.hasPointerCapture(upEvent.pointerId)) {
          gripEl.releasePointerCapture(upEvent.pointerId);
        }
        saveBounds();
      }

      gripEl.addEventListener('pointermove', onMove);
      gripEl.addEventListener('pointerup', onUp);
      gripEl.addEventListener('pointercancel', onUp);
    });
  }

  async function onItemClick(item, rowEl, badgeEl, defaultBadgeText) {
    const response = await sendToBackground({ type: MSG.PICKER_GET_TEXT, id: item.id });
    const content = response && response.ok ? response.text : item.preview;
    if (!content) return;
    const copied = await copyToClipboard(content);
    if (!copied) return;
    rowEl.classList.add('copied');
    badgeEl.textContent = '✓';
    setTimeout(() => {
      rowEl.classList.remove('copied');
      badgeEl.textContent = defaultBadgeText;
    }, 900);
  }

  function renderItems(response) {
    if (!ui) return;
    ui.list.replaceChildren();

    if (!response || !response.ok) {
      ui.count.textContent = '0';
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = translate(settings.language, 'noteEmpty');
      ui.list.appendChild(empty);
      return;
    }

    if (response.locked) {
      ui.count.textContent = '🔒';
      const locked = document.createElement('div');
      locked.className = 'empty';
      locked.textContent = translate(settings.language, 'noteLocked');
      ui.list.appendChild(locked);
      return;
    }

    const items = response.items || [];
    ui.count.textContent = String(items.length);

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = translate(settings.language, 'noteEmpty');
      ui.list.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement('li');
      row.className = item.pinned ? 'item pinned' : 'item';

      const badge = document.createElement('span');
      badge.className = 'badge';
      const badgeLabel = item.pinned ? '★' : String(index + 1);
      badge.textContent = badgeLabel;

      const text = document.createElement('span');
      text.className = 'text';
      text.textContent = item.preview.replace(/\s+/g, ' ').trim();

      row.append(badge, text);
      row.addEventListener('click', () => onItemClick(item, row, badge, badgeLabel));
      ui.list.appendChild(row);
    });
  }

  async function refreshNote() {
    if (!settings.enableFloatingNote) {
      destroyNote();
      return;
    }
    if (!host) await mountNote();
    if (!ui) return;
    ui.note.dataset.theme = resolveTheme(settings.theme);
    ui.title.textContent = translate(settings.language, 'noteTitle');
    ui.hint.textContent = translate(settings.language, 'noteClickHint');
    ui.closeBtn.title = translate(settings.language, 'unpinNote');
    applyBounds();

    const response = await sendToBackground({ type: MSG.NOTE_GET_ITEMS });
    renderItems(response);
  }

  async function mountNote() {
    if (host) return;
    await loadBounds();

    host = document.createElement('div');
    host.style.cssText = `all: initial; position: fixed; left: 0; top: 0; z-index: ${NOTE_Z_INDEX}; pointer-events: none;`;
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    const note = document.createElement('div');
    note.className = 'note';
    note.style.pointerEvents = 'auto';
    note.dataset.theme = resolveTheme(settings.theme);

    const header = document.createElement('div');
    header.className = 'header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'title-wrap';
    const dot = document.createElement('span');
    dot.className = 'dot';
    const title = document.createElement('span');
    title.className = 'title';
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = '0';
    titleWrap.append(dot, title, count);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.className = 'hbtn';
    minBtn.addEventListener('click', () => {
      bounds.minimized = !bounds.minimized;
      applyBounds();
      saveBounds();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'hbtn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      setSetting('enableFloatingNote', false).catch(() => {});
    });
    actions.append(minBtn, closeBtn);
    header.append(titleWrap, actions);

    const body = document.createElement('div');
    body.className = 'body';
    const list = document.createElement('ul');
    list.className = 'list';
    const footer = document.createElement('div');
    footer.className = 'footer';
    const hint = document.createElement('span');
    const grip = document.createElement('div');
    grip.className = 'resize-grip';
    footer.append(hint, grip);
    body.append(list, footer);

    note.append(header, body);
    shadow.append(style, note);
    (document.documentElement || document.body).appendChild(host);

    ui = { note, title, count, minBtn, closeBtn, list, hint };
    wireDrag(header);
    wireResize(grip);
    applyBounds();
  }

  function destroyNote() {
    if (!host) return;
    host.remove();
    host = null;
    ui = null;
  }

  // ---------- init & listeners ----------

  getSettings()
    .then((loaded) => {
      settings = loaded;
      return refreshNote();
    })
    .catch(() => {});

  onSettingsChanged((updates) => {
    Object.assign(settings, updates);
    refreshNote().catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (!settings.enableFloatingNote) return;
    if (area === 'local' && STORAGE_KEYS.FLOATING_NOTE_STATE in changes) {
      const next = changes[STORAGE_KEYS.FLOATING_NOTE_STATE].newValue;
      if (next) {
        bounds = { ...DEFAULT_BOUNDS, ...next };
        applyBounds();
      }
    }
    if (
      (area === 'local' && (STORAGE_KEYS.LAST_DATA_CHANGE_AT in changes || STORAGE_KEYS.LOCK_CONFIG in changes)) ||
      (area === 'session' && STORAGE_KEYS.UNLOCK_STATE in changes)
    ) {
      refreshNote().catch(() => {});
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && settings.enableFloatingNote) {
      loadBounds().then(() => refreshNote()).catch(() => {});
    }
  });

  window.addEventListener('resize', () => {
    if (ui) applyBounds();
  });
})();

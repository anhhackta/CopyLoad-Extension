// Shared UI helpers for the popup and the manager page.

const appState = {
  language: 'vi',
  theme: 'dark',
  settings: null
};

const TOAST_DURATION_MS = 2200;
const TOAST_MAX_VISIBLE = 3;
const IMAGE_EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

const ICON_PATHS = Object.freeze({
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3z"/>',
  pinOff: '<path d="M12 17v5M9 3h6l-1 7 3 3v2H7v-2l3-3z"/><path d="M4 4l16 16"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  text: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-9 9"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  keep: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7M8 20v-6h8v6"/>',
  clipboardImage: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><circle cx="12" cy="13" r="2"/>',
  backspace: '<path d="M9 5h11v14H9l-6-7z"/><path d="m13 9 4 6M17 9l-4 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>'
});

function iconSvg(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

// Icon markup is static (never user text), so innerHTML is safe here.
function renderIcons(root = document) {
  root.querySelectorAll('[data-icon]:not([data-icon-ready])').forEach((node) => {
    node.insertAdjacentHTML('afterbegin', iconSvg(node.dataset.icon));
    node.dataset.iconReady = '1';
  });
}

function t(key, vars) {
  return translate(appState.language, key, vars);
}

function readI18nVars(node) {
  try {
    return node.dataset.i18nVars ? JSON.parse(node.dataset.i18nVars) : undefined;
  } catch (_) {
    return undefined;
  }
}

function applyI18n(root = document) {
  document.documentElement.lang = appState.language;
  root.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n, readI18nVars(node));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder, readI18nVars(node));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((node) => {
    const label = t(node.dataset.i18nTitle);
    node.title = label;
    node.setAttribute('aria-label', label);
  });
}

// ---------- DOM ----------

function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function iconButton(iconName, title, onClick, extraClass = '') {
  const button = h('button', {
    type: 'button',
    className: `icon-btn ${extraClass}`.trim(),
    title,
    'aria-label': title,
    onClick
  });
  button.innerHTML = iconSvg(iconName);
  return button;
}

function $(id) {
  return document.getElementById(id);
}

function debounce(fn, delayMs) {
  let timerId = null;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delayMs);
  };
}

// ---------- Theme ----------

function applyTheme(theme) {
  appState.theme = theme;
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (appState.theme === 'system') applyTheme('system');
});

// ---------- Toast ----------

function toast(message, kind = 'info') {
  const root = $('toastRoot');
  while (root.children.length >= TOAST_MAX_VISIBLE) root.firstElementChild.remove();
  const node = h('div', { className: `toast toast-${kind}`, textContent: message });
  root.appendChild(node);
  setTimeout(() => node.remove(), TOAST_DURATION_MS);
}

function reportError(error) {
  console.error(error);
  toast(t('genericError'), 'error');
}

// ---------- Dialogs ----------

// actions: [{ label, variant?, value?, primary?, onClick?(api) }]. Resolves with the closing value (null on Esc).
function openDialog({ title, content = [], actions }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const backdrop = h('div', { className: 'dialog-backdrop' });
    const dialog = h('div', { className: 'dialog', role: 'dialog', 'aria-modal': 'true' });
    const errorLine = h('p', { className: 'dialog-error', role: 'alert' });
    const body = h('div', { className: 'dialog-body' }, content);
    const buttonRow = h('div', { className: 'dialog-actions' });

    function close(value) {
      document.removeEventListener('keydown', onKeyDown, true);
      backdrop.remove();
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      resolve(value);
    }
    const api = { close, setError: (message) => { errorLine.textContent = message || ''; } };

    let primaryButton = null;
    actions.forEach((action) => {
      const button = h('button', {
        type: 'button',
        className: action.variant ? `btn btn-${action.variant}` : 'btn',
        textContent: action.label,
        onClick: () => (action.onClick ? action.onClick(api) : close(action.value))
      });
      if (action.primary) primaryButton = button;
      buttonRow.appendChild(button);
    });

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(null);
      } else if (event.key === 'Enter' && primaryButton && event.target.tagName === 'INPUT') {
        event.preventDefault();
        primaryButton.click();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    backdrop.addEventListener('mousedown', (event) => { if (event.target === backdrop) close(null); });

    dialog.append(h('h2', { className: 'dialog-title', textContent: title }), body, errorLine, buttonRow);
    backdrop.appendChild(dialog);
    $('dialogRoot').appendChild(backdrop);

    const firstInput = dialog.querySelector('input');
    (firstInput || primaryButton || buttonRow.lastElementChild).focus();
  });
}

async function confirmDialog({ title, text, confirmLabel, danger = true }) {
  const result = await openDialog({
    title,
    content: text ? [h('p', { className: 'dialog-text', textContent: text })] : [],
    actions: [
      { label: t('cancel'), value: false },
      { label: confirmLabel || t('confirm'), variant: danger ? 'danger' : 'primary', value: true, primary: true }
    ]
  });
  return result === true;
}

// verify(password) resolves to an error message, or null when the password is accepted.
async function passwordDialog({ title, text, label, verify }) {
  const input = h('input', { className: 'input', type: 'password', autocomplete: 'off', placeholder: label });
  return openDialog({
    title,
    content: [h('p', { className: 'dialog-text', textContent: text }), input],
    actions: [
      { label: t('cancel'), value: null },
      {
        label: t('ok'),
        variant: 'primary',
        primary: true,
        onClick: async (api) => {
          const password = input.value;
          if (!password) return;
          const error = verify ? await verify(password) : null;
          if (error) {
            api.setError(error);
            input.select();
          } else {
            api.close(password);
          }
        }
      }
    ]
  });
}

// ---------- Formatting + files ----------

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const locale = appState.language === 'vi' ? 'vi-VN' : 'en-US';
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })} ${time}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestampForFilename() {
  return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

function imageExtension(mimeType) {
  return IMAGE_EXTENSIONS[mimeType] || 'png';
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const area = h('textarea', { value: text });
    area.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

// Clipboard only accepts PNG for images reliably, so convert everything else.
async function toPngBlob(blob) {
  if (blob.type === 'image/png') return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    bitmap.close();
  }
}

async function copyImageToClipboard(blob) {
  const png = await toPngBlob(blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

// Shared selection model for list views.
function createSelection(onChange) {
  const ids = new Set();
  return {
    ids,
    get size() { return ids.size; },
    has: (id) => ids.has(id),
    toggle(id) {
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      onChange();
    },
    replace(newIds) {
      ids.clear();
      newIds.forEach((id) => ids.add(id));
      onChange();
    },
    clear() {
      ids.clear();
      onChange();
    }
  };
}

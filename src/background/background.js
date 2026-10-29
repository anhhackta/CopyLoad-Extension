// CopyLoad service worker. Stateless: every event reads what it needs from storage,
// so the worker can be stopped by the browser at any time without losing anything.

importScripts(
  '../shared/constants.js',
  '../shared/i18n.js',
  '../shared/classify.js',
  '../shared/settings.js',
  '../shared/db.js',
  '../shared/lock.js',
  '../shared/temp.js'
);

// ---------- Saving ----------

async function persistText(content, settings) {
  return settings.enablePersistent ? saveTextEntry(content) : addTemp(content);
}

async function fetchImageBlob(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
  return response.blob();
}

async function maybeAutoCleanup() {
  const { autoDeleteDays } = await getSettings();
  if (!autoDeleteDays) return;

  const stored = await chrome.storage.local.get(STORAGE_KEYS.LAST_CLEANUP_AT);
  const lastRun = stored[STORAGE_KEYS.LAST_CLEANUP_AT] || 0;
  if (Date.now() - lastRun < TIMING.CLEANUP_INTERVAL_MS) return;

  // Stamp first so parallel wake-ups do not run the cleanup twice.
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_CLEANUP_AT]: Date.now() });
  await deleteOlderThan(autoDeleteDays);
}

// ---------- Paste picker data ----------

function toPickerItem(item) {
  const preview = item.preview !== undefined ? item.preview : item.content;
  return {
    id: item.id,
    preview: preview.slice(0, LIMITS.PICKER_PREVIEW_CHARS),
    kind: item.kind,
    pinned: Boolean(item.pinned),
    temp: Boolean(item.temp)
  };
}

// Pinned first, then newest. Pinned is capped to half the list so recent copies stay visible.
async function buildPickerList(limit) {
  const [pinned, recent, temp] = await Promise.all([
    queryPinnedTexts(),
    queryTexts({ limit }),
    listTemp()
  ]);
  const pinnedPart = pinned.slice(0, Math.ceil(limit / 2));
  const rest = [...recent.items, ...temp].sort((a, b) => b.savedAt - a.savedAt);
  return [...pinnedPart, ...rest].slice(0, limit).map(toPickerItem);
}

async function readEntryContent(id) {
  if (isTempId(id)) {
    const entry = await getTemp(id);
    return entry ? entry.content : null;
  }
  const record = await getTextById(id);
  return record ? record.content : null;
}

// ---------- Message handling ----------

async function handleSaveText(message, settings) {
  if (!settings.enableCtrlC) return { ok: true, skipped: true };
  await persistText(message.text, settings);
  await maybeAutoCleanup();
  return { ok: true };
}

async function handleSaveImage(message, settings) {
  // Images need IndexedDB, so they are only kept when saving is permanent.
  if (!settings.enableCtrlC || !settings.enablePersistent) return { ok: true, skipped: true };
  const blob = await fetchImageBlob(message.dataUrl);
  await saveImageBlob(blob);
  return { ok: true };
}

async function handlePickerOpen(message, settings) {
  if (!settings.enablePasteMulti) return { ok: false };
  if (settings.enableCtrlC && message.clipboardText) {
    await persistText(message.clipboardText, settings);
  }
  if (!(await isUnlockValid())) return { ok: true, locked: true, items: [] };
  return { ok: true, items: await buildPickerList(settings.pasteCount) };
}

async function handlePickerGetText(message, settings) {
  if (!settings.enablePasteMulti || !(await isUnlockValid())) return { ok: false };
  const text = await readEntryContent(message.id);
  return text === null ? { ok: false } : { ok: true, text };
}

async function handlePickerGetByIndex(message, settings) {
  if (!settings.enablePasteMulti || !(await isUnlockValid())) return { ok: false };
  const items = await buildPickerList(settings.pasteCount);
  const item = items[message.index];
  if (!item) return { ok: false };
  const text = await readEntryContent(item.id);
  return text === null ? { ok: false } : { ok: true, text };
}

const MESSAGE_HANDLERS = {
  [MSG.SAVE_TEXT]: handleSaveText,
  [MSG.SAVE_IMAGE]: handleSaveImage,
  [MSG.PICKER_OPEN]: handlePickerOpen,
  [MSG.PICKER_GET_TEXT]: handlePickerGetText,
  [MSG.PICKER_GET_BY_INDEX]: handlePickerGetByIndex
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = message && MESSAGE_HANDLERS[message.type];
  if (sender.id !== chrome.runtime.id || !handler) return false;

  getSettings()
    .then((settings) => handler(message, settings))
    .then(sendResponse)
    .catch((error) => {
      console.error('CopyLoad message error:', error);
      sendResponse({ ok: false, error: String(error && error.message ? error.message : error) });
    });
  return true; // keep the channel open for the async response
});

// ---------- Context menus ----------

async function rebuildContextMenus() {
  const { language } = await getSettings();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_IDS.SAVE_TEXT,
    title: translate(language, 'menuSaveText'),
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: MENU_IDS.SAVE_IMAGE,
    title: translate(language, 'menuSaveImage'),
    contexts: ['image']
  });
}

// Menu clicks are explicit user actions, so they ignore the "save on Ctrl+C" switch.
chrome.contextMenus.onClicked.addListener(async (info) => {
  try {
    const settings = await getSettings();
    if (info.menuItemId === MENU_IDS.SAVE_TEXT && info.selectionText) {
      await persistText(info.selectionText, settings);
    } else if (info.menuItemId === MENU_IDS.SAVE_IMAGE && info.srcUrl && settings.enablePersistent) {
      await saveImageBlob(await fetchImageBlob(info.srcUrl));
    }
  } catch (error) {
    console.error('CopyLoad context menu error:', error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'language' in changes) rebuildContextMenus();
});

chrome.runtime.onInstalled.addListener(() => {
  rebuildContextMenus();
  maybeAutoCleanup();
});

chrome.runtime.onStartup.addListener(() => {
  maybeAutoCleanup();
});

// Temporary clipboard entries (storage.session). Cleared when the browser closes.
// Used when "save permanently" is off.

function createTempId() {
  return `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isTempId(id) {
  return typeof id === 'string' && id.startsWith('t_');
}

async function listTemp() {
  const result = await chrome.storage.session.get(STORAGE_KEYS.TEMP_TEXTS);
  return result[STORAGE_KEYS.TEMP_TEXTS] || [];
}

async function writeTemp(entries) {
  await chrome.storage.session.set({ [STORAGE_KEYS.TEMP_TEXTS]: entries });
}

async function addTemp(rawContent) {
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!content || content.length > LIMITS.TEMP_MAX_CHARS) return null;

  const entries = await listTemp();
  const existing = entries.find((entry) => entry.content === content);
  const entry = existing || {
    id: createTempId(),
    content,
    kind: classifyText(content),
    temp: true
  };
  entry.savedAt = Date.now();

  const rest = entries.filter((e) => e.id !== entry.id);
  await writeTemp([entry, ...rest].slice(0, LIMITS.TEMP_MAX_ITEMS));
  return entry;
}

async function removeTemp(ids) {
  const toRemove = new Set(ids);
  const entries = await listTemp();
  await writeTemp(entries.filter((entry) => !toRemove.has(entry.id)));
}

async function getTemp(id) {
  const entries = await listTemp();
  return entries.find((entry) => entry.id === id) || null;
}

async function clearTemp() {
  await writeTemp([]);
}

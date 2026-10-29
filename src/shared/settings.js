// Settings access. Preferences follow the profile (storage.sync);
// device-specific switches stay in storage.local.

function settingsAreaOf(key) {
  return SETTINGS_SCHEMA[key].area === 'sync' ? chrome.storage.sync : chrome.storage.local;
}

function normalizeSetting(key, value) {
  const def = SETTINGS_SCHEMA[key];
  if (value === undefined || value === null) return def.default;
  if (def.allowed && !def.allowed.includes(value)) return def.default;
  if (typeof def.default === 'boolean') return value !== false;
  return value;
}

async function getSettings() {
  const keys = Object.keys(SETTINGS_SCHEMA);
  const syncKeys = keys.filter((k) => SETTINGS_SCHEMA[k].area === 'sync');
  const localKeys = keys.filter((k) => SETTINGS_SCHEMA[k].area === 'local' || SETTINGS_SCHEMA[k].legacyLocal);

  const [syncValues, localValues] = await Promise.all([
    chrome.storage.sync.get(syncKeys).catch(() => ({})),
    chrome.storage.local.get(localKeys)
  ]);

  const settings = {};
  for (const key of keys) {
    const def = SETTINGS_SCHEMA[key];
    let raw;
    if (def.area === 'sync') {
      raw = syncValues[key];
      if (raw === undefined && def.legacyLocal) raw = localValues[key];
    } else {
      raw = localValues[key];
    }
    settings[key] = normalizeSetting(key, raw);
  }
  return settings;
}

async function setSetting(key, value) {
  if (!(key in SETTINGS_SCHEMA)) throw new Error(`Unknown setting: ${key}`);
  await settingsAreaOf(key).set({ [key]: normalizeSetting(key, value) });
}

// listener receives { key: newValue } for every known setting that changed.
function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' && area !== 'local') return;
    const updates = {};
    for (const key of Object.keys(changes)) {
      const def = SETTINGS_SCHEMA[key];
      if (!def) continue;
      const belongsHere = def.area === area || (area === 'local' && def.legacyLocal);
      if (belongsHere) updates[key] = normalizeSetting(key, changes[key].newValue);
    }
    if (Object.keys(updates).length) listener(updates);
  });
}

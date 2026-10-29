// Data view: export (optionally encrypted), import, cleanup, delete all.

const CLEANUP_DAY_OPTIONS = [7, 30, 90, 180, 365];
const CLEANUP_DEFAULT_DAYS = 30;
const MAX_IMPORT_KDF_ITERATIONS = 1000000; // refuse files that would freeze the UI while deriving a key
const TXT_EXPORT_SEPARATOR = '\n\n----------\n\n';

async function refreshDataSummary() {
  const [texts, images] = await Promise.all([countRecords(STORE.TEXTS), countRecords(STORE.IMAGES)]);
  let size = '—';
  try {
    const estimate = await navigator.storage.estimate();
    size = formatBytes(estimate.usage || 0);
  } catch (_) { /* estimate is optional */ }
  $('storageSummary').textContent = t('storageSummary', { texts, images, size });
}

async function refreshAllViews() {
  await Promise.all([refreshTexts(), refreshImages(), refreshDataSummary()]);
}

// ---------- export ----------

async function collectExportPayload(includeImages) {
  const { records } = await scanStore(STORE.TEXTS, {});
  const texts = records.map((record) => {
    const entry = { content: record.content, savedAt: record.savedAt };
    if (record.pinned) entry.pinned = true;
    return entry;
  });

  const images = [];
  if (includeImages) {
    for (const id of await getAllIds(STORE.IMAGES)) {
      const record = await getImageById(id);
      if (!record) continue;
      const entry = { dataUrl: await blobToDataUrl(record.blob), savedAt: record.savedAt };
      if (record.pinned) entry.pinned = true;
      images.push(entry);
    }
  }
  return {
    app: EXPORT_FORMAT.APP,
    schema: EXPORT_FORMAT.SCHEMA,
    exportedAt: new Date().toISOString(),
    texts,
    images
  };
}

function readExportPassword() {
  const password = $('exportPassword').value;
  if (password.length < LIMITS.EXPORT_MIN_PASSWORD) {
    toast(t('passwordTooShort', { n: LIMITS.EXPORT_MIN_PASSWORD }), 'error');
    return null;
  }
  if (password !== $('exportPasswordConfirm').value) {
    toast(t('passwordMismatch'), 'error');
    return null;
  }
  return password;
}

async function exportJson() {
  const encrypt = $('exportEncrypt').checked;
  const password = encrypt ? readExportPassword() : '';
  if (encrypt && password === null) return;

  const payload = await collectExportPayload($('exportImages').checked);
  if (!payload.texts.length && !payload.images.length) {
    toast(t('exportEmpty'), 'error');
    return;
  }
  const json = JSON.stringify(payload);
  const fileContent = encrypt ? JSON.stringify(await encryptWithPassword(json, password)) : json;
  const suffix = encrypt ? '-encrypted' : '';
  downloadBlob(new Blob([fileContent], { type: 'application/json' }), `copyload-backup-${timestampForFilename()}${suffix}.json`);
  toast(t('exportDone'));
}

async function exportTxt() {
  const { records } = await scanStore(STORE.TEXTS, {});
  if (!records.length) {
    toast(t('exportEmpty'), 'error');
    return;
  }
  const content = records.map((record, index) => `${index + 1}. ${record.content}`).join(TXT_EXPORT_SEPARATOR);
  downloadBlob(new Blob([content], { type: 'text/plain' }), `copyload-${timestampForFilename()}.txt`);
  toast(t('exportDone'));
}

// ---------- import ----------

function normalizeImportedTexts(list) {
  return list.map((item) => {
    if (typeof item === 'string') return { content: item };
    const source = item || {};
    return {
      content: source.content !== undefined ? source.content : source.text,
      savedAt: source.savedAt !== undefined ? source.savedAt : source.createdAt,
      pinned: Boolean(source.pinned)
    };
  });
}

// Accepts the current format and the v2.0.x export ({ texts: [...] }).
function parseImportData(data) {
  if (Array.isArray(data)) return { texts: normalizeImportedTexts(data), images: [] };
  if (data && Array.isArray(data.texts)) {
    return {
      texts: normalizeImportedTexts(data.texts),
      images: Array.isArray(data.images) ? data.images : []
    };
  }
  throw new Error('Unrecognised import format');
}

async function decryptImportEnvelope(envelope) {
  const valid = envelope.salt && envelope.iv && envelope.data
    && Number.isInteger(envelope.iterations)
    && envelope.iterations > 0
    && envelope.iterations <= MAX_IMPORT_KDF_ITERATIONS;
  if (!valid) throw new Error('Malformed encrypted file');

  let plain = null;
  const password = await passwordDialog({
    title: t('importPasswordTitle'),
    text: t('importPasswordText'),
    label: t('importPasswordLabel'),
    verify: async (candidate) => {
      try {
        plain = await decryptWithPassword(envelope, candidate);
        return null;
      } catch (_) {
        return t('importWrongPassword');
      }
    }
  });
  return password === null ? null : JSON.parse(plain);
}

async function importImages(images) {
  let added = 0;
  let skipped = 0;
  for (const entry of images) {
    try {
      if (!entry || typeof entry.dataUrl !== 'string' || !entry.dataUrl.startsWith('data:image/')) throw new Error('bad image');
      const blob = await dataUrlToBlob(entry.dataUrl);
      const savedAt = Number.isFinite(entry.savedAt) ? entry.savedAt : Date.now();
      if (await importImageBlob(blob, { savedAt, pinned: Boolean(entry.pinned) })) added++;
      else skipped++;
    } catch (_) {
      skipped++;
    }
  }
  return { added, skipped };
}

async function importFromFile(file) {
  const raw = await file.text();
  let parsed;
  if (/\.txt$/i.test(file.name)) {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    parsed = { texts: lines.map((content) => ({ content })), images: [] };
  } else {
    let data;
    try {
      data = JSON.parse(raw);
      if (data && data.encrypted === true) {
        data = await decryptImportEnvelope(data);
        if (data === null) return; // user cancelled the password prompt
      }
      parsed = parseImportData(data);
    } catch (_) {
      toast(t('importInvalidFile'), 'error');
      return;
    }
  }

  const textResult = await importTextEntries(parsed.texts);
  const imageResult = await importImages(parsed.images);
  toast(t('importDone', {
    added: textResult.added + imageResult.added,
    skipped: textResult.skipped + imageResult.skipped
  }));
  await refreshAllViews();
}

// ---------- cleanup + delete all ----------

async function cleanupOldItems() {
  const days = Number($('cleanupDays').value);
  const confirmed = await confirmDialog({
    title: t('cleanupConfirmTitle', { n: days }),
    text: t('cleanupDesc'),
    confirmLabel: t('delete')
  });
  if (!confirmed) return;
  const result = await deleteOlderThan(days);
  const total = result.texts + result.images;
  toast(total ? t('cleanupDone', { n: total }) : t('cleanupNothing', { n: days }));
  await refreshAllViews();
}

async function clearAllData() {
  const confirmed = await confirmDialog({
    title: t('clearAllConfirmTitle'),
    text: t('clearAllConfirmText'),
    confirmLabel: t('delete')
  });
  if (!confirmed) return;
  const keepPinned = $('clearKeepPinned').checked;
  await Promise.all([
    clearStore(STORE.TEXTS, { keepPinned }),
    clearStore(STORE.IMAGES, { keepPinned }),
    clearTemp()
  ]);
  toast(t('clearAllDone'));
  await refreshAllViews();
}

// Runs an async handler with the button disabled and errors surfaced as a toast.
function withBusyButton(button, handler) {
  return async () => {
    button.disabled = true;
    try {
      await handler();
    } catch (error) {
      reportError(error);
    } finally {
      button.disabled = false;
    }
  };
}

function initDataView() {
  const cleanupSelect = $('cleanupDays');
  cleanupSelect.replaceChildren(...CLEANUP_DAY_OPTIONS.map((days) => h('option', { value: String(days) })));
  cleanupSelect.value = String(CLEANUP_DEFAULT_DAYS);

  $('exportEncrypt').addEventListener('change', (event) => {
    $('exportPasswordBox').hidden = !event.target.checked;
  });
  $('exportBtn').addEventListener('click', withBusyButton($('exportBtn'), exportJson));
  $('exportTxtBtn').addEventListener('click', withBusyButton($('exportTxtBtn'), exportTxt));
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', withBusyButton($('importBtn'), async () => {
    const input = $('importFile');
    const [file] = input.files;
    input.value = '';
    if (file) await importFromFile(file);
  }));
  $('cleanupBtn').addEventListener('click', withBusyButton($('cleanupBtn'), cleanupOldItems));
  $('clearAllBtn').addEventListener('click', withBusyButton($('clearAllBtn'), clearAllData));
}

// Option labels depend on the language, so they are rebuilt whenever it changes.
function relabelDataView() {
  Array.from($('cleanupDays').options).forEach((option) => {
    option.textContent = t('daysUnit', { n: option.value });
  });
}

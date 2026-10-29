// IndexedDB layer shared by the service worker and the extension pages.
// Records:
//   texts:  { id, content, hash, savedAt, kind, pinned? }
//   images: { id, blob, thumbnail, savedAt, size, type, pinned? }
// `pinned` is 1 only when pinned and absent otherwise, so the "pinned" index stays sparse.

let dbPromise = null;

function ensureIndex(store, name, keyPath) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath);
}

function upgradeDb(db, tx) {
  const getOrCreate = (name) => (db.objectStoreNames.contains(name)
    ? tx.objectStore(name)
    : db.createObjectStore(name, { keyPath: 'id', autoIncrement: true }));

  const texts = getOrCreate(STORE.TEXTS);
  ensureIndex(texts, 'hash', 'hash');
  ensureIndex(texts, 'savedAt', 'savedAt');
  ensureIndex(texts, 'pinned', 'pinned');

  const images = getOrCreate(STORE.IMAGES);
  ensureIndex(images, 'savedAt', 'savedAt');
  ensureIndex(images, 'pinned', 'pinned');
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);
    request.onupgradeneeded = () => upgradeDb(request.result, request.transaction);
    request.onsuccess = () => {
      const db = request.result;
      const reset = () => { dbPromise = null; };
      db.onclose = reset;
      db.onversionchange = () => { db.close(); reset(); };
      resolve(db);
    };
    request.onerror = () => { dbPromise = null; reject(request.error); };
    request.onblocked = () => console.warn('CopyLoad: database upgrade waits for other open tabs');
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

// ==================== TEXTS ====================

// Kept identical to v2.0.x so existing records still dedupe.
function hashText(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function normalizeText(raw) {
  if (typeof raw !== 'string') return null;
  const content = raw.trim();
  if (!content || content.length > LIMITS.MAX_TEXT_CHARS) return null;
  return content;
}

// Same text saved again only moves to the top (and may gain a pin).
async function saveTextEntry(raw, { savedAt = Date.now(), pinned = false } = {}) {
  const content = normalizeText(raw);
  if (!content) return null;

  const db = await openDb();
  const tx = db.transaction(STORE.TEXTS, 'readwrite');
  const store = tx.objectStore(STORE.TEXTS);
  const hash = hashText(content);

  const candidates = await requestToPromise(store.index('hash').getAll(hash));
  const existing = candidates.find((rec) => rec.content === content);

  let id;
  if (existing) {
    existing.savedAt = Math.max(existing.savedAt, savedAt);
    if (pinned) existing.pinned = 1;
    await requestToPromise(store.put(existing));
    id = existing.id;
  } else {
    const record = { content, hash, savedAt, kind: classifyText(content) };
    if (pinned) record.pinned = 1;
    id = await requestToPromise(store.add(record));
  }
  await transactionDone(tx);
  return { id, duplicate: Boolean(existing) };
}

function buildTextMatcher({ search = '', kind = 'all' } = {}) {
  const needle = search.trim().toLowerCase();
  return (rec) => {
    if (kind !== 'all' && kind !== 'pinned' && (rec.kind || classifyText(rec.content)) !== kind) return false;
    return !needle || rec.content.toLowerCase().includes(needle);
  };
}

function toTextListItem(rec) {
  const content = rec.content;
  return {
    id: rec.id,
    preview: content.length > LIMITS.PREVIEW_CHARS ? content.slice(0, LIMITS.PREVIEW_CHARS) : content,
    length: content.length,
    savedAt: rec.savedAt,
    kind: rec.kind || classifyText(content),
    pinned: Boolean(rec.pinned)
  };
}

// Walks the savedAt index newest-first. cursor = { savedAt, id } of the last item already shown.
async function scanStore(storeName, { cursor = null, limit = Infinity, accept = () => true } = {}) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = db.transaction(storeName, 'readonly').objectStore(storeName);
    const range = cursor ? IDBKeyRange.upperBound(cursor.savedAt) : null;
    const records = [];
    const request = store.index('savedAt').openCursor(range, 'prev');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return resolve({ records, hasMore: false });
      const rec = current.value;
      const alreadyShown = cursor && rec.savedAt === cursor.savedAt && rec.id >= cursor.id;
      if (!alreadyShown && accept(rec)) {
        if (records.length >= limit) return resolve({ records, hasMore: true });
        records.push(rec);
      }
      current.continue();
    };
  });
}

function toPage(records, hasMore, mapper) {
  const last = records[records.length - 1];
  return {
    items: records.map(mapper),
    nextCursor: hasMore && last ? { savedAt: last.savedAt, id: last.id } : null
  };
}

// Unpinned texts, one page. Pinned ones come from queryPinnedTexts.
async function queryTexts({ search = '', kind = 'all', cursor = null, limit = LIMITS.PAGE_SIZE } = {}) {
  const matches = buildTextMatcher({ search, kind });
  const { records, hasMore } = await scanStore(STORE.TEXTS, {
    cursor,
    limit,
    accept: (rec) => !rec.pinned && matches(rec)
  });
  return toPage(records, hasMore, toTextListItem);
}

async function getPinnedRecords(storeName) {
  const db = await openDb();
  const store = db.transaction(storeName, 'readonly').objectStore(storeName);
  const records = await requestToPromise(store.index('pinned').getAll());
  return records.sort((a, b) => b.savedAt - a.savedAt);
}

async function queryPinnedTexts({ search = '', kind = 'all' } = {}) {
  const matches = buildTextMatcher({ search, kind });
  const records = await getPinnedRecords(STORE.TEXTS);
  return records.filter(matches).map(toTextListItem);
}

// Every id matching the filter (pinned included). Powers "select all".
async function queryTextIds(filter = {}) {
  const matches = buildTextMatcher(filter);
  const { records } = await scanStore(STORE.TEXTS, { accept: matches });
  return records.map((rec) => rec.id);
}

async function getTextById(id) {
  const db = await openDb();
  const rec = await requestToPromise(db.transaction(STORE.TEXTS, 'readonly').objectStore(STORE.TEXTS).get(id));
  return rec || null;
}

// Bulk insert used by import. Keeps original timestamps, skips duplicates.
async function importTextEntries(entries) {
  const db = await openDb();
  const tx = db.transaction(STORE.TEXTS, 'readwrite');
  const store = tx.objectStore(STORE.TEXTS);
  const hashIndex = store.index('hash');
  let added = 0;
  let skipped = 0;

  for (const entry of entries) {
    const content = normalizeText(entry && entry.content);
    if (!content) { skipped++; continue; }
    const savedAt = Number.isFinite(entry.savedAt) ? entry.savedAt : Date.now();
    const hash = hashText(content);
    const existing = (await requestToPromise(hashIndex.getAll(hash))).find((rec) => rec.content === content);
    if (existing) {
      if (entry.pinned && !existing.pinned) {
        existing.pinned = 1;
        await requestToPromise(store.put(existing));
      }
      skipped++;
      continue;
    }
    const record = { content, hash, savedAt, kind: classifyText(content) };
    if (entry.pinned) record.pinned = 1;
    await requestToPromise(store.add(record));
    added++;
  }
  await transactionDone(tx);
  return { added, skipped };
}

// ==================== IMAGES ====================

async function createThumbnail(blob) {
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(blob);
    const scale = Math.min(LIMITS.THUMB_MAX_SIDE / bitmap.width, LIMITS.THUMB_MAX_SIDE / bitmap.height, 1);
    const width = Math.max(Math.round(bitmap.width * scale), 1);
    const height = Math.max(Math.round(bitmap.height * scale), 1);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: LIMITS.THUMB_QUALITY });
  } catch (_) {
    return null; // e.g. SVG: the UI falls back to the original blob
  } finally {
    if (bitmap) bitmap.close();
  }
}

function isAcceptableImage(blob) {
  return blob instanceof Blob
    && blob.size > 0
    && blob.size <= LIMITS.MAX_IMAGE_BYTES
    && blob.type.startsWith('image/');
}

async function saveImageBlob(blob, { savedAt = Date.now(), pinned = false } = {}) {
  if (!isAcceptableImage(blob)) return null;
  const thumbnail = await createThumbnail(blob);
  const record = { blob, thumbnail, savedAt, size: blob.size, type: blob.type };
  if (pinned) record.pinned = 1;

  const db = await openDb();
  const tx = db.transaction(STORE.IMAGES, 'readwrite');
  const id = await requestToPromise(tx.objectStore(STORE.IMAGES).add(record));
  await transactionDone(tx);
  return id;
}

// Import skips an image that already exists with the same timestamp and size.
async function importImageBlob(blob, { savedAt, pinned }) {
  if (!isAcceptableImage(blob)) return false;
  const db = await openDb();
  const sameTime = await requestToPromise(
    db.transaction(STORE.IMAGES, 'readonly').objectStore(STORE.IMAGES).index('savedAt').getAll(savedAt)
  );
  if (sameTime.some((rec) => rec.size === blob.size)) return false;
  return (await saveImageBlob(blob, { savedAt, pinned })) !== null;
}

function toImageListItem(rec) {
  return {
    id: rec.id,
    size: rec.size,
    savedAt: rec.savedAt,
    type: rec.type || (rec.blob && rec.blob.type) || 'image/png',
    pinned: Boolean(rec.pinned),
    thumb: rec.thumbnail || rec.blob
  };
}

async function queryImages({ cursor = null, limit = LIMITS.PAGE_SIZE } = {}) {
  const { records, hasMore } = await scanStore(STORE.IMAGES, {
    cursor,
    limit,
    accept: (rec) => !rec.pinned
  });
  return toPage(records, hasMore, toImageListItem);
}

async function queryPinnedImages() {
  const records = await getPinnedRecords(STORE.IMAGES);
  return records.map(toImageListItem);
}

async function queryImageIds() {
  const { records } = await scanStore(STORE.IMAGES, {});
  return records.map((rec) => rec.id);
}

async function getImageById(id) {
  const db = await openDb();
  const rec = await requestToPromise(db.transaction(STORE.IMAGES, 'readonly').objectStore(STORE.IMAGES).get(id));
  return rec || null;
}

// ==================== SHARED OPERATIONS ====================

async function getAllIds(storeName) {
  const db = await openDb();
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAllKeys());
}

async function countRecords(storeName) {
  const db = await openDb();
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).count());
}

async function deleteRecords(storeName, ids) {
  if (!ids.length) return;
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const id of ids) store.delete(id);
  await transactionDone(tx);
}

async function setPinned(storeName, ids, pinned) {
  if (!ids.length) return;
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (const id of ids) {
    const rec = await requestToPromise(store.get(id));
    if (!rec) continue;
    if (pinned) rec.pinned = 1;
    else delete rec.pinned;
    await requestToPromise(store.put(rec));
  }
  await transactionDone(tx);
}

async function clearStore(storeName, { keepPinned = false } = {}) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  if (!keepPinned) {
    store.clear();
  } else {
    await new Promise((resolve, reject) => {
      const request = store.openCursor();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve();
        if (!cursor.value.pinned) cursor.delete();
        cursor.continue();
      };
    });
  }
  await transactionDone(tx);
}

async function deleteStoreOlderThan(storeName, cutoff) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const index = tx.objectStore(storeName).index('savedAt');
  let deleted = 0;
  await new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.upperBound(cutoff, true));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve();
      if (!cursor.value.pinned) {
        cursor.delete();
        deleted++;
      }
      cursor.continue();
    };
  });
  await transactionDone(tx);
  return deleted;
}

// Pinned items are never removed.
async function deleteOlderThan(days) {
  const cutoff = Date.now() - days * TIMING.DAY_MS;
  const [texts, images] = await Promise.all([
    deleteStoreOlderThan(STORE.TEXTS, cutoff),
    deleteStoreOlderThan(STORE.IMAGES, cutoff)
  ]);
  return { texts, images };
}

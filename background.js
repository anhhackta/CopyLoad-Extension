// CopyLoad v2.0.1 - Background Service Worker
// Uses chrome.storage.local for settings (shared) and IndexedDB for data

const DB_NAME = 'CopyLoadDB';
const DB_VERSION = 1;
let db = null;
let settings = { enableCtrlC: true, enablePersistent: true };

// Load settings from chrome.storage (shared between popup and background)
async function loadSettings() {
  const result = await chrome.storage.local.get(['enableCtrlC', 'enablePersistent', 'premiumKey']);
  settings.enableCtrlC = result.enableCtrlC !== false;
  settings.enablePersistent = result.enablePersistent !== false;
  settings.premiumKey = result.premiumKey || '';
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if ('enableCtrlC' in changes) settings.enableCtrlC = changes.enableCtrlC.newValue !== false;
    if ('enablePersistent' in changes) settings.enablePersistent = changes.enablePersistent.newValue !== false;
    if ('premiumKey' in changes) settings.premiumKey = changes.premiumKey.newValue || '';
  }
});

// Init IndexedDB
async function initDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      db.onclose = () => { db = null; };
      db.onversionchange = () => { db.close(); db = null; };
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('texts')) {
        const store = database.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
        store.createIndex('hash', 'hash');
        store.createIndex('savedAt', 'savedAt');
      }
      if (!database.objectStoreNames.contains('images')) {
        database.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Hash function
function hashText(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// Save text
async function saveText(content) {
  if (!content || !settings.enableCtrlC) return;

  try {
    await initDB();
    const hash = hashText(content);

    // Check for duplicates if premium
    if (settings.premiumKey === 'COPYLOAD2026') {
      const existing = await new Promise(resolve => {
        const tx = db.transaction('texts', 'readonly');
        const index = tx.objectStore('texts').index('hash');
        const req = index.get(hash);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (existing) {
        // Update timestamp
        existing.savedAt = Date.now();
        const tx = db.transaction('texts', 'readwrite');
        tx.objectStore('texts').put(existing);
        return;
      }
    }

    const text = { content, hash, savedAt: Date.now() };
    const tx = db.transaction('texts', 'readwrite');
    tx.objectStore('texts').add(text);

  } catch (e) {
    console.error('Error saving text:', e);
  }
}

// Save image from URL
async function saveImageFromUrl(url) {
  if (!settings.enableCtrlC) return;

  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    await saveImageBlob(blob);
  } catch (e) {
    console.error('Error fetching image:', e);
    // Try no-cors fallback
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      if (blob.size > 0) await saveImageBlob(blob);
    } catch (e2) {
      console.error('Fallback failed:', e2);
    }
  }
}

// Save image from base64
async function saveImageFromBase64(base64) {
  if (!settings.enableCtrlC) return;

  try {
    const response = await fetch(base64);
    const blob = await response.blob();
    await saveImageBlob(blob);
  } catch (e) {
    console.error('Error saving base64 image:', e);
  }
}

// Save image blob
async function saveImageBlob(blob) {
  if (!blob || blob.size === 0) return;

  try {
    await initDB();

    // Check limits for free users
    if (settings.premiumKey !== 'COPYLOAD2026') {
      const count = await new Promise(resolve => {
        const tx = db.transaction('images', 'readonly');
        const req = tx.objectStore('images').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });

      if (count >= 100) {
        console.log('Image limit reached (100)');
        return;
      }
    }

    // Create thumbnail using OffscreenCanvas (200px, high quality)
    let thumbnail = null;
    try {
      const bitmap = await createImageBitmap(blob);
      const maxSize = 200;
      const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
      const w = Math.max(Math.round(bitmap.width * scale), 1);
      const h = Math.max(Math.round(bitmap.height * scale), 1);
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      thumbnail = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    } catch (e) {
      console.log('Thumbnail creation failed:', e);
    }

    const image = { blob, thumbnail, savedAt: Date.now(), size: blob.size };
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').add(image);

  } catch (e) {
    console.error('Error saving image:', e);
  }
}

// Context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveText',
    title: 'Lưu vào CopyLoad',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'saveImage',
    title: 'Lưu ảnh vào CopyLoad',
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  await loadSettings();

  if (info.menuItemId === 'saveText' && info.selectionText) {
    await saveText(info.selectionText.trim());
  }

  if (info.menuItemId === 'saveImage' && info.srcUrl) {
    await saveImageFromUrl(info.srcUrl);
  }
});

// Message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  (async () => {
    try {
      await loadSettings();

      if (req.action === 'saveText' && req.text) {
        await saveText(req.text);
        sendResponse({ success: true });
        return;
      }

      if (req.action === 'saveImage') {
        if (req.imageData) await saveImageFromBase64(req.imageData);
        else if (req.imageUrl) await saveImageFromUrl(req.imageUrl);
        sendResponse({ success: true });
        return;
      }

      sendResponse({ success: false, error: 'Unknown action' });
    } catch (e) {
      console.error('Message handler error:', e);
      sendResponse({ success: false, error: e.message });
    }
  })();

  return true; // Keep channel open for async
});

// Init on startup
loadSettings();
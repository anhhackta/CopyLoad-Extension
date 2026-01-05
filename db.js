// CopyLoad Pro v3.0 - Database Module
// Uses IndexedDB for data, chrome.storage.local for settings (shared with service worker)

const DB_NAME = 'CopyLoadDB';
const DB_VERSION = 1;
const PREMIUM_KEY = 'COPYLOAD2026';
let db = null;

// ==================== DATABASE ====================

function initDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(db); };

        request.onupgradeneeded = (e) => {
            const database = e.target.result;

            if (!database.objectStoreNames.contains('texts')) {
                const texts = database.createObjectStore('texts', { keyPath: 'id', autoIncrement: true });
                texts.createIndex('hash', 'hash');
                texts.createIndex('savedAt', 'savedAt');
                texts.createIndex('folderId', 'folderId');
            }

            if (!database.objectStoreNames.contains('images')) {
                const images = database.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
                images.createIndex('savedAt', 'savedAt');
            }

            if (!database.objectStoreNames.contains('folders')) {
                database.createObjectStore('folders', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getStore(name, mode = 'readonly') {
    return db.transaction(name, mode).objectStore(name);
}

// ==================== SETTINGS (chrome.storage.local) ====================

const DEFAULT_SETTINGS = {
    theme: 'light',
    language: 'vi',
    enableCtrlC: true,
    enablePersistent: true,
    premiumKey: ''
};

async function getSetting(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key] ?? DEFAULT_SETTINGS[key];
}

async function setSetting(key, value) {
    await chrome.storage.local.set({ [key]: value });
}

async function getSettings() {
    const keys = Object.keys(DEFAULT_SETTINGS);
    const result = await chrome.storage.local.get(keys);
    return { ...DEFAULT_SETTINGS, ...result };
}

async function isPremium() {
    const key = await getSetting('premiumKey');
    return key === PREMIUM_KEY;
}

async function activatePremium(key) {
    if (key === PREMIUM_KEY) {
        await setSetting('premiumKey', key);
        return true;
    }
    return false;
}

async function deactivatePremium() {
    await setSetting('premiumKey', '');
}

// ==================== TEXTS ====================

function hashText(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

async function saveText(content, folderId = null) {
    await initDB();
    const hash = hashText(content);
    const premium = await isPremium();

    // Dedup for premium
    if (premium) {
        const existing = await getTextByHash(hash);
        if (existing) {
            existing.savedAt = Date.now();
            return updateText(existing);
        }
    }

    return new Promise((resolve, reject) => {
        const text = { content, hash, savedAt: Date.now(), folderId };
        const req = getStore('texts', 'readwrite').add(text);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getTextByHash(hash) {
    await initDB();
    return new Promise(resolve => {
        const req = getStore('texts').index('hash').get(hash);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function getAllTexts() {
    await initDB();
    return new Promise(resolve => {
        const texts = [];
        const req = getStore('texts').openCursor(null, 'prev');
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { texts.push(cursor.value); cursor.continue(); }
            else resolve(texts);
        };
        req.onerror = () => resolve([]);
    });
}

async function updateText(text) {
    await initDB();
    return new Promise((resolve, reject) => {
        const req = getStore('texts', 'readwrite').put(text);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function deleteText(id) {
    await initDB();
    return new Promise((resolve, reject) => {
        const req = getStore('texts', 'readwrite').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function clearAllTexts() {
    await initDB();
    return new Promise((resolve, reject) => {
        const req = getStore('texts', 'readwrite').clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function getTextCount() {
    await initDB();
    return new Promise(resolve => {
        const req = getStore('texts').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
    });
}

async function searchTexts(query) {
    const allTexts = await getAllTexts();
    const q = query.toLowerCase();
    return allTexts.filter(t => t.content.toLowerCase().includes(q));
}

// ==================== IMAGES ====================

async function saveImage(blob, thumbnail = null) {
    await initDB();
    const premium = await isPremium();

    if (!premium) {
        const count = await getImageCount();
        if (count >= 100) throw new Error('Image limit reached');
    }

    return new Promise((resolve, reject) => {
        const image = { blob, thumbnail, savedAt: Date.now(), size: blob.size };
        const req = getStore('images', 'readwrite').add(image);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveImageFromBase64(base64) {
    const res = await fetch(base64);
    const blob = await res.blob();
    const thumbnail = await createThumbnail(blob);
    return saveImage(blob, thumbnail);
}

function createThumbnail(blob, maxSize = 200) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = Math.max(Math.round(img.width * scale), 1);
            canvas.height = Math.max(Math.round(img.height * scale), 1);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resolve, 'image/jpeg', 0.85);
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(blob);
    });
}

async function getAllImages() {
    await initDB();
    return new Promise(resolve => {
        const images = [];
        const req = getStore('images').openCursor(null, 'prev');
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { images.push(cursor.value); cursor.continue(); }
            else resolve(images);
        };
        req.onerror = () => resolve([]);
    });
}

async function getImage(id) {
    await initDB();
    return new Promise(resolve => {
        const req = getStore('images').get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function deleteImage(id) {
    await initDB();
    return new Promise((resolve, reject) => {
        const req = getStore('images', 'readwrite').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function clearAllImages() {
    await initDB();
    return new Promise((resolve, reject) => {
        const req = getStore('images', 'readwrite').clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function getImageCount() {
    await initDB();
    return new Promise(resolve => {
        const req = getStore('images').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
    });
}

// ==================== FOLDERS ====================

async function createFolder(name, color = '#22C55E') {
    if (!await isPremium()) throw new Error('Premium feature');
    await initDB();
    return new Promise((resolve, reject) => {
        const folder = { name, color, createdAt: Date.now() };
        const req = getStore('folders', 'readwrite').add(folder);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getAllFolders() {
    await initDB();
    return new Promise(resolve => {
        const folders = [];
        const req = getStore('folders').openCursor();
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { folders.push(cursor.value); cursor.continue(); }
            else resolve(folders);
        };
        req.onerror = () => resolve([]);
    });
}

async function deleteFolder(id) {
    if (!await isPremium()) throw new Error('Premium feature');
    await initDB();
    return new Promise((resolve, reject) => {
        const req = getStore('folders', 'readwrite').delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ==================== STORAGE ====================

async function getStorageUsed() {
    await initDB();
    let total = 0;

    const images = await getAllImages();
    images.forEach(img => total += img.size || 0);

    const texts = await getAllTexts();
    texts.forEach(t => total += new Blob([t.content]).size);

    return total;
}

async function getStorageInfo() {
    const used = await getStorageUsed();
    const premium = await isPremium();
    const max = premium ? Infinity : 500 * 1024 * 1024;

    return {
        used,
        max,
        percent: premium ? 0 : (used / max) * 100,
        isPremium: premium
    };
}

// ==================== EXPORT ====================

window.CopyLoadDB = {
    initDB,
    // Settings
    getSetting, setSetting, getSettings,
    isPremium, activatePremium, deactivatePremium,
    // Texts
    saveText, getAllTexts, updateText, deleteText, clearAllTexts, getTextCount, searchTexts,
    // Images
    saveImage, saveImageFromBase64, getAllImages, getImage, deleteImage, clearAllImages, getImageCount,
    // Folders
    createFolder, getAllFolders, deleteFolder,
    // Storage
    getStorageUsed, getStorageInfo,
    PREMIUM_KEY
};

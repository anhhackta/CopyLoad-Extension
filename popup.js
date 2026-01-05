// CopyLoad v2.1 - Full Featured Popup
let enableCtrlC = true;
let enablePersistent = true;
let currentTab = 'text';
let currentTheme = 'light';
let currentLang = 'vi';
let contextImageIndex = -1;

// i18n
const i18n = {
    vi: {
        search: 'Tìm kiếm...',
        text: 'Text',
        images: 'Ảnh',
        download: 'Tải',
        openFullPage: 'Mở trang quản lý',
        importText: 'Import Text',
        exportText: 'Export Text',
        confirmDelete: 'Xác nhận xóa?',
        deleteWarning: 'Dữ liệu sẽ bị xóa vĩnh viễn.',
        cancel: 'Hủy',
        delete: 'Xóa',
        copyImage: 'Copy',
        downloadImage: 'Tải ảnh',
        deleteImage: 'Xóa ảnh',
        copied: 'Đã copy!',
        deleted: 'Đã xóa!',
        downloaded: 'Đã tải!',
        exported: 'Đã export!',
        imported: 'Đã import!',
        noData: 'Không có dữ liệu',
        noText: 'Chưa có text',
        noImage: 'Chưa có ảnh',
        noResult: 'Không tìm thấy',
        saveCtrlC: 'Lưu khi Ctrl+C',
        savePersistent: 'Lưu vào máy',
        subtitle: 'Quản lý Clipboard'
    },
    en: {
        search: 'Search...',
        text: 'Text',
        images: 'Images',
        download: 'Download',
        openFullPage: 'Open Full Page',
        importText: 'Import Text',
        exportText: 'Export Text',
        confirmDelete: 'Confirm Delete?',
        deleteWarning: 'Data will be permanently deleted.',
        cancel: 'Cancel',
        delete: 'Delete',
        copyImage: 'Copy',
        downloadImage: 'Download',
        deleteImage: 'Delete',
        copied: 'Copied!',
        deleted: 'Deleted!',
        downloaded: 'Downloaded!',
        exported: 'Exported!',
        imported: 'Imported!',
        noData: 'No data',
        noText: 'No text yet',
        noImage: 'No images yet',
        noResult: 'No results',
        saveCtrlC: 'Save on Ctrl+C',
        savePersistent: 'Save to device',
        subtitle: 'Clipboard Manager'
    }
};

// DOM
const $ = id => document.getElementById(id);
const textList = $('textList');
const imageList = $('imageList');
const imageGrid = $('imageGrid');
const searchInput = $('searchInput');
const textCount = $('textCount');
const imageCount = $('imageCount');
const tabText = $('tabText');
const tabImages = $('tabImages');
const themeBtn = $('themeBtn');
const themeIcon = $('themeIcon');
const langBtn = $('langBtn');
const settingsBtn = $('settingsBtn');
const settingsContent = $('settingsContent');
const toggleCtrlC = $('toggleCtrlC');
const togglePersistent = $('togglePersistent');
const labelCtrlC = $('labelCtrlC');
const labelPersistent = $('labelPersistent');
const brandTitle = $('brandTitle');
const downloadBtn = $('downloadBtn');
const clearAllBtn = $('clearAllBtn');
const clearAllModal = $('clearAllModal');
const cancelClear = $('cancelClear');
const confirmClear = $('confirmClear');
const imagePreviewModal = $('imagePreviewModal');
const previewImage = $('previewImage');
const imageContextMenu = $('imageContextMenu');
const ctxCopyImage = $('ctxCopyImage');
const ctxDownloadImage = $('ctxDownloadImage');
const ctxDeleteImage = $('ctxDeleteImage');
const importBtn = $('importBtn');
const exportBtn = $('exportBtn');
const importFileInput = $('importFileInput');
const openFullPage = $('openFullPage');
const authorLink = $('authorLink');
const storageFill = $('storageFill');
const storageText = $('storageText');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupListeners();
    await loadData();
    await updateStorage();
});

// Load settings
async function loadSettings() {
    const res = await chrome.storage.local.get(['enableCtrlC', 'enablePersistent', 'theme', 'language']);
    enableCtrlC = res.enableCtrlC !== false;
    enablePersistent = res.enablePersistent !== false;
    currentTheme = res.theme || 'light';
    currentLang = res.language || 'vi';

    applyTheme();
    applyLang();
    updateToggles();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeIcon.innerHTML = currentTheme === 'dark'
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
}

function applyLang() {
    langBtn.textContent = currentLang === 'vi' ? 'VN' : 'EN';
    const t = i18n[currentLang];

    // Update all i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    labelCtrlC.textContent = t.saveCtrlC;
    labelPersistent.textContent = t.savePersistent;
    brandTitle.textContent = t.subtitle;
}

function updateToggles() {
    toggleCtrlC.classList.toggle('active', enableCtrlC);
    togglePersistent.classList.toggle('active', enablePersistent);
}

// Setup listeners
function setupListeners() {
    // Language toggle
    langBtn.onclick = async () => {
        currentLang = currentLang === 'vi' ? 'en' : 'vi';
        await chrome.storage.local.set({ language: currentLang });
        applyLang();
    };

    // Theme toggle
    themeBtn.onclick = async () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        await chrome.storage.local.set({ theme: currentTheme });
        applyTheme();
    };

    // Settings dropdown
    settingsBtn.onclick = e => {
        e.stopPropagation();
        settingsContent.classList.toggle('show');
    };

    // Toggle Ctrl+C
    toggleCtrlC.onclick = async () => {
        enableCtrlC = !enableCtrlC;
        await chrome.storage.local.set({ enableCtrlC });
        updateToggles();
    };

    // Toggle Persistent
    togglePersistent.onclick = async () => {
        enablePersistent = !enablePersistent;
        await chrome.storage.local.set({ enablePersistent });
        updateToggles();
    };

    // Close dropdowns
    document.onclick = () => {
        settingsContent.classList.remove('show');
        hideContextMenu();
    };

    // Tabs
    tabText.onclick = () => switchTab('text');
    tabImages.onclick = () => switchTab('images');

    // Open full page
    openFullPage.onclick = () => chrome.tabs.create({ url: 'index.html' });

    // Import/Export
    importBtn.onclick = () => importFileInput.click();
    importFileInput.onchange = importData;
    exportBtn.onclick = exportData;

    // Search
    searchInput.oninput = loadData;

    // Download
    downloadBtn.onclick = () => {
        if (currentTab === 'text') downloadTextAsTxt();
    };

    // Clear all
    clearAllBtn.onclick = () => clearAllModal.classList.add('show');
    cancelClear.onclick = () => clearAllModal.classList.remove('show');
    confirmClear.onclick = async () => {
        await clearAll();
        clearAllModal.classList.remove('show');
    };
    clearAllModal.onclick = e => { if (e.target === clearAllModal) clearAllModal.classList.remove('show'); };

    // Image preview
    imagePreviewModal.onclick = e => { if (e.target === imagePreviewModal) imagePreviewModal.classList.remove('show'); };

    // Context menu actions
    ctxCopyImage.onclick = copyContextImage;
    ctxDownloadImage.onclick = downloadContextImage;
    ctxDeleteImage.onclick = deleteContextImage;

    // Author
    authorLink.onclick = () => chrome.tabs.create({ url: 'https://github.com/anhhackta/' });

    // Reload on focus
    window.onfocus = () => { loadData(); updateStorage(); };

    // Storage changes
    chrome.storage.onChanged.addListener(() => { loadData(); updateStorage(); });
}

// Switch tabs
function switchTab(tab) {
    currentTab = tab;
    tabText.classList.toggle('active', tab === 'text');
    tabImages.classList.toggle('active', tab === 'images');
    textList.classList.toggle('active', tab === 'text');
    imageList.classList.toggle('active', tab === 'images');
}

// Load all data
async function loadData() {
    await Promise.all([loadTexts(), loadImages()]);
}

// Load texts
async function loadTexts() {
    const [temp, local] = await Promise.all([
        chrome.storage.session.get(['clipboard_temp']),
        chrome.storage.local.get(['clipboard_persistent'])
    ]);

    const tempTexts = temp.clipboard_temp || [];
    const persistentTexts = local.clipboard_persistent || [];
    let allTexts = [...new Set([...tempTexts, ...persistentTexts])];

    textCount.textContent = allTexts.length;

    const q = searchInput.value.toLowerCase();
    if (q) allTexts = allTexts.filter(t => t.toLowerCase().includes(q));

    renderTexts(allTexts, tempTexts);
}

function renderTexts(texts, tempTexts) {
    const t = i18n[currentLang];
    if (!texts.length) {
        textList.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><div class="empty-state-text">${searchInput.value ? t.noResult : t.noText}</div></div>`;
        return;
    }

    textList.innerHTML = texts.map(text => {
        const isTemp = tempTexts.includes(text);
        return `<div class="text-item" data-text="${encodeURIComponent(text)}">
            <div class="text-content"><div class="text-line" title="${escapeHtml(text)}">${escapeHtml(truncate(text, 50))}</div></div>
            ${isTemp ? '<span class="temp-tag">temp</span>' : ''}
            <div class="text-actions">
                <button class="btn-sm btn-copy" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                <button class="btn-sm btn-delete" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg></button>
            </div>
        </div>`;
    }).join('');

    // Event delegation
    textList.onclick = async e => {
        const item = e.target.closest('.text-item');
        if (!item) return;
        const text = decodeURIComponent(item.dataset.text);

        if (e.target.closest('.btn-copy')) {
            await navigator.clipboard.writeText(text);
            notify(i18n[currentLang].copied, 'success');
        } else if (e.target.closest('.btn-delete')) {
            await deleteText(text);
        } else {
            await navigator.clipboard.writeText(text);
            notify(i18n[currentLang].copied, 'success');
        }
    };
}

// Load images
async function loadImages() {
    const res = await chrome.storage.local.get(['clipboard_images']);
    const images = res.clipboard_images || [];
    imageCount.textContent = images.length;
    renderImages(images);
}

function renderImages(images) {
    const t = i18n[currentLang];
    if (!images.length) {
        imageGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><div class="empty-state-text">${t.noImage}</div></div>`;
        return;
    }

    imageGrid.innerHTML = images.map((img, i) => `
        <div class="image-item" data-index="${i}">
            <img src="${img}" alt="">
            <div class="image-overlay">
                <button class="img-btn copy-img-btn" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                <button class="img-btn download-img-btn" title="Download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
                <button class="img-btn danger delete-img-btn" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg></button>
            </div>
        </div>
    `).join('');

    // Event handlers
    imageGrid.onclick = async e => {
        const item = e.target.closest('.image-item');
        if (!item) return;
        const idx = parseInt(item.dataset.index);

        if (e.target.closest('.copy-img-btn')) {
            await copyImageByIndex(idx);
        } else if (e.target.closest('.download-img-btn')) {
            downloadImageByIndex(idx);
        } else if (e.target.closest('.delete-img-btn')) {
            await deleteImageByIndex(idx);
        } else {
            // Click on image = preview
            previewImage.src = images[idx];
            imagePreviewModal.classList.add('show');
        }
    };

    // Right-click context menu
    imageGrid.oncontextmenu = e => {
        const item = e.target.closest('.image-item');
        if (item) {
            e.preventDefault();
            contextImageIndex = parseInt(item.dataset.index);
            showContextMenu(e.clientX, e.clientY);
        }
    };
}

// Context menu
function showContextMenu(x, y) {
    imageContextMenu.style.display = 'block';
    imageContextMenu.style.left = `${Math.min(x, window.innerWidth - 140)}px`;
    imageContextMenu.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
}

function hideContextMenu() {
    imageContextMenu.style.display = 'none';
    contextImageIndex = -1;
}

// Image actions
async function copyImageByIndex(idx) {
    const res = await chrome.storage.local.get(['clipboard_images']);
    const images = res.clipboard_images || [];
    if (images[idx]) {
        try {
            const response = await fetch(images[idx]);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            notify(i18n[currentLang].copied, 'success');
        } catch (e) {
            console.error('Copy failed:', e);
        }
    }
}

function downloadImageByIndex(idx) {
    chrome.storage.local.get(['clipboard_images']).then(res => {
        const images = res.clipboard_images || [];
        if (images[idx]) {
            const a = document.createElement('a');
            a.href = images[idx];
            a.download = `copyload_${Date.now()}.png`;
            a.click();
            notify(i18n[currentLang].downloaded, 'success');
        }
    });
}

async function deleteImageByIndex(idx) {
    const res = await chrome.storage.local.get(['clipboard_images']);
    const images = res.clipboard_images || [];
    images.splice(idx, 1);
    await chrome.storage.local.set({ clipboard_images: images });
    await loadImages();
    await updateStorage();
    notify(i18n[currentLang].deleted, 'success');
}

// Context menu actions
async function copyContextImage() {
    if (contextImageIndex >= 0) await copyImageByIndex(contextImageIndex);
    hideContextMenu();
}

function downloadContextImage() {
    if (contextImageIndex >= 0) downloadImageByIndex(contextImageIndex);
    hideContextMenu();
}

async function deleteContextImage() {
    if (contextImageIndex >= 0) await deleteImageByIndex(contextImageIndex);
    hideContextMenu();
}

// Delete text
async function deleteText(text) {
    const [temp, local] = await Promise.all([
        chrome.storage.session.get(['clipboard_temp']),
        chrome.storage.local.get(['clipboard_persistent'])
    ]);

    await Promise.all([
        chrome.storage.session.set({ clipboard_temp: (temp.clipboard_temp || []).filter(t => t !== text) }),
        chrome.storage.local.set({ clipboard_persistent: (local.clipboard_persistent || []).filter(t => t !== text) })
    ]);

    await loadTexts();
    await updateStorage();
    notify(i18n[currentLang].deleted, 'success');
}

// Clear all
async function clearAll() {
    if (currentTab === 'text') {
        await Promise.all([
            chrome.storage.session.set({ clipboard_temp: [] }),
            chrome.storage.local.set({ clipboard_persistent: [] })
        ]);
    } else {
        await chrome.storage.local.set({ clipboard_images: [] });
    }
    await loadData();
    await updateStorage();
    notify(i18n[currentLang].deleted, 'success');
}

// Download text as TXT
async function downloadTextAsTxt() {
    const [temp, local] = await Promise.all([
        chrome.storage.session.get(['clipboard_temp']),
        chrome.storage.local.get(['clipboard_persistent'])
    ]);

    const allTexts = [...new Set([...(temp.clipboard_temp || []), ...(local.clipboard_persistent || [])])];
    if (!allTexts.length) { notify(i18n[currentLang].noData, 'error'); return; }

    const content = allTexts.map((t, i) => `${i + 1}. ${t}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `copyload_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify(i18n[currentLang].downloaded, 'success');
}

// Export
async function exportData() {
    const local = await chrome.storage.local.get(['clipboard_persistent']);
    const texts = local.clipboard_persistent || [];
    if (!texts.length) { notify(i18n[currentLang].noData, 'error'); return; }

    const blob = new Blob([JSON.stringify({ version: '2.1', texts }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `copyload_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify(i18n[currentLang].exported, 'success');
    settingsContent.classList.remove('show');
}

// Import
async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        let newTexts = [];

        if (file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            newTexts = data.texts || [];
        } else {
            newTexts = text.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        }

        const local = await chrome.storage.local.get(['clipboard_persistent']);
        const merged = [...new Set([...newTexts, ...(local.clipboard_persistent || [])])];
        await chrome.storage.local.set({ clipboard_persistent: merged });
        await loadTexts();
        await updateStorage();
        notify(`${i18n[currentLang].imported} (${newTexts.length})`, 'success');
    } catch (err) {
        notify('Error', 'error');
    }

    e.target.value = '';
    settingsContent.classList.remove('show');
}

// Update storage
async function updateStorage() {
    try {
        const bytes = await chrome.storage.local.getBytesInUse();
        const max = chrome.storage.local.QUOTA_BYTES || 10485760;
        const pct = Math.min((bytes / max) * 100, 100);

        storageFill.style.width = `${pct}%`;
        storageFill.className = 'storage-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');

        if (bytes < 1024) storageText.textContent = `${bytes}B`;
        else if (bytes < 1048576) storageText.textContent = `${(bytes / 1024).toFixed(0)}KB`;
        else storageText.textContent = `${(bytes / 1048576).toFixed(1)}MB`;
    } catch (e) { }
}

// Helpers
function truncate(str, len) { return str.length <= len ? str : str.slice(0, len) + '...'; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function notify(msg, type = 'success') {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 1800);
}

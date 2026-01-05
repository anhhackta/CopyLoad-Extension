// CopyLoad Pro v3.0 - Popup Script
const DB = window.CopyLoadDB;
let currentTab = 'text';
let currentTheme = 'light';
let currentLang = 'vi';
let isPremiumUser = false;
let contextImageId = null;

// Complete i18n
const i18n = {
    vi: {
        search: 'Tìm kiếm...', text: 'Text', images: 'Ảnh', copy: 'Copy', paste: 'Dán',
        download: 'Tải ảnh', delete: 'Xóa', cancel: 'Hủy', import: 'Import', export: 'Export',
        openManager: 'Mở trang quản lý', saveCtrlC: 'Lưu khi Ctrl+C', savePersistent: 'Lưu vào máy',
        confirmDelete: 'Xác nhận xóa?', deleteWarning: 'Dữ liệu sẽ bị xóa vĩnh viễn.',
        copied: 'Đã copy!', deleted: 'Đã xóa!', exported: 'Đã xuất file!', imported: 'Đã nhập dữ liệu!',
        noText: 'Chưa có text nào', noImage: 'Chưa có ảnh nào', noResult: 'Không tìm thấy kết quả',
        limitReached: 'Đã đạt giới hạn. Nâng cấp Premium!', free: 'FREE', pro: 'PRO',
        settings: 'Cài đặt', language: 'Ngôn ngữ', theme: 'Giao diện', clearAll: 'Xóa tất cả',
        items: 'mục', storage: 'Dung lượng', premium: 'Premium', activate: 'Kích hoạt',
        deactivate: 'Hủy kích hoạt', activated: 'Đã kích hoạt!', invalidKey: 'Key không hợp lệ'
    },
    en: {
        search: 'Search...', text: 'Text', images: 'Images', copy: 'Copy', paste: 'Paste',
        download: 'Download', delete: 'Delete', cancel: 'Cancel', import: 'Import', export: 'Export',
        openManager: 'Open Manager', saveCtrlC: 'Save on Ctrl+C', savePersistent: 'Save to device',
        confirmDelete: 'Confirm delete?', deleteWarning: 'Data will be permanently deleted.',
        copied: 'Copied!', deleted: 'Deleted!', exported: 'Exported!', imported: 'Imported!',
        noText: 'No text yet', noImage: 'No images yet', noResult: 'No results found',
        limitReached: 'Limit reached. Upgrade to Premium!', free: 'FREE', pro: 'PRO',
        settings: 'Settings', language: 'Language', theme: 'Theme', clearAll: 'Clear all',
        items: 'items', storage: 'Storage', premium: 'Premium', activate: 'Activate',
        deactivate: 'Deactivate', activated: 'Activated!', invalidKey: 'Invalid key'
    }
};

// DOM Cache
const $ = id => document.getElementById(id);
const els = {
    textList: $('textList'), imageList: $('imageList'), imageGrid: $('imageGrid'),
    searchInput: $('searchInput'), textCount: $('textCount'), imageCount: $('imageCount'),
    tabText: $('tabText'), tabImages: $('tabImages'), themeBtn: $('themeBtn'),
    themeIcon: $('themeIcon'), langBtn: $('langBtn'), settingsBtn: $('settingsBtn'),
    settingsContent: $('settingsContent'), toggleCtrlC: $('toggleCtrlC'),
    togglePersistent: $('togglePersistent'), downloadBtn: $('downloadBtn'),
    clearAllBtn: $('clearAllBtn'), clearAllModal: $('clearAllModal'),
    cancelClear: $('cancelClear'), confirmClear: $('confirmClear'),
    imagePreviewModal: $('imagePreviewModal'), previewImage: $('previewImage'),
    imageContextMenu: $('imageContextMenu'), ctxCopyImage: $('ctxCopyImage'),
    ctxDownloadImage: $('ctxDownloadImage'), ctxDeleteImage: $('ctxDeleteImage'),
    importBtn: $('importBtn'), exportBtn: $('exportBtn'), importFileInput: $('importFileInput'),
    openFullPage: $('openFullPage'), authorLink: $('authorLink'),
    githubLink: $('githubLink'), donateLink: $('donateLink'),
    storageFill: $('storageFill'), storageText: $('storageText'), versionBadge: $('versionBadge')
};

// Init
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await DB.initDB();
        await loadSettings();
        setupListeners();
        await loadData();
        await updateStorage();
    } catch (e) {
        console.error('Init error:', e);
    }
});

// Load settings
async function loadSettings() {
    const settings = await DB.getSettings();
    currentTheme = settings.theme || 'light';
    currentLang = settings.language || 'vi';
    isPremiumUser = await DB.isPremium();

    applyTheme();
    applyLang();
    updateToggles(settings);
    updatePremiumBadge();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (els.themeIcon) {
        els.themeIcon.innerHTML = currentTheme === 'dark'
            ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
            : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
}

function applyLang() {
    const t = i18n[currentLang];
    if (els.langBtn) els.langBtn.textContent = currentLang === 'vi' ? 'VN' : 'EN';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
}

function updateToggles(settings) {
    if (els.toggleCtrlC) els.toggleCtrlC.classList.toggle('active', settings.enableCtrlC !== false);
    if (els.togglePersistent) els.togglePersistent.classList.toggle('active', settings.enablePersistent !== false);
}

function updatePremiumBadge() {
    if (els.versionBadge) {
        const t = i18n[currentLang];
        els.versionBadge.textContent = isPremiumUser ? t.pro : t.free;
        els.versionBadge.classList.toggle('pro', isPremiumUser);
    }
}

// Setup listeners
function setupListeners() {
    // Language
    if (els.langBtn) {
        els.langBtn.onclick = async () => {
            currentLang = currentLang === 'vi' ? 'en' : 'vi';
            await DB.setSetting('language', currentLang);
            applyLang();
            updatePremiumBadge();
        };
    }

    // Theme
    if (els.themeBtn) {
        els.themeBtn.onclick = async () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            await DB.setSetting('theme', currentTheme);
            applyTheme();
        };
    }

    // Settings dropdown
    if (els.settingsBtn) {
        els.settingsBtn.onclick = e => { e.stopPropagation(); els.settingsContent?.classList.toggle('show'); };
    }

    // Toggles
    if (els.toggleCtrlC) {
        els.toggleCtrlC.onclick = async () => {
            const isActive = !els.toggleCtrlC.classList.contains('active');
            els.toggleCtrlC.classList.toggle('active', isActive);
            await DB.setSetting('enableCtrlC', isActive);
        };
    }

    if (els.togglePersistent) {
        els.togglePersistent.onclick = async () => {
            const isActive = !els.togglePersistent.classList.contains('active');
            els.togglePersistent.classList.toggle('active', isActive);
            await DB.setSetting('enablePersistent', isActive);
        };
    }

    // Close dropdowns
    document.onclick = () => {
        els.settingsContent?.classList.remove('show');
        hideContextMenu();
    };

    // Tabs
    if (els.tabText) els.tabText.onclick = () => switchTab('text');
    if (els.tabImages) els.tabImages.onclick = () => switchTab('images');

    // Navigation
    if (els.openFullPage) els.openFullPage.onclick = () => chrome.tabs.create({ url: 'index.html' });
    if (els.authorLink) els.authorLink.onclick = () => chrome.tabs.create({ url: 'https://github.com/anhhackta/' });
    if (els.githubLink) els.githubLink.onclick = () => chrome.tabs.create({ url: 'https://github.com/anhhackta/' });
    if (els.donateLink) els.donateLink.onclick = () => chrome.tabs.create({ url: 'https://www.buymeacoffee.com/anhhackta' });

    // Import/Export
    if (els.importBtn) els.importBtn.onclick = () => els.importFileInput?.click();
    if (els.importFileInput) els.importFileInput.onchange = importData;
    if (els.exportBtn) els.exportBtn.onclick = exportData;

    // Search
    if (els.searchInput) {
        let searchTimeout;
        els.searchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadData, 150);
        };
    }

    // Download
    if (els.downloadBtn) els.downloadBtn.onclick = () => { if (currentTab === 'text') downloadTextAsTxt(); };

    // Clear all
    if (els.clearAllBtn) els.clearAllBtn.onclick = () => els.clearAllModal?.classList.add('show');
    if (els.cancelClear) els.cancelClear.onclick = () => els.clearAllModal?.classList.remove('show');
    if (els.confirmClear) els.confirmClear.onclick = async () => { await clearAll(); els.clearAllModal?.classList.remove('show'); };
    if (els.clearAllModal) els.clearAllModal.onclick = e => { if (e.target === els.clearAllModal) els.clearAllModal.classList.remove('show'); };

    // Image preview
    if (els.imagePreviewModal) els.imagePreviewModal.onclick = e => { if (e.target === els.imagePreviewModal) els.imagePreviewModal.classList.remove('show'); };

    // Context menu
    if (els.ctxCopyImage) els.ctxCopyImage.onclick = copyContextImage;
    if (els.ctxDownloadImage) els.ctxDownloadImage.onclick = downloadContextImage;
    if (els.ctxDeleteImage) els.ctxDeleteImage.onclick = deleteContextImage;
}

// Switch tabs
function switchTab(tab) {
    currentTab = tab;
    els.tabText?.classList.toggle('active', tab === 'text');
    els.tabImages?.classList.toggle('active', tab === 'images');
    els.textList?.classList.toggle('active', tab === 'text');
    els.imageList?.classList.toggle('active', tab === 'images');
}

// Load data
async function loadData() {
    await Promise.all([loadTexts(), loadImages()]);
}

// Load texts
async function loadTexts() {
    try {
        const q = els.searchInput?.value?.toLowerCase() || '';
        let texts = q ? await DB.searchTexts(q) : await DB.getAllTexts();
        const count = await DB.getTextCount();
        if (els.textCount) els.textCount.textContent = count;
        renderTexts(texts);
    } catch (e) {
        console.error('Load texts error:', e);
    }
}

function renderTexts(texts) {
    if (!els.textList) return;
    const t = i18n[currentLang];

    if (!texts.length) {
        els.textList.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div class="empty-state-text">${els.searchInput?.value ? t.noResult : t.noText}</div></div>`;
        return;
    }

    els.textList.innerHTML = texts.map(text => `
        <div class="text-item" data-id="${text.id}">
            <div class="text-content">
                <div class="text-line">${escapeHtml(text.content)}</div>
                <div class="text-time">${formatTime(text.savedAt)}</div>
            </div>
            <div class="text-actions">
                <button class="btn-sm btn-copy" title="${t.copy}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                <button class="btn-sm btn-delete" title="${t.delete}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
            </div>
        </div>
    `).join('');

    // Event delegation
    els.textList.onclick = async e => {
        const item = e.target.closest('.text-item');
        if (!item) return;

        const id = parseInt(item.dataset.id);
        const texts = await DB.getAllTexts();
        const text = texts.find(t => t.id === id);
        if (!text) return;

        if (e.target.closest('.btn-copy')) {
            await navigator.clipboard.writeText(text.content);
            notify(i18n[currentLang].copied);
        } else if (e.target.closest('.btn-delete')) {
            await DB.deleteText(id);
            await loadTexts(); await updateStorage();
            notify(i18n[currentLang].deleted);
        }
    };
}

// Load images
async function loadImages() {
    try {
        const images = await DB.getAllImages();
        if (els.imageCount) els.imageCount.textContent = images.length;
        renderImages(images);
    } catch (e) {
        console.error('Load images error:', e);
    }
}

function renderImages(images) {
    if (!els.imageGrid) return;
    const t = i18n[currentLang];

    if (!images.length) {
        els.imageGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><div class="empty-state-text">${t.noImage}</div></div>`;
        return;
    }

    els.imageGrid.innerHTML = images.map(img => {
        const src = img.thumbnail ? URL.createObjectURL(img.thumbnail) : URL.createObjectURL(img.blob);
        return `<div class="image-item" data-id="${img.id}">
            <img src="${src}" alt="">
            <div class="image-overlay">
                <button class="img-btn" data-action="copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                <button class="img-btn" data-action="download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                <button class="img-btn danger" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
            </div>
        </div>`;
    }).join('');

    // Event delegation
    els.imageGrid.onclick = async e => {
        const item = e.target.closest('.image-item');
        if (!item) return;

        const id = parseInt(item.dataset.id);
        const btn = e.target.closest('.img-btn');

        if (btn) {
            const action = btn.dataset.action;
            if (action === 'copy') await copyImage(id);
            else if (action === 'download') await downloadImage(id);
            else if (action === 'delete') await deleteImageItem(id);
        } else {
            // Preview
            previewImage(id);
        }
    };

    // Context menu on right click
    els.imageGrid.oncontextmenu = e => {
        const item = e.target.closest('.image-item');
        if (!item) return;
        e.preventDefault();

        contextImageId = parseInt(item.dataset.id);
        showContextMenu(e.clientX, e.clientY);
    };
}

// Image actions
async function copyImage(id) {
    const img = await DB.getImage(id);
    if (img) {
        try {
            await navigator.clipboard.write([new ClipboardItem({ [img.blob.type]: img.blob })]);
            notify(i18n[currentLang].copied);
        } catch (e) {
            console.error('Copy image error:', e);
        }
    }
}

async function downloadImage(id) {
    const img = await DB.getImage(id);
    if (img) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(img.blob);
        a.download = `copyload_${Date.now()}.png`;
        a.click();
    }
}

async function deleteImageItem(id) {
    await DB.deleteImage(id);
    await loadImages(); await updateStorage();
    notify(i18n[currentLang].deleted);
}

async function previewImage(id) {
    const img = await DB.getImage(id);
    if (img && els.previewImage && els.imagePreviewModal) {
        els.previewImage.src = URL.createObjectURL(img.blob);
        els.imagePreviewModal.classList.add('show');
    }
}

// Context menu
function showContextMenu(x, y) {
    if (els.imageContextMenu) {
        els.imageContextMenu.style.display = 'block';
        els.imageContextMenu.style.left = `${x}px`;
        els.imageContextMenu.style.top = `${y}px`;
    }
}

function hideContextMenu() {
    if (els.imageContextMenu) els.imageContextMenu.style.display = 'none';
}

async function copyContextImage() { if (contextImageId) await copyImage(contextImageId); hideContextMenu(); }
async function downloadContextImage() { if (contextImageId) await downloadImage(contextImageId); hideContextMenu(); }
async function deleteContextImage() { if (contextImageId) await deleteImageItem(contextImageId); hideContextMenu(); }

// Clear all
async function clearAll() {
    if (currentTab === 'text') await DB.clearAllTexts();
    else await DB.clearAllImages();
    await loadData(); await updateStorage();
    notify(i18n[currentLang].deleted);
}

// Export
async function exportData() {
    const texts = await DB.getAllTexts();
    if (!texts.length) return;

    const data = { version: '3.0', exportedAt: Date.now(), texts };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `copyload_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    notify(i18n[currentLang].exported);
}

// Import
async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        let items = [];

        if (file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            items = data.texts || [];
        } else {
            // TXT file - each line is a text item
            items = text.split('\n').filter(line => line.trim()).map(line => ({ content: line.trim() }));
        }

        for (const item of items) {
            if (item.content) await DB.saveText(item.content);
        }

        await loadTexts(); await updateStorage();
        notify(`${i18n[currentLang].imported} (${items.length})`);
    } catch (e) {
        console.error('Import error:', e);
    }

    e.target.value = '';
}

// Download as TXT
async function downloadTextAsTxt() {
    const texts = await DB.getAllTexts();
    if (!texts.length) return;

    const content = texts.map((t, i) => `${i + 1}. ${t.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `copyload_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    notify(i18n[currentLang].exported);
}

// Storage
async function updateStorage() {
    try {
        const info = await DB.getStorageInfo();
        const pct = Math.min(info.percent, 100);

        if (els.storageFill) {
            els.storageFill.style.width = `${pct}%`;
            els.storageFill.className = 'storage-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
        }

        if (els.storageText) {
            els.storageText.textContent = info.isPremium ? '∞' : `${formatBytes(info.used)}`;
        }
    } catch (e) {
        console.error('Storage update error:', e);
    }
}

// Helpers
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function formatBytes(b) {
    if (b < 1024) return `${b}B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / 1048576).toFixed(1)}MB`;
}

function formatTime(ts) {
    const d = Date.now() - ts;
    if (d < 60000) return 'now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
    return new Date(ts).toLocaleDateString();
}

function notify(msg, isError = false) {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = 'notification' + (isError ? ' error' : '');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

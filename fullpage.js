// CopyLoad v2.0.1 - Full Page Manager
const DB = window.CopyLoadDB;
let currentTab = 'text';
let currentTheme = 'light';
let currentLang = 'vi';
let isPremiumUser = false;
let previewImageId = null;
let activeObjectURLs = [];

// i18n
const i18n = {
    vi: {
        textClipboard: 'Text Clipboard', imageClipboard: 'Image Clipboard', premium: 'Premium',
        search: 'Tìm kiếm...', import: 'Import', export: 'Export', clearAll: 'Xóa tất cả',
        confirmDelete: 'Xác nhận xóa?', deleteWarning: 'Dữ liệu sẽ bị xóa vĩnh viễn.',
        cancel: 'Hủy', delete: 'Xóa', copy: 'Copy', download: 'Tải xuống', close: 'Đóng',
        copied: 'Đã copy!', deleted: 'Đã xóa!', exported: 'Đã export!', imported: 'Đã import!',
        noText: 'Chưa có text', noImage: 'Chưa có ảnh', noResult: 'Không tìm thấy',
        storage: 'Dung lượng', toggleTheme: 'Đổi theme', items: 'mục',
        dropImage: 'Kéo ảnh vào đây hoặc click để upload', dropHint: 'Hỗ trợ: PNG, JPG, GIF, WEBP',
        upgradeToPro: 'Nâng cấp lên Premium', premiumDesc: 'Mở khóa tất cả tính năng với giấy phép vĩnh viễn.',
        activate: 'Kích hoạt', activated: 'Đã kích hoạt!', deactivated: 'Đã hủy Premium!', enjoyPro: 'Bạn đã mở khóa Premium.',
        invalidKey: 'Key không hợp lệ', uploaded: 'Đã upload!', deactivate: 'Hủy Premium',
        feat1: 'Không giới hạn ảnh', feat2: 'Dung lượng không giới hạn', feat3: 'Thư mục quản lý',
        feat4: 'Tìm kiếm nâng cao', feat5: 'Loại bỏ text trùng', feat6: 'Tùy chỉnh background'
    },
    en: {
        textClipboard: 'Text Clipboard', imageClipboard: 'Image Clipboard', premium: 'Premium',
        search: 'Search...', import: 'Import', export: 'Export', clearAll: 'Clear All',
        confirmDelete: 'Confirm delete?', deleteWarning: 'Data will be permanently deleted.',
        cancel: 'Cancel', delete: 'Delete', copy: 'Copy', download: 'Download', close: 'Close',
        copied: 'Copied!', deleted: 'Deleted!', exported: 'Exported!', imported: 'Imported!',
        noText: 'No text yet', noImage: 'No images yet', noResult: 'No results',
        storage: 'Storage', toggleTheme: 'Toggle Theme', items: 'items',
        dropImage: 'Drag images here or click to upload', dropHint: 'Supports: PNG, JPG, GIF, WEBP',
        upgradeToPro: 'Upgrade to Premium', premiumDesc: 'Unlock all features with a lifetime license.',
        activate: 'Activate', activated: 'Activated!', deactivated: 'Premium deactivated!', enjoyPro: 'You have unlocked Premium.',
        invalidKey: 'Invalid key', uploaded: 'Uploaded!', deactivate: 'Deactivate Premium',
        feat1: 'Unlimited images', feat2: 'Unlimited storage', feat3: 'Folder management',
        feat4: 'Advanced search', feat5: 'Text deduplication', feat6: 'Custom background'
    }
};

// DOM Cache
const $ = id => document.getElementById(id);
const els = {
    navItems: document.querySelectorAll('.nav-item[data-tab]'),
    textContent: $('textContent'), imageContent: $('imageContent'), premiumContent: $('premiumContent'),
    textGridFull: $('textGridFull'), imageGridFull: $('imageGridFull'),
    searchInputFull: $('searchInputFull'), pageTitle: $('pageTitle'), itemCount: $('itemCount'),
    navTextCount: $('navTextCount'), navImageCount: $('navImageCount'),
    toggleThemeFull: $('toggleThemeFull'), themeIconFull: $('themeIconFull'),
    toggleLangFull: $('toggleLangFull'), langLabel: $('langLabel'),
    importBtnFull: $('importBtnFull'), exportBtnFull: $('exportBtnFull'),
    clearAllBtnFull: $('clearAllBtnFull'), importFileFull: $('importFileFull'),
    imageContent: $('imageContent'), uploadImageInput: $('uploadImageInput'),
    modalFull: $('modalFull'), modalCancel: $('modalCancel'), modalConfirm: $('modalConfirm'),
    imagePreviewFull: $('imagePreviewFull'), previewImgFull: $('previewImgFull'),
    previewSize: $('previewSize'), previewTime: $('previewTime'),
    previewCopy: $('previewCopy'), previewDownload: $('previewDownload'),
    previewDelete: $('previewDelete'), previewClose: $('previewClose'),
    storageFillFull: $('storageFillFull'), storagePercent: $('storagePercent'), storageSizeFull: $('storageSizeFull'),
    premiumBadge: $('premiumBadge'), premiumNav: $('premiumNav'),
    premiumSection: $('premiumSection'), activationGroup: $('activationGroup'),
    premiumKeyInput: $('premiumKeyInput'), activateBtn: $('activateBtn'), premiumSuccess: $('premiumSuccess'),
    // Sidebar premium controls
    premiumQuick: $('premiumQuick'), premiumKeyQuick: $('premiumKeyQuick'),
    activateBtnQuick: $('activateBtnQuick'), deactivateBtn: $('deactivateBtn')
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
    updatePremiumUI();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    els.themeIconFull.innerHTML = currentTheme === 'dark'
        ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}

function applyLang() {
    const t = i18n[currentLang];
    els.langLabel.textContent = currentLang === 'vi' ? 'Tiếng Việt' : 'English';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
    updateTitle();
}

function updatePremiumUI() {
    if (els.premiumBadge) {
        els.premiumBadge.textContent = isPremiumUser ? 'PRO' : 'FREE';
        els.premiumBadge.classList.toggle('pro', isPremiumUser);
    }

    // Main premium section
    if (isPremiumUser) {
        if (els.activationGroup) els.activationGroup.style.display = 'none';
        if (els.premiumSuccess) els.premiumSuccess.style.display = 'block';
        if (els.premiumNav) els.premiumNav.classList.remove('nav-premium');
    } else {
        if (els.activationGroup) els.activationGroup.style.display = 'flex';
        if (els.premiumSuccess) els.premiumSuccess.style.display = 'none';
        if (els.premiumNav) els.premiumNav.classList.add('nav-premium');
    }

    // Sidebar premium controls
    if (els.premiumQuick) els.premiumQuick.style.display = isPremiumUser ? 'none' : 'flex';
    if (els.deactivateBtn) els.deactivateBtn.style.display = isPremiumUser ? 'flex' : 'none';
}

function updateTitle() {
    const t = i18n[currentLang];
    const titles = { text: t.textClipboard, images: t.imageClipboard, premium: t.premium };
    els.pageTitle.textContent = titles[currentTab] || t.textClipboard;
}

// Setup listeners
function setupListeners() {
    // Nav
    els.navItems.forEach(item => {
        item.onclick = () => switchTab(item.dataset.tab);
    });

    // Theme & Lang
    els.toggleThemeFull.onclick = async () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        await DB.setSetting('theme', currentTheme);
        applyTheme();
    };

    els.toggleLangFull.onclick = async () => {
        currentLang = currentLang === 'vi' ? 'en' : 'vi';
        await DB.setSetting('language', currentLang);
        applyLang();
    };

    // Search (debounced)
    let searchTimeout;
    els.searchInputFull.oninput = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadData, 150);
    };

    // Import/Export
    els.importBtnFull.onclick = () => els.importFileFull.click();
    els.importFileFull.onchange = importData;
    els.exportBtnFull.onclick = exportData;

    // Clear all
    els.clearAllBtnFull.onclick = () => showModal(i18n[currentLang].confirmDelete, i18n[currentLang].deleteWarning, clearAll);
    els.modalCancel.onclick = hideModal;
    els.modalFull.onclick = e => { if (e.target === els.modalFull) hideModal(); };

    // Drop zone & Upload - now on image grid/content area
    if (els.imageContent) {
        els.imageContent.ondragover = e => { e.preventDefault(); els.imageGridFull?.classList.add('dragover'); };
        els.imageContent.ondragleave = () => els.imageGridFull?.classList.remove('dragover');
        els.imageContent.ondrop = e => { e.preventDefault(); els.imageGridFull?.classList.remove('dragover'); handleFileDrop(e); };
    }
    if (els.uploadImageInput) els.uploadImageInput.onchange = handleFileUpload;

    // Image preview
    els.previewClose.onclick = () => els.imagePreviewFull.classList.remove('show');
    els.previewCopy.onclick = copyPreviewImage;
    els.previewDownload.onclick = downloadPreviewImage;
    els.previewDelete.onclick = deletePreviewImage;
    els.imagePreviewFull.onclick = e => { if (e.target === els.imagePreviewFull) els.imagePreviewFull.classList.remove('show'); };

    // Premium activation (main)
    if (els.activateBtn) els.activateBtn.onclick = activatePremium;
    if (els.premiumKeyInput) els.premiumKeyInput.onkeydown = e => { if (e.key === 'Enter') activatePremium(); };

    // Premium activation (sidebar quick)
    if (els.activateBtnQuick) els.activateBtnQuick.onclick = activatePremiumQuick;
    if (els.premiumKeyQuick) els.premiumKeyQuick.onkeydown = e => { if (e.key === 'Enter') activatePremiumQuick(); };

    // Deactivate premium
    if (els.deactivateBtn) els.deactivateBtn.onclick = deactivatePremium;
}

async function activatePremiumQuick() {
    const key = els.premiumKeyQuick?.value.trim().toUpperCase();
    if (!key) return;

    const success = await DB.activatePremium(key);
    if (success) {
        isPremiumUser = true;
        updatePremiumUI();
        notify(i18n[currentLang].activated, false, true);
        els.premiumKeyQuick.value = '';
    } else {
        notify(i18n[currentLang].invalidKey, true);
        els.premiumKeyQuick.style.borderColor = '#EF4444';
        setTimeout(() => els.premiumKeyQuick.style.borderColor = '', 2000);
    }
}

async function deactivatePremium() {
    await DB.deactivatePremium();
    isPremiumUser = false;
    updatePremiumUI();
    notify(i18n[currentLang].deactivated || 'Premium deactivated', false, true);
}

function switchTab(tab) {
    currentTab = tab;
    els.navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
    els.textContent.classList.toggle('active', tab === 'text');
    els.imageContent.classList.toggle('active', tab === 'images');
    els.premiumContent.classList.toggle('active', tab === 'premium');

    // Hide/show actions
    const isActions = tab !== 'premium';
    document.querySelector('.header-actions').style.display = isActions ? 'flex' : 'none';

    updateTitle();
}

// Load data
async function loadData() {
    await Promise.all([loadTexts(), loadImages()]);
}

async function loadTexts() {
    const q = els.searchInputFull.value.toLowerCase();
    let texts = q ? await DB.searchTexts(q) : await DB.getAllTexts();
    const count = await DB.getTextCount();
    els.navTextCount.textContent = count;
    if (currentTab === 'text') els.itemCount.textContent = `${count} ${i18n[currentLang].items}`;
    renderTexts(texts);
}

function renderTexts(texts) {
    const t = i18n[currentLang];
    if (!texts.length) {
        els.textGridFull.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>${els.searchInputFull.value ? t.noResult : t.noText}</p></div>`;
        return;
    }

    els.textGridFull.innerHTML = texts.map(text => `
        <div class="text-card" data-id="${text.id}">
            <div class="text-card-header">
                <div class="text-card-time"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatTime(text.savedAt)}</div>
            </div>
            <div class="text-card-content">${escapeHtml(text.content)}</div>
            <div class="text-card-footer">
                <button class="card-btn copy-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>${t.copy}</button>
                <button class="card-btn danger delete-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>${t.delete}</button>
            </div>
        </div>
    `).join('');

    els.textGridFull.onclick = async e => {
        const card = e.target.closest('.text-card');
        if (!card) return;
        const id = parseInt(card.dataset.id);
        const text = await DB.getText(id);
        if (!text) return;

        if (e.target.closest('.copy-btn')) {
            await navigator.clipboard.writeText(text.content);
            notify(i18n[currentLang].copied);
        } else if (e.target.closest('.delete-btn')) {
            await DB.deleteText(id);
            await loadTexts(); await updateStorage();
            notify(i18n[currentLang].deleted);
        }
    };
}

async function loadImages() {
    const images = await DB.getAllImages();
    const count = images.length;
    els.navImageCount.textContent = count;
    if (currentTab === 'images') els.itemCount.textContent = `${count} ${i18n[currentLang].items}`;
    renderImages(images);
}

function renderImages(images) {
    const t = i18n[currentLang];

    // Revoke previous Object URLs to prevent memory leak
    activeObjectURLs.forEach(url => URL.revokeObjectURL(url));
    activeObjectURLs = [];

    if (!images.length) {
        els.imageGridFull.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>${t.noImage}</p></div>`;
        return;
    }

    els.imageGridFull.innerHTML = images.map(img => {
        // Use full blob for the manager page (thumbnails are only 200px and look blurry at larger sizes)
        const src = URL.createObjectURL(img.blob);
        activeObjectURLs.push(src);
        return `<div class="image-card" data-id="${img.id}">
            <img src="${src}" alt="">
            <div class="image-card-overlay">
                <div class="image-card-time">${formatTime(img.savedAt)}</div>
                <div class="image-card-actions">
                    <button class="img-card-btn copy-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                    <button class="img-card-btn download-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                    <button class="img-card-btn danger delete-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
                </div>
            </div>
        </div>`;
    }).join('');

    els.imageGridFull.onclick = async e => {
        const card = e.target.closest('.image-card');
        if (!card) return;
        const id = parseInt(card.dataset.id);

        if (e.target.closest('.copy-img')) await copyImageById(id);
        else if (e.target.closest('.download-img')) await downloadImageById(id);
        else if (e.target.closest('.delete-img')) await deleteImageById(id);
        else await previewImage(id);
    };
}

// Image actions
async function copyImageById(id) {
    const img = await DB.getImage(id);
    if (img) {
        try { await navigator.clipboard.write([new ClipboardItem({ [img.blob.type]: img.blob })]); notify(i18n[currentLang].copied); }
        catch (e) { console.error(e); }
    }
}

async function downloadImageById(id) {
    const img = await DB.getImage(id);
    if (img) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(img.blob);
        a.download = `copyload_${Date.now()}.png`;
        a.click();
    }
}

async function deleteImageById(id) {
    await DB.deleteImage(id);
    await loadImages(); await updateStorage();
    notify(i18n[currentLang].deleted);
}

async function previewImage(id) {
    const img = await DB.getImage(id);
    if (img) {
        previewImageId = id;
        els.previewImgFull.src = URL.createObjectURL(img.blob);
        els.previewSize.textContent = formatBytes(img.size || img.blob.size);
        els.previewTime.textContent = new Date(img.savedAt).toLocaleString();
        els.imagePreviewFull.classList.add('show');
    }
}

async function copyPreviewImage() { if (previewImageId) await copyImageById(previewImageId); els.imagePreviewFull.classList.remove('show'); }
async function downloadPreviewImage() { if (previewImageId) await downloadImageById(previewImageId); els.imagePreviewFull.classList.remove('show'); }
async function deletePreviewImage() { if (previewImageId) await deleteImageById(previewImageId); els.imagePreviewFull.classList.remove('show'); }

// Upload & Drop
async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    await processImageFiles(files);
    e.target.value = '';
}

async function handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    await processImageFiles(files);
}

async function processImageFiles(files) {
    let count = 0;
    for (const file of files) {
        try {
            const thumbnail = await createThumbnail(file);
            await DB.saveImage(file, thumbnail);
            count++;
        } catch (e) {
            console.error('Upload failed:', e);
            if (e.message.includes('limit')) { notify(e.message, true); break; }
        }
    }
    if (count > 0) {
        await loadImages(); await updateStorage();
        notify(`${i18n[currentLang].uploaded} (${count})`);
    }
}

function createThumbnail(blob, maxSize = 200) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = Math.max(img.width * scale, 1);
            canvas.height = Math.max(img.height * scale, 1);
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

// Premium
async function activatePremium() {
    const key = els.premiumKeyInput.value.trim().toUpperCase();
    const success = await DB.activatePremium(key);

    if (success) {
        isPremiumUser = true;
        updatePremiumUI();
        notify(i18n[currentLang].activated, false, true);
    } else {
        notify(i18n[currentLang].invalidKey, true);
        els.premiumKeyInput.style.borderColor = '#EF4444';
        setTimeout(() => els.premiumKeyInput.style.borderColor = '', 2000);
    }
}

// Clear all
async function clearAll() {
    if (currentTab === 'text') await DB.clearAllTexts();
    else if (currentTab === 'images') await DB.clearAllImages();
    hideModal();
    await loadData(); await updateStorage();
    notify(i18n[currentLang].deleted);
}

// Export
async function exportData() {
    const texts = await DB.getAllTexts();
    if (!texts.length) return;
    const blob = new Blob([JSON.stringify({ version: '2.0.1', texts }, null, 2)], { type: 'application/json' });
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
            items = text.split('\n').map(l => ({ content: l.replace(/^\d+\.\s*/, '').trim() })).filter(i => i.content);
        }
        for (const item of items) await DB.saveText(item.content || item);
        await loadTexts(); await updateStorage();
        notify(`${i18n[currentLang].imported} (${items.length})`);
    } catch (e) { console.error(e); }
    e.target.value = '';
}

// Storage
async function updateStorage() {
    const info = await DB.getStorageInfo();
    const pct = Math.min(info.percent, 100);
    els.storageFillFull.style.width = `${pct}%`;
    els.storageFillFull.className = 'storage-fill-full' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
    els.storagePercent.textContent = `${pct.toFixed(1)}%`;

    if (info.isPremium) {
        els.storageSizeFull.textContent = `${formatBytes(info.used)} / ∞`;
    } else {
        els.storageSizeFull.textContent = `${formatBytes(info.used)} / 500 MB`;
    }
}

// Modal
let modalCallback = null;
function showModal(title, text, callback) {
    $('modalTitle').textContent = title;
    $('modalText').textContent = text;
    modalCallback = callback;
    els.modalConfirm.onclick = () => { if (modalCallback) modalCallback(); };
    els.modalFull.classList.add('show');
}

function hideModal() { els.modalFull.classList.remove('show'); modalCallback = null; }

// Helpers
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatBytes(b) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`; }
function formatTime(ts) {
    const d = Date.now() - ts;
    if (d < 60000) return 'now';
    if (d < 3600000) return `${Math.floor(d / 60000)}m`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
    return new Date(ts).toLocaleDateString();
}

function notify(msg, isError = false, isPremium = false) {
    document.querySelectorAll('.notification-full').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = `notification-full${isError ? ' error' : ''}${isPremium ? ' premium' : ''}`;
    n.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${msg}`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2500);
}

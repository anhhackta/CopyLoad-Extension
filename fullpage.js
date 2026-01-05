// CopyLoad Full Page - Enhanced Management
let currentTab = 'text';
let currentTheme = 'light';
let currentLang = 'vi';
let previewImageIndex = -1;
let detailTextData = null;

// i18n
const i18n = {
    vi: {
        textClipboard: 'Text Clipboard',
        imageClipboard: 'Image Clipboard',
        search: 'Tìm kiếm...',
        import: 'Import',
        export: 'Export',
        clearAll: 'Xóa tất cả',
        confirmDelete: 'Xác nhận xóa?',
        deleteWarning: 'Dữ liệu sẽ bị xóa vĩnh viễn.',
        cancel: 'Hủy',
        delete: 'Xóa',
        copy: 'Copy',
        download: 'Tải xuống',
        close: 'Đóng',
        textDetail: 'Chi tiết',
        copied: 'Đã copy!',
        deleted: 'Đã xóa!',
        downloaded: 'Đã tải!',
        exported: 'Đã export!',
        imported: 'Đã import!',
        noData: 'Không có dữ liệu',
        noText: 'Chưa có text nào được lưu',
        noImage: 'Chưa có ảnh nào được lưu',
        noResult: 'Không tìm thấy kết quả',
        storage: 'Dung lượng',
        toggleTheme: 'Đổi theme',
        justNow: 'Vừa xong',
        minutesAgo: 'phút trước',
        hoursAgo: 'giờ trước',
        daysAgo: 'ngày trước',
        items: 'mục'
    },
    en: {
        textClipboard: 'Text Clipboard',
        imageClipboard: 'Image Clipboard',
        search: 'Search...',
        import: 'Import',
        export: 'Export',
        clearAll: 'Clear All',
        confirmDelete: 'Confirm Delete?',
        deleteWarning: 'Data will be permanently deleted.',
        cancel: 'Cancel',
        delete: 'Delete',
        copy: 'Copy',
        download: 'Download',
        close: 'Close',
        textDetail: 'Detail',
        copied: 'Copied!',
        deleted: 'Deleted!',
        downloaded: 'Downloaded!',
        exported: 'Exported!',
        imported: 'Imported!',
        noData: 'No data',
        noText: 'No text saved yet',
        noImage: 'No images saved yet',
        noResult: 'No results found',
        storage: 'Storage',
        toggleTheme: 'Toggle Theme',
        justNow: 'Just now',
        minutesAgo: 'min ago',
        hoursAgo: 'hours ago',
        daysAgo: 'days ago',
        items: 'items'
    }
};

const $ = id => document.getElementById(id);

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const textContent = $('textContent');
const imageContent = $('imageContent');
const textGridFull = $('textGridFull');
const imageGridFull = $('imageGridFull');
const searchInputFull = $('searchInputFull');
const pageTitle = $('pageTitle');
const itemCount = $('itemCount');
const navTextCount = $('navTextCount');
const navImageCount = $('navImageCount');
const toggleThemeFull = $('toggleThemeFull');
const themeIconFull = $('themeIconFull');
const toggleLangFull = $('toggleLangFull');
const langLabel = $('langLabel');
const importBtnFull = $('importBtnFull');
const exportBtnFull = $('exportBtnFull');
const clearAllBtnFull = $('clearAllBtnFull');
const importFileFull = $('importFileFull');
const modalFull = $('modalFull');
const modalTitle = $('modalTitle');
const modalText = $('modalText');
const modalCancel = $('modalCancel');
const modalConfirm = $('modalConfirm');
const imagePreviewFull = $('imagePreviewFull');
const previewImgFull = $('previewImgFull');
const previewSize = $('previewSize');
const previewTime = $('previewTime');
const previewCopy = $('previewCopy');
const previewDownload = $('previewDownload');
const previewDelete = $('previewDelete');
const previewClose = $('previewClose');
const textDetailModal = $('textDetailModal');
const textDetailTime = $('textDetailTime');
const textDetailContent = $('textDetailContent');
const textDetailCopy = $('textDetailCopy');
const textDetailDelete = $('textDetailDelete');
const textDetailClose = $('textDetailClose');
const storageFillFull = $('storageFillFull');
const storagePercent = $('storagePercent');
const storageSizeFull = $('storageSizeFull');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupListeners();
    await loadData();
    await updateStorage();
});

async function loadSettings() {
    const res = await chrome.storage.local.get(['theme', 'language']);
    currentTheme = res.theme || 'light';
    currentLang = res.language || 'vi';
    applyTheme();
    applyLang();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeIconFull.innerHTML = currentTheme === 'dark'
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
}

function applyLang() {
    const t = i18n[currentLang];
    langLabel.textContent = currentLang === 'vi' ? 'Tiếng Việt' : 'English';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    // Update current page title
    pageTitle.textContent = t[currentTab === 'text' ? 'textClipboard' : 'imageClipboard'];
}

function setupListeners() {
    // Nav tabs
    navItems.forEach(item => {
        item.onclick = () => switchTab(item.dataset.tab);
    });

    // Theme toggle
    toggleThemeFull.onclick = async () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        await chrome.storage.local.set({ theme: currentTheme });
        applyTheme();
    };

    // Language toggle
    toggleLangFull.onclick = async () => {
        currentLang = currentLang === 'vi' ? 'en' : 'vi';
        await chrome.storage.local.set({ language: currentLang });
        applyLang();
    };

    // Search
    searchInputFull.oninput = loadData;

    // Import/Export
    importBtnFull.onclick = () => importFileFull.click();
    importFileFull.onchange = importData;
    exportBtnFull.onclick = exportData;

    // Clear all
    clearAllBtnFull.onclick = () => showModal(i18n[currentLang].confirmDelete, i18n[currentLang].deleteWarning, clearAll);

    // Modal
    modalCancel.onclick = hideModal;
    modalFull.onclick = e => { if (e.target === modalFull) hideModal(); };

    // Image preview
    previewClose.onclick = () => imagePreviewFull.classList.remove('show');
    previewCopy.onclick = copyPreviewImage;
    previewDownload.onclick = downloadPreviewImage;
    previewDelete.onclick = deletePreviewImage;
    imagePreviewFull.onclick = e => { if (e.target === imagePreviewFull) imagePreviewFull.classList.remove('show'); };

    // Text detail
    textDetailClose.onclick = () => textDetailModal.classList.remove('show');
    textDetailCopy.onclick = copyDetailText;
    textDetailDelete.onclick = deleteDetailText;
    textDetailModal.onclick = e => { if (e.target === textDetailModal) textDetailModal.classList.remove('show'); };

    // Storage listener
    chrome.storage.onChanged.addListener(() => { loadData(); updateStorage(); });
}

function switchTab(tab) {
    currentTab = tab;
    navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
    textContent.classList.toggle('active', tab === 'text');
    imageContent.classList.toggle('active', tab === 'images');
    pageTitle.textContent = i18n[currentLang][tab === 'text' ? 'textClipboard' : 'imageClipboard'];

    // Toggle buttons
    importBtnFull.style.display = tab === 'text' ? 'flex' : 'none';
    exportBtnFull.style.display = tab === 'text' ? 'flex' : 'none';
}

async function loadData() {
    await Promise.all([loadTexts(), loadImages()]);
}

async function loadTexts() {
    const [temp, local] = await Promise.all([
        chrome.storage.session.get(['clipboard_temp']),
        chrome.storage.local.get(['clipboard_persistent', 'clipboard_timestamps'])
    ]);

    const tempTexts = temp.clipboard_temp || [];
    const persistentTexts = local.clipboard_persistent || [];
    const timestamps = local.clipboard_timestamps || {};
    let allTexts = [...new Set([...tempTexts, ...persistentTexts])];

    navTextCount.textContent = allTexts.length;
    if (currentTab === 'text') itemCount.textContent = `${allTexts.length} ${i18n[currentLang].items}`;

    const q = searchInputFull.value.toLowerCase();
    if (q) allTexts = allTexts.filter(t => t.toLowerCase().includes(q));

    renderTexts(allTexts, tempTexts, timestamps);
}

function renderTexts(texts, tempTexts, timestamps) {
    const t = i18n[currentLang];
    if (!texts.length) {
        textGridFull.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg><p>${searchInputFull.value ? t.noResult : t.noText}</p></div>`;
        return;
    }

    textGridFull.innerHTML = texts.map((text, idx) => {
        const isTemp = tempTexts.includes(text);
        const ts = timestamps[hashCode(text)] || Date.now();
        const timeStr = formatTime(ts);

        return `<div class="text-card" data-index="${idx}" data-text="${encodeURIComponent(text)}" data-time="${ts}">
            <div class="text-card-header">
                <div class="text-card-time">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${timeStr}
                </div>
                ${isTemp ? `<span class="temp-badge">temp</span>` : ''}
            </div>
            <div class="text-card-content">${escapeHtml(text)}</div>
            <div class="text-card-footer">
                <button class="card-btn copy-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy
                </button>
                <button class="card-btn danger delete-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>
                    ${t.delete}
                </button>
            </div>
        </div>`;
    }).join('');

    textGridFull.onclick = async e => {
        const card = e.target.closest('.text-card');
        if (!card) return;
        const text = decodeURIComponent(card.dataset.text);
        const time = parseInt(card.dataset.time);

        if (e.target.closest('.copy-btn')) {
            await navigator.clipboard.writeText(text);
            notify(t.copied);
        } else if (e.target.closest('.delete-btn')) {
            await deleteText(text);
        } else {
            // Open detail modal
            detailTextData = { text, time };
            textDetailTime.textContent = new Date(time).toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US');
            textDetailContent.textContent = text;
            textDetailModal.classList.add('show');
        }
    };
}

async function loadImages() {
    const res = await chrome.storage.local.get(['clipboard_images', 'image_timestamps']);
    const images = res.clipboard_images || [];
    const timestamps = res.image_timestamps || {};

    navImageCount.textContent = images.length;
    if (currentTab === 'images') itemCount.textContent = `${images.length} ${i18n[currentLang].items}`;

    renderImages(images, timestamps);
}

function renderImages(images, timestamps) {
    const t = i18n[currentLang];
    if (!images.length) {
        imageGridFull.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><p>${t.noImage}</p></div>`;
        return;
    }

    imageGridFull.innerHTML = images.map((img, i) => {
        const ts = timestamps[i] || Date.now();
        const timeStr = formatTime(ts);

        return `<div class="image-card" data-index="${i}" data-time="${ts}">
            <img src="${img}" alt="">
            <div class="image-card-overlay">
                <div class="image-card-time">${timeStr}</div>
                <div class="image-card-actions">
                    <button class="img-card-btn copy-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                    <button class="img-card-btn download-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
                    <button class="img-card-btn danger delete-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg></button>
                </div>
            </div>
        </div>`;
    }).join('');

    imageGridFull.onclick = async e => {
        const card = e.target.closest('.image-card');
        if (!card) return;
        const idx = parseInt(card.dataset.index);
        const time = parseInt(card.dataset.time);

        if (e.target.closest('.copy-img')) {
            await copyImageByIndex(idx);
        } else if (e.target.closest('.download-img')) {
            downloadImageByIndex(idx);
        } else if (e.target.closest('.delete-img')) {
            await deleteImageByIndex(idx);
        } else {
            // Preview
            previewImageIndex = idx;
            previewImgFull.src = images[idx];
            previewSize.textContent = formatBytes(images[idx].length * 0.75); // Approximate base64 to bytes
            previewTime.textContent = new Date(time).toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US');
            imagePreviewFull.classList.add('show');
        }
    };
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
            notify(i18n[currentLang].copied);
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
            notify(i18n[currentLang].downloaded);
        }
    });
}

async function deleteImageByIndex(idx) {
    const res = await chrome.storage.local.get(['clipboard_images', 'image_timestamps']);
    const images = res.clipboard_images || [];
    const timestamps = res.image_timestamps || {};

    images.splice(idx, 1);
    delete timestamps[idx];

    // Reindex timestamps
    const newTimestamps = {};
    Object.keys(timestamps).forEach((k, i) => { newTimestamps[i] = timestamps[k]; });

    await chrome.storage.local.set({ clipboard_images: images, image_timestamps: newTimestamps });
    await loadImages();
    await updateStorage();
    notify(i18n[currentLang].deleted);
}

// Preview actions
async function copyPreviewImage() {
    if (previewImageIndex >= 0) await copyImageByIndex(previewImageIndex);
    imagePreviewFull.classList.remove('show');
}

function downloadPreviewImage() {
    if (previewImageIndex >= 0) downloadImageByIndex(previewImageIndex);
    imagePreviewFull.classList.remove('show');
}

async function deletePreviewImage() {
    if (previewImageIndex >= 0) await deleteImageByIndex(previewImageIndex);
    imagePreviewFull.classList.remove('show');
}

// Text detail actions
async function copyDetailText() {
    if (detailTextData) {
        await navigator.clipboard.writeText(detailTextData.text);
        notify(i18n[currentLang].copied);
    }
    textDetailModal.classList.remove('show');
}

async function deleteDetailText() {
    if (detailTextData) await deleteText(detailTextData.text);
    textDetailModal.classList.remove('show');
}

// Delete text
async function deleteText(text) {
    const [temp, local] = await Promise.all([
        chrome.storage.session.get(['clipboard_temp']),
        chrome.storage.local.get(['clipboard_persistent', 'clipboard_timestamps'])
    ]);

    const timestamps = local.clipboard_timestamps || {};
    delete timestamps[hashCode(text)];

    await Promise.all([
        chrome.storage.session.set({ clipboard_temp: (temp.clipboard_temp || []).filter(t => t !== text) }),
        chrome.storage.local.set({
            clipboard_persistent: (local.clipboard_persistent || []).filter(t => t !== text),
            clipboard_timestamps: timestamps
        })
    ]);

    await loadTexts();
    await updateStorage();
    notify(i18n[currentLang].deleted);
}

// Clear all
async function clearAll() {
    if (currentTab === 'text') {
        await Promise.all([
            chrome.storage.session.set({ clipboard_temp: [] }),
            chrome.storage.local.set({ clipboard_persistent: [], clipboard_timestamps: {} })
        ]);
    } else {
        await chrome.storage.local.set({ clipboard_images: [], image_timestamps: {} });
    }
    hideModal();
    await loadData();
    await updateStorage();
    notify(i18n[currentLang].deleted);
}

// Export
async function exportData() {
    const local = await chrome.storage.local.get(['clipboard_persistent', 'clipboard_timestamps']);
    const texts = local.clipboard_persistent || [];
    const timestamps = local.clipboard_timestamps || {};

    if (!texts.length) { notify(i18n[currentLang].noData, true); return; }

    const data = {
        version: '2.1',
        exportedAt: new Date().toISOString(),
        texts: texts.map(t => ({ content: t, savedAt: timestamps[hashCode(t)] || Date.now() }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `copyload_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify(i18n[currentLang].exported);
}

// Import
async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        let newTexts = [];
        let newTimestamps = {};

        if (file.name.endsWith('.json')) {
            const data = JSON.parse(text);
            if (data.texts) {
                if (Array.isArray(data.texts) && typeof data.texts[0] === 'object') {
                    // New format with timestamps
                    data.texts.forEach(item => {
                        newTexts.push(item.content);
                        newTimestamps[hashCode(item.content)] = item.savedAt || Date.now();
                    });
                } else {
                    // Old format
                    newTexts = data.texts;
                }
            }
        } else {
            newTexts = text.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
        }

        const local = await chrome.storage.local.get(['clipboard_persistent', 'clipboard_timestamps']);
        const existingTimestamps = local.clipboard_timestamps || {};
        const merged = [...new Set([...newTexts, ...(local.clipboard_persistent || [])])];

        await chrome.storage.local.set({
            clipboard_persistent: merged,
            clipboard_timestamps: { ...existingTimestamps, ...newTimestamps }
        });

        await loadTexts();
        await updateStorage();
        notify(`${i18n[currentLang].imported} (${newTexts.length})`);
    } catch (err) {
        notify('Error', true);
    }

    e.target.value = '';
}

// Update storage
async function updateStorage() {
    try {
        const bytes = await chrome.storage.local.getBytesInUse();
        const max = chrome.storage.local.QUOTA_BYTES || 10485760;
        const pct = Math.min((bytes / max) * 100, 100);

        storageFillFull.style.width = `${pct}%`;
        storageFillFull.className = 'storage-fill-full' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
        storagePercent.textContent = `${pct.toFixed(1)}%`;
        storageSizeFull.textContent = `${formatBytes(bytes)} / ${formatBytes(max)}`;
    } catch (e) { }
}

// Helpers
function showModal(title, text, onConfirm) {
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalConfirm.onclick = onConfirm;
    modalFull.classList.add('show');
}

function hideModal() { modalFull.classList.remove('show'); }

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

function formatTime(ts) {
    const diff = Date.now() - ts;
    const t = i18n[currentLang];

    if (diff < 60000) return t.justNow;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${t.minutesAgo}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${t.hoursAgo}`;
    return `${Math.floor(diff / 86400000)} ${t.daysAgo}`;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function notify(msg, isError = false) {
    document.querySelectorAll('.notification-full').forEach(n => n.remove());
    const n = document.createElement('div');
    n.className = `notification-full${isError ? ' error' : ''}`;
    n.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>${msg}`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2500);
}

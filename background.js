// CopyLoad v2.1 - Background Service Worker
let enableCtrlC = true;
let enablePersistent = true;

// Load settings
chrome.storage.local.get(['enableCtrlC', 'enablePersistent']).then(res => {
  enableCtrlC = res.enableCtrlC !== false;
  enablePersistent = res.enablePersistent !== false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if ('enableCtrlC' in changes) enableCtrlC = changes.enableCtrlC.newValue !== false;
    if ('enablePersistent' in changes) enablePersistent = changes.enablePersistent.newValue !== false;
  }
});

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
  if (info.menuItemId === 'saveText' && info.selectionText) {
    await saveText(info.selectionText.trim());
  }
  if (info.menuItemId === 'saveImage' && info.srcUrl) {
    await saveImageFromUrl(info.srcUrl);
  }
});

// Hash function for timestamp keys
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// Save text with timestamp
async function saveText(text) {
  if (!text) return;
  const res = await chrome.storage.local.get(['clipboard_persistent', 'clipboard_timestamps']);
  const texts = res.clipboard_persistent || [];
  const timestamps = res.clipboard_timestamps || {};

  const filtered = texts.filter(t => t !== text);
  filtered.unshift(text);
  if (filtered.length > 500) filtered.pop();

  // Add timestamp
  timestamps[hashCode(text)] = Date.now();

  await chrome.storage.local.set({
    clipboard_persistent: filtered,
    clipboard_timestamps: timestamps
  });
}

// Save temp text
async function saveTempText(text) {
  if (!text) return;
  const res = await chrome.storage.session.get(['clipboard_temp']);
  const texts = res.clipboard_temp || [];
  const filtered = texts.filter(t => t !== text);
  filtered.unshift(text);
  if (filtered.length > 100) filtered.pop();
  await chrome.storage.session.set({ clipboard_temp: filtered });
}

// Save image from URL
async function saveImageFromUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onloadend = () => saveImage(reader.result);
    reader.readAsDataURL(blob);
  } catch (e) {
    console.error('Error saving image:', e);
  }
}

// Save image with timestamp
async function saveImage(base64) {
  if (!base64) return;
  const res = await chrome.storage.local.get(['clipboard_images', 'image_timestamps']);
  const images = res.clipboard_images || [];
  const timestamps = res.image_timestamps || {};

  // Check duplicate
  const preview = base64.substring(0, 200);
  if (images.some(img => img.substring(0, 200) === preview)) return;

  images.unshift(base64);
  if (images.length > 50) images.pop();

  // Add timestamp for new image (at index 0)
  const newTimestamps = { 0: Date.now() };
  Object.keys(timestamps).forEach(k => {
    const newKey = parseInt(k) + 1;
    if (newKey < 50) newTimestamps[newKey] = timestamps[k];
  });

  await chrome.storage.local.set({
    clipboard_images: images,
    image_timestamps: newTimestamps
  });
}

// Message listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'saveTempText') {
    if (!enableCtrlC) return sendResponse({ success: false });
    if (enablePersistent) saveText(req.text);
    else saveTempText(req.text);
    sendResponse({ success: true });
  }

  if (req.action === 'saveImage') {
    if (!enableCtrlC) return sendResponse({ success: false });
    saveImage(req.imageData);
    sendResponse({ success: true });
  }
});
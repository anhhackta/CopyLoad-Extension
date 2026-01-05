// CopyLoad v2.1 - Content Script
let enableCtrlC = true;

// Load setting
chrome.storage.local.get(['enableCtrlC']).then(res => {
  enableCtrlC = res.enableCtrlC !== false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'enableCtrlC' in changes) {
    enableCtrlC = changes.enableCtrlC.newValue !== false;
  }
});

// Get selected text
function getSelection() {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    const s = el.selectionStart, e = el.selectionEnd;
    if (s !== e) return el.value.substring(s, e);
    return '';
  }
  return window.getSelection()?.toString() || '';
}

// Copy event - save text
document.addEventListener('copy', async (e) => {
  if (!enableCtrlC) return;

  // First try to get text selection
  const text = getSelection().trim();
  if (text) {
    chrome.runtime.sendMessage({ action: 'saveTempText', text });
  }

  // Then check clipboard for images (async, after copy completes)
  setTimeout(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              chrome.runtime.sendMessage({ action: 'saveImage', imageData: reader.result });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (e) {
      // Clipboard read may fail silently
    }
  }, 100);
}, true);

// Paste event - save text/image
document.addEventListener('paste', (e) => {
  if (!enableCtrlC) return;
  const cd = e.clipboardData;
  if (!cd) return;

  // Check for images
  for (const item of cd.items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({ action: 'saveImage', imageData: reader.result });
        };
        reader.readAsDataURL(blob);
      }
      return;
    }
  }

  // Text
  const text = cd.getData('text')?.trim();
  if (text) chrome.runtime.sendMessage({ action: 'saveTempText', text });
}, true);
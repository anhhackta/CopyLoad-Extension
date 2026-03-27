// CopyLoad v2.0.1 - Content Script
let enableCtrlC = true;

// Load settings from chrome.storage
chrome.storage.local.get(['enableCtrlC']).then(result => {
  enableCtrlC = result.enableCtrlC !== false;
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && 'enableCtrlC' in changes) {
    enableCtrlC = changes.enableCtrlC.newValue !== false;
  }
});

// Get text selection
function getSelectedText() {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    const s = el.selectionStart, e = el.selectionEnd;
    if (s !== e) return el.value.substring(s, e);
    return '';
  }
  return window.getSelection()?.toString() || '';
}

// Send image blob to background via base64
function sendImageBlob(blob) {
  if (!blob || blob.size === 0) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    if (reader.result) {
      chrome.runtime.sendMessage({ action: 'saveImage', imageData: reader.result }).catch(() => { });
    }
  };
  reader.readAsDataURL(blob);
}

// Copy event handler — captures Ctrl+C text and clipboard images
document.addEventListener('copy', (e) => {
  if (!enableCtrlC) return;

  // Save text selection immediately
  const text = getSelectedText().trim();
  if (text) {
    chrome.runtime.sendMessage({ action: 'saveText', text }).catch(() => { });
  }

  // Check clipboard for images after a short delay (to let the copy finish)
  setTimeout(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            sendImageBlob(blob);
            return;
          }
        }
      }
    } catch (ex) {
      // Clipboard API may not be available or permission denied — silent fail
    }
  }, 100);
}, true);

// Paste event handler — captures Ctrl+V images (including PrtSC + paste)
document.addEventListener('paste', (e) => {
  if (!enableCtrlC) return;

  const cd = e.clipboardData;
  if (!cd) return;

  // Check for images first
  for (const item of cd.items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) sendImageBlob(blob);
      return; // Exit after handling image
    }
  }

  // Save text
  const text = cd.getData('text')?.trim();
  if (text) {
    chrome.runtime.sendMessage({ action: 'saveText', text }).catch(() => { });
  }
}, true);

// Detect PrtSC: when page regains focus, check clipboard for new images
// PrtSC doesn't fire copy/paste events, but puts image in clipboard
let lastClipboardCheck = 0;
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !enableCtrlC) return;
  
  // Throttle: don't check more than once per second
  const now = Date.now();
  if (now - lastClipboardCheck < 1000) return;
  lastClipboardCheck = now;

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          sendImageBlob(blob);
          return;
        }
      }
    }
  } catch (ex) {
    // Permission denied or no clipboard access — silent fail
  }
});

// Also check on window focus (for PrtSC while on same tab)
window.addEventListener('focus', async () => {
  if (!enableCtrlC) return;

  const now = Date.now();
  if (now - lastClipboardCheck < 1000) return;
  lastClipboardCheck = now;

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          sendImageBlob(blob);
          return;
        }
      }
    }
  } catch (ex) {
    // Silent fail
  }
});
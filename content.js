// CopyLoad Pro v3.0 - Content Script
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
function getSelection() {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    const s = el.selectionStart, e = el.selectionEnd;
    if (s !== e) return el.value.substring(s, e);
    return '';
  }
  return window.getSelection()?.toString() || '';
}

// Copy event handler
document.addEventListener('copy', async (e) => {
  if (!enableCtrlC) return;

  // Save text selection
  const text = getSelection().trim();
  if (text) {
    chrome.runtime.sendMessage({ action: 'saveText', text }).catch(() => { });
  }

  // Check for images in clipboard after a short delay
  setTimeout(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              chrome.runtime.sendMessage({ action: 'saveImage', imageData: reader.result }).catch(() => { });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    } catch (e) {
      // Clipboard read failed silently
    }
  }, 50);
}, true);

// Paste event handler
document.addEventListener('paste', (e) => {
  if (!enableCtrlC) return;

  const cd = e.clipboardData;
  if (!cd) return;

  // Check for images first
  for (const item of cd.items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          chrome.runtime.sendMessage({ action: 'saveImage', imageData: reader.result }).catch(() => { });
        };
        reader.readAsDataURL(blob);
      }
      return; // Exit after handling image
    }
  }

  // Save text
  const text = cd.getData('text')?.trim();
  if (text) {
    chrome.runtime.sendMessage({ action: 'saveText', text }).catch(() => { });
  }
}, true);
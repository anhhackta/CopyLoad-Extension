// CopyLoad content script. Only listens to copy/cut/paste events and talks to the
// background via messages. It never stores anything itself.

(() => {
  'use strict';

  const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', '']);
  const SENSITIVE_AUTOCOMPLETE = /^(?:cc-|current-password|new-password|one-time-code)/;
  const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'CapsLock']);

  let settings = {
    enableCtrlC: true,
    enablePasteMulti: false,
    pasteMode: 'box',
    pasteCount: 5,
    language: 'vi',
    theme: 'dark'
  };
  let lastPasteKeyAt = 0;
  let pendingQuick = null;

  // ---------- helpers ----------

  async function sendToBackground(message) {
    try {
      if (!chrome.runtime || !chrome.runtime.id) return null; // extension was reloaded
      return await chrome.runtime.sendMessage(message);
    } catch (_) {
      return null;
    }
  }

  function getDeepActiveElement() {
    let element = document.activeElement;
    while (element && element.shadowRoot && element.shadowRoot.activeElement) {
      element = element.shadowRoot.activeElement;
    }
    return element;
  }

  function isTextControl(element) {
    return element instanceof HTMLTextAreaElement
      || (element instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(element.type));
  }

  function isSensitiveField(element) {
    return element instanceof HTMLInputElement
      && (element.type === 'password' || SENSITIVE_AUTOCOMPLETE.test(element.autocomplete || ''));
  }

  function isEditable(element) {
    if (!element || element.disabled || element.readOnly) return false;
    return isTextControl(element) || element.isContentEditable === true;
  }

  function getSelectedText() {
    const element = getDeepActiveElement();
    if (element && isSensitiveField(element)) return '';
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      try {
        const { selectionStart, selectionEnd } = element;
        if (selectionStart !== null && selectionStart !== selectionEnd) {
          return element.value.slice(selectionStart, selectionEnd);
        }
      } catch (_) { /* input types without selection support */ }
      return '';
    }
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
  }

  function getAnchorRect(target) {
    if (target.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (rect.width || rect.height) return rect;
      }
    }
    return target.getBoundingClientRect();
  }

  function sendImage(blob) {
    if (!blob || blob.size === 0 || blob.size > LIMITS.MAX_IMAGE_BYTES) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        sendToBackground({ type: MSG.SAVE_IMAGE, dataUrl: reader.result });
      }
    };
    reader.readAsDataURL(blob);
  }

  // ---------- inserting text ----------

  // context = { target, range, clipboardText, saveText }
  function insertText(context, text) {
    const { target } = context;
    if (!text || !target.isConnected) return false;

    if (getDeepActiveElement() !== target) target.focus({ preventScroll: true });
    if (target.isContentEditable && context.range) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(context.range);
    }

    // execCommand keeps the browser's undo history and fires the events editors expect.
    if (document.execCommand('insertText', false, text)) return true;

    if (isTextControl(target)) {
      try {
        target.setRangeText(text, target.selectionStart, target.selectionEnd, 'end');
      } catch (_) {
        target.value += text;
      }
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      return true;
    }
    return false;
  }

  // ---------- copy / cut ----------

  function onCopyOrCut() {
    if (!settings.enableCtrlC) return;
    const text = getSelectedText();
    if (text.trim()) sendToBackground({ type: MSG.SAVE_TEXT, text });
  }

  // ---------- paste ----------

  function consumePasteKey() {
    const isRecent = Date.now() - lastPasteKeyAt <= TIMING.PASTE_KEY_WINDOW_MS;
    lastPasteKeyAt = 0;
    return isRecent;
  }

  async function openBoxPicker(context) {
    const response = await sendToBackground({ type: MSG.PICKER_OPEN, clipboardText: context.saveText });

    // Never swallow the user's paste: fall back to the real clipboard text.
    if (!response || !response.ok || response.locked || !response.items.length) {
      insertText(context, context.clipboardText);
      return;
    }

    CopyLoadPicker.open({
      items: response.items,
      anchorRect: getAnchorRect(context.target),
      theme: settings.theme,
      hint: translate(settings.language, 'pickerHint'),
      onPick: async (item) => {
        const result = await sendToBackground({ type: MSG.PICKER_GET_TEXT, id: item.id });
        if (result && result.ok) insertText(context, result.text);
      }
    });
  }

  function startQuickPaste(context) {
    const savePromise = context.saveText
      ? sendToBackground({ type: MSG.SAVE_TEXT, text: context.saveText })
      : Promise.resolve(null);
    pendingQuick = {
      context,
      savePromise,
      timerId: setTimeout(() => finishQuickPaste(null), TIMING.QUICK_PASTE_WINDOW_MS)
    };
  }

  async function finishQuickPaste(slotIndex) {
    const pending = pendingQuick;
    if (!pending) return;
    pendingQuick = null;
    clearTimeout(pending.timerId);

    if (slotIndex === null) {
      insertText(pending.context, pending.context.clipboardText);
      return;
    }
    await pending.savePromise; // slot 1 must already include the text just pasted
    const result = await sendToBackground({ type: MSG.PICKER_GET_BY_INDEX, index: slotIndex });
    if (result && result.ok) insertText(pending.context, result.text);
  }

  function onPaste(event) {
    const clipboard = event.clipboardData;
    if (!clipboard || !event.isTrusted) return;

    const imageItem = Array.from(clipboard.items || []).find(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    );
    if (imageItem) {
      if (settings.enableCtrlC) sendImage(imageItem.getAsFile());
      return;
    }
    if (clipboard.files && clipboard.files.length) return;

    const target = getDeepActiveElement();
    const sensitive = Boolean(target) && isSensitiveField(target);
    const text = clipboard.getData('text/plain') || clipboard.getData('text');
    const saveText = settings.enableCtrlC && !sensitive && text.trim() ? text : '';

    const shouldIntercept = settings.enablePasteMulti
      && !sensitive
      && isEditable(target)
      && consumePasteKey();

    if (!shouldIntercept) {
      if (saveText) sendToBackground({ type: MSG.SAVE_TEXT, text: saveText });
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const selection = window.getSelection();
    const context = {
      target,
      range: target.isContentEditable && selection && selection.rangeCount
        ? selection.getRangeAt(0).cloneRange()
        : null,
      clipboardText: text,
      saveText
    };
    if (settings.pasteMode === 'quick') startQuickPaste(context);
    else openBoxPicker(context);
  }

  // ---------- keyboard ----------

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function digitToSlot(event) {
    if (event.altKey || event.shiftKey || !/^[0-9]$/.test(event.key)) return -1;
    return event.key === '0' ? 9 : Number(event.key) - 1;
  }

  function handlePickerKey(event) {
    if (MODIFIER_KEYS.has(event.key)) return false;
    switch (event.key) {
      case 'ArrowDown': consume(event); CopyLoadPicker.move(1); return true;
      case 'ArrowUp': consume(event); CopyLoadPicker.move(-1); return true;
      case 'Enter': consume(event); CopyLoadPicker.pickSelected(); return true;
      case 'Escape': consume(event); CopyLoadPicker.close(); return true;
      default: break;
    }
    const slot = digitToSlot(event);
    if (slot !== -1) {
      consume(event);
      CopyLoadPicker.pickAt(slot);
      return true;
    }
    CopyLoadPicker.close(); // any other key means "never mind"
    return false;
  }

  function handleQuickKey(event) {
    if (MODIFIER_KEYS.has(event.key)) return false;
    const slot = digitToSlot(event);
    if (slot !== -1) {
      consume(event);
      finishQuickPaste(slot);
      return true;
    }
    finishQuickPaste(null);
    return false;
  }

  function onKeyDown(event) {
    if (!event.isTrusted) return;
    if (CopyLoadPicker.isOpen() && handlePickerKey(event)) return;
    if (pendingQuick && handleQuickKey(event)) return;

    const isPasteShortcut = (event.ctrlKey || event.metaKey)
      && !event.shiftKey && !event.altKey
      && typeof event.key === 'string' && event.key.toLowerCase() === 'v';
    lastPasteKeyAt = isPasteShortcut ? Date.now() : 0;
  }

  // ---------- init ----------

  getSettings().then((loaded) => { settings = loaded; }).catch(() => { /* keep defaults */ });
  onSettingsChanged((updates) => Object.assign(settings, updates));

  document.addEventListener('copy', onCopyOrCut, true);
  document.addEventListener('cut', onCopyOrCut, true);
  document.addEventListener('paste', onPaste, true);
  document.addEventListener('keydown', onKeyDown, true);
})();

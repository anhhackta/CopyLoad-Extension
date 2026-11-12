// App bootstrap shared by popup.html, sidepanel.html, and manager.html.

const VIEW_NAMES = ['texts', 'images', 'data', 'settings'];
const IS_POPUP = document.body.dataset.view === 'popup';
const IS_SIDEPANEL = document.body.dataset.view === 'sidepanel';
const MANAGER_PAGE_PATH = 'src/app/manager.html';
const DATA_REFRESH_DEBOUNCE_MS = 120;

let activeViewName = 'texts';

async function refreshActiveView() {
  if (activeViewName === 'texts' && !textsView.selecting) await refreshTexts();
  else if (activeViewName === 'images' && !imagesView.selecting) await refreshImages();
  else if (activeViewName === 'data') await refreshDataSummary();
}

async function showView(name) {
  activeViewName = name;
  VIEW_NAMES.forEach((viewName) => {
    $(`view-${viewName}`).classList.toggle('active', viewName === name);
  });
  document.querySelectorAll('#nav .nav-item').forEach((item) => {
    const isActive = item.dataset.nav === name;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  await refreshActiveView();
}

function refreshPinNoteButton() {
  const btn = $('pinNoteBtn');
  if (!btn || !appState.settings) return;
  const active = Boolean(appState.settings.enableFloatingNote);
  btn.classList.toggle('active', active);
  const label = t(active ? 'unpinNote' : 'pinNote');
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-pressed', String(active));
}

function applyAllSettings() {
  const { settings } = appState;
  appState.language = settings.language;
  applyTheme(settings.theme);
  applyI18n();
  refreshPinNoteButton();
  renderKindChips();
  relabelDataView();
  relabelSettingsView();
  updateTextSelectionUi();
  updateImageSelectionUi();
}

async function openManagerPage() {
  await chrome.tabs.create({ url: chrome.runtime.getURL(MANAGER_PAGE_PATH) });
  if (IS_POPUP) window.close();
}

async function openSidePanel() {
  if (!chrome.sidePanel || typeof chrome.sidePanel.open !== 'function') {
    toast(t('sidePanelUnsupported'), 'error');
    return;
  }
  const currentWindow = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({ windowId: currentWindow.id });
  if (IS_POPUP) window.close();
}

async function togglePinNote() {
  const next = !appState.settings.enableFloatingNote;
  await setSetting('enableFloatingNote', next);
  appState.settings.enableFloatingNote = next;
  refreshPinNoteButton();
  toast(t(next ? 'notePinnedToast' : 'noteUnpinnedToast'));
}

async function lockAndPrompt() {
  await lockNow();
  await ensureUnlocked();
}

// ---------- Drag & Drop to Save ----------

function extractDraggedImageSrc(dataTransfer) {
  try {
    const html = dataTransfer.getData('text/html');
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img[src]');
    return img ? img.getAttribute('src') : null;
  } catch (_) {
    return null;
  }
}

function extractDraggedText(dataTransfer) {
  const plain = (dataTransfer.getData('text/plain') || '').trim();
  if (plain) return plain;

  const uriList = (dataTransfer.getData('text/uri-list') || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .join('\n');
  if (uriList) return uriList;

  return (dataTransfer.getData('URL') || dataTransfer.getData('text') || '').trim();
}

async function trySaveImageFromUrl(url) {
  if (!url || !/^(?:https?:|data:image\/|blob:)/i.test(url)) return false;
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return false;
    if (blob.size > LIMITS.MAX_IMAGE_BYTES) {
      toast(t('imageTooLarge', { mb: LIMITS.MAX_IMAGE_BYTES / (1024 * 1024) }), 'error');
      return true;
    }
    const id = await saveImageBlob(blob);
    return id !== null;
  } catch (_) {
    return false;
  }
}

async function handleDropData(dataTransfer) {
  if (!dataTransfer) return;

  // 1. Direct image files dragged from page or system
  const files = Array.from(dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));
  if (files.length > 0) {
    let savedAny = false;
    for (const file of files) {
      if (file.size > LIMITS.MAX_IMAGE_BYTES) {
        toast(t('imageTooLarge', { mb: LIMITS.MAX_IMAGE_BYTES / (1024 * 1024) }), 'error');
        continue;
      }
      if ((await saveImageBlob(file)) !== null) savedAny = true;
    }
    if (savedAny) {
      toast(t('dropSavedImage'));
      if (activeViewName === 'images') await refreshImages();
      else if (activeViewName === 'data') await refreshDataSummary();
    }
    return;
  }

  // 2. Dragged <img> element from a webpage
  const imgSrc = extractDraggedImageSrc(dataTransfer);
  if (imgSrc && (await trySaveImageFromUrl(imgSrc))) {
    toast(t('dropSavedImage'));
    if (activeViewName === 'images') await refreshImages();
    else if (activeViewName === 'data') await refreshDataSummary();
    return;
  }

  // 3. Dragged text or URL (including Omnibox selection)
  const text = extractDraggedText(dataTransfer);
  if (text) {
    if (activeViewName === 'images' && (await trySaveImageFromUrl(text))) {
      toast(t('dropSavedImage'));
      await refreshImages();
      return;
    }
    if (appState.settings.enablePersistent) await saveTextEntry(text);
    else await addTemp(text);
    toast(t('dropSavedText'));
    if (activeViewName === 'texts') await refreshTexts();
    else if (activeViewName === 'data') await refreshDataSummary();
    return;
  }

  // 4. Browser did not attach any payload (e.g. restricted Omnibox drag)
  toast(t('dropOmniboxEmpty'), 'error');
}

function initDropZones() {
  const content = $('mainContent');
  const overlay = $('dropOverlay');
  if (!content || !overlay) return;

  let dragDepth = 0;
  let internalDrag = false;

  const hideOverlay = () => {
    dragDepth = 0;
    overlay.hidden = true;
  };

  const canDrop = () => !internalDrag && $('lockScreen').hidden;

  content.addEventListener('dragstart', () => { internalDrag = true; });
  document.addEventListener('dragend', () => {
    internalDrag = false;
    hideOverlay();
  });

  content.addEventListener('dragenter', (event) => {
    if (!canDrop()) return;
    event.preventDefault();
    dragDepth++;
    overlay.hidden = false;
  });

  content.addEventListener('dragover', (event) => {
    if (!canDrop()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    overlay.hidden = false;
  });

  content.addEventListener('dragleave', (event) => {
    if (event.relatedTarget === null || !content.contains(event.relatedTarget)) {
      hideOverlay();
      return;
    }
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) overlay.hidden = true;
  });

  content.addEventListener('drop', (event) => {
    if (!canDrop()) return;
    event.preventDefault();
    event.stopPropagation();
    hideOverlay();
    handleDropData(event.dataTransfer).catch(reportError);
  });

  window.addEventListener('blur', hideOverlay);
}

function wireShell() {
  document.querySelectorAll('#nav .nav-item').forEach((item) => {
    item.addEventListener('click', () => showView(item.dataset.nav).catch(reportError));
  });
  $('openManagerBtn').addEventListener('click', () => openManagerPage().catch(reportError));
  const sidePanelBtn = $('openSidePanelBtn');
  if (sidePanelBtn) sidePanelBtn.addEventListener('click', () => openSidePanel().catch(reportError));
  const pinNoteBtn = $('pinNoteBtn');
  if (pinNoteBtn) pinNoteBtn.addEventListener('click', () => togglePinNote().catch(reportError));
  $('lockNowBtn').addEventListener('click', () => lockAndPrompt().catch(reportError));

  onSettingsChanged((updates) => {
    Object.assign(appState.settings, updates);
    applyAllSettings();
    syncSettingsControls();
    if (
      'language' in updates ||
      'textSortMode' in updates ||
      'enableKindText' in updates ||
      'enableKindLink' in updates ||
      'enableKindCode' in updates ||
      'enableKindEmail' in updates ||
      'enableKindNumber' in updates
    ) {
      refreshActiveView().catch(reportError);
    }
  });

  const debouncedRefresh = debounce(() => {
    if (!document.hidden && !pinPrompt.active) {
      refreshActiveView().catch(reportError);
    }
  }, DATA_REFRESH_DEBOUNCE_MS);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && STORAGE_KEYS.LAST_DATA_CHANGE_AT in changes) {
      debouncedRefresh();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !pinPrompt.active) refreshActiveView().catch(reportError);
  });
}

async function boot() {
  renderIcons();
  appState.settings = await getSettings();
  appState.language = appState.settings.language;
  applyTheme(appState.settings.theme);
  applyI18n();
  initLockUi();

  // Nothing is loaded from the database until the PIN (if any) is accepted.
  await ensureUnlocked();
  await refreshLockButton();

  initTextsView();
  initImagesView();
  initDataView();
  initSettingsView();
  initDropZones();
  wireShell();
  applyAllSettings();
  startUnlockTracking();

  await showView('texts');
  if (IS_POPUP || IS_SIDEPANEL) $('searchInput').focus();
}

boot().catch(reportError);

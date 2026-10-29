// App bootstrap shared by popup.html and manager.html.

const VIEW_NAMES = ['texts', 'images', 'data', 'settings'];
const IS_POPUP = document.body.dataset.view === 'popup';
const MANAGER_PAGE_PATH = 'src/app/manager.html';

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

function applyAllSettings() {
  const { settings } = appState;
  appState.language = settings.language;
  applyTheme(settings.theme);
  applyI18n();
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

async function lockAndPrompt() {
  await lockNow();
  await ensureUnlocked();
}

function wireShell() {
  document.querySelectorAll('#nav .nav-item').forEach((item) => {
    item.addEventListener('click', () => showView(item.dataset.nav).catch(reportError));
  });
  $('openManagerBtn').addEventListener('click', () => openManagerPage().catch(reportError));
  $('lockNowBtn').addEventListener('click', () => lockAndPrompt().catch(reportError));

  onSettingsChanged((updates) => {
    Object.assign(appState.settings, updates);
    applyAllSettings();
    syncSettingsControls();
    if ('language' in updates) refreshActiveView().catch(reportError);
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
  wireShell();
  applyAllSettings();
  startUnlockTracking();

  await showView('texts');
  if (IS_POPUP) $('searchInput').focus();
}

boot().catch(reportError);

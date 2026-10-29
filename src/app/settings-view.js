// Settings view: preferences, Paste Multi, PIN lock.

const AUTO_DELETE_CHOICES = SETTINGS_SCHEMA.autoDeleteDays.allowed;
const LOCK_TIMEOUT_CHOICES = SETTINGS_SCHEMA.lockTimeoutMin.allowed;
const SWITCH_SETTINGS = ['enableCtrlC', 'enablePersistent', 'enablePasteMulti'];
const SELECT_SETTINGS = ['language', 'theme', 'pasteMode', 'pasteCount', 'autoDeleteDays', 'lockTimeoutMin'];
const NUMERIC_SELECT_SETTINGS = new Set(['pasteCount', 'autoDeleteDays', 'lockTimeoutMin']);

function fillNumericSelect(selectId, choices, labelFor) {
  $(selectId).replaceChildren(...choices.map((value) => h('option', { value: String(value), textContent: labelFor(value) })));
}

// Labels depend on the language, so options are rebuilt whenever it changes.
function relabelSettingsView() {
  fillNumericSelect('autoDeleteDays', AUTO_DELETE_CHOICES,
    (days) => (days === 0 ? t('autoDeleteOff') : t('daysUnit', { n: days })));
  fillNumericSelect('lockTimeoutMin', LOCK_TIMEOUT_CHOICES,
    (minutes) => (minutes === 0 ? t('lockEveryTime') : t('minutesUnit', { n: minutes })));
  $('versionText').textContent = t('version', { v: chrome.runtime.getManifest().version });
  syncSettingsControls();
}

function updateDependentRows() {
  document.querySelectorAll('#view-settings [data-requires]').forEach((row) => {
    const enabled = $(row.dataset.requires).checked;
    row.classList.toggle('disabled', !enabled);
    row.querySelectorAll('select, button, input').forEach((control) => { control.disabled = !enabled; });
  });
}

// Copies stored settings into the controls (called on load and on every change).
async function syncSettingsControls() {
  const settings = appState.settings;
  if (!settings) return;
  SWITCH_SETTINGS.forEach((key) => { $(key).checked = settings[key]; });
  SELECT_SETTINGS.forEach((key) => { $(key).value = String(settings[key]); });
  $('pinLockToggle').checked = await isLockEnabled();
  updateDependentRows();
}

async function togglePinLock(enabled) {
  const toggle = $('pinLockToggle');
  if (enabled) {
    if (await runCreatePinFlow()) toast(t('pinEnabled'));
  } else if (await verifyCurrentPin()) {
    await removeLock();
    toast(t('pinDisabled'));
  }
  toggle.checked = await isLockEnabled();
  updateDependentRows();
  await refreshLockButton();
}

async function changePin() {
  if (!(await verifyCurrentPin())) return;
  if (await runCreatePinFlow()) toast(t('pinChanged'));
}

function initSettingsView() {
  const guard = (fn) => (event) => fn(event).catch(reportError);

  SWITCH_SETTINGS.forEach((key) => {
    $(key).addEventListener('change', guard(async (event) => {
      await setSetting(key, event.target.checked);
      updateDependentRows();
    }));
  });
  SELECT_SETTINGS.forEach((key) => {
    $(key).addEventListener('change', guard(async (event) => {
      const raw = event.target.value;
      await setSetting(key, NUMERIC_SELECT_SETTINGS.has(key) ? Number(raw) : raw);
    }));
  });

  $('pinLockToggle').addEventListener('change', guard((event) => togglePinLock(event.target.checked)));
  $('pinChangeBtn').addEventListener('click', guard(changePin));

  relabelSettingsView();
}

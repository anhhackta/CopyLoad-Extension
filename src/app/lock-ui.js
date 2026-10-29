// PIN screen: a phone-style keypad used to unlock, and to create/confirm a new PIN.

const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];
const PIN_RESET_RESULT = Symbol('pin-reset');
const IDLE_CHECK_INTERVAL_MS = 15 * 1000;
const COUNTDOWN_TICK_MS = 500;

const pinPrompt = {
  active: null,
  countdownTimer: null
};

function pinMaxLength(options) {
  return options.fixedLength || LIMITS.PIN_MAX_LENGTH;
}

function renderPinDots() {
  const { options, entered } = pinPrompt.active;
  const dotCount = options.fixedLength || Math.max(entered.length, LIMITS.PIN_MIN_LENGTH);
  const dots = $('pinDots');
  dots.replaceChildren(...Array.from({ length: dotCount }, (_, i) =>
    h('span', { className: i < entered.length ? 'pin-dot filled' : 'pin-dot' })));
}

function setPinMessage(message) {
  $('pinMessage').textContent = message || '';
}

function stopPinCountdown() {
  clearInterval(pinPrompt.countdownTimer);
  pinPrompt.countdownTimer = null;
}

function startPinCountdown(until) {
  stopPinCountdown();
  const tick = () => {
    const secondsLeft = Math.ceil((until - Date.now()) / 1000);
    if (secondsLeft <= 0) {
      stopPinCountdown();
      setPinMessage('');
      if (pinPrompt.active) pinPrompt.active.busy = false;
      return;
    }
    setPinMessage(t('pinLockedOut', { s: secondsLeft }));
  };
  tick();
  pinPrompt.countdownTimer = setInterval(tick, COUNTDOWN_TICK_MS);
}

function finishPinPrompt(value) {
  const { resolve } = pinPrompt.active;
  pinPrompt.active = null;
  stopPinCountdown();
  $('lockScreen').hidden = true;
  resolve(value);
}

async function submitPin() {
  const prompt = pinPrompt.active;
  if (!prompt || prompt.busy) return;
  prompt.busy = true;
  const pin = prompt.entered;
  let result;
  try {
    result = await prompt.options.validate(pin);
  } catch (error) {
    reportError(error);
    result = { ok: false };
  }
  if (pinPrompt.active !== prompt) return; // reset while validating

  if (result.ok) {
    finishPinPrompt(pin);
    return;
  }
  prompt.entered = '';
  renderPinDots();
  const dots = $('pinDots');
  dots.classList.remove('shake');
  void dots.offsetWidth; // restart the animation
  dots.classList.add('shake');
  if (result.lockedUntil) {
    startPinCountdown(result.lockedUntil); // stays busy until the countdown ends
    return;
  }
  setPinMessage(result.message || '');
  prompt.busy = false;
}

function handlePinKey(key) {
  const prompt = pinPrompt.active;
  if (!prompt || prompt.busy) return;

  if (/^\d$/.test(key)) {
    if (prompt.entered.length >= pinMaxLength(prompt.options)) return;
    prompt.entered += key;
    setPinMessage('');
    renderPinDots();
    if (prompt.options.fixedLength && prompt.entered.length === prompt.options.fixedLength) submitPin();
  } else if (key === 'back') {
    prompt.entered = prompt.entered.slice(0, -1);
    renderPinDots();
  } else if (key === 'ok') {
    if (!prompt.options.fixedLength && prompt.entered.length >= LIMITS.PIN_MIN_LENGTH) submitPin();
  }
}

// options: { title, fixedLength?, cancellable?, forgot?, validate(pin) -> { ok, message?, lockedUntil? } }
// Resolves with the accepted PIN, or null when cancelled.
function promptPin(options) {
  return new Promise((resolve) => {
    pinPrompt.active = { options, entered: '', busy: false, resolve };
    $('pinTitle').textContent = options.title;
    $('pinKeys').dataset.fixed = options.fixedLength ? 'true' : 'false';
    $('pinForgotBtn').hidden = !options.forgot;
    $('pinCancelBtn').hidden = !options.cancellable;
    setPinMessage('');
    renderPinDots();
    $('lockScreen').hidden = false;
  });
}

async function resetAfterForgottenPin() {
  const confirmed = await confirmDialog({
    title: t('pinForgotTitle'),
    text: t('pinForgotText'),
    confirmLabel: t('pinReset')
  });
  if (!confirmed) return;
  await Promise.all([clearStore(STORE.TEXTS), clearStore(STORE.IMAGES), clearTemp()]);
  await removeLock();
  if (pinPrompt.active) finishPinPrompt(PIN_RESET_RESULT);
}

async function validateExistingPin(pin) {
  const result = await verifyPin(pin);
  if (result.ok) return { ok: true };
  if (result.lockedUntil) return { ok: false, lockedUntil: result.lockedUntil };
  return { ok: false, message: t('pinWrong', { n: result.attemptsLeft }) };
}

// Resolves true once the user may see their data.
async function ensureUnlocked() {
  if (await isUnlockValid()) return true;
  const config = await getLockConfig();
  const result = await promptPin({
    title: t('pinEnter'),
    fixedLength: config.length,
    forgot: true,
    validate: validateExistingPin
  });
  return result !== null;
}

async function verifyCurrentPin() {
  const config = await getLockConfig();
  const result = await promptPin({
    title: t('pinCurrent'),
    fixedLength: config.length,
    cancellable: true,
    validate: validateExistingPin
  });
  return result !== null && result !== PIN_RESET_RESULT;
}

async function runCreatePinFlow() {
  const first = await promptPin({
    title: t('pinNew'),
    cancellable: true,
    validate: async () => ({ ok: true })
  });
  if (first === null) return false;

  const second = await promptPin({
    title: t('pinConfirm'),
    cancellable: true,
    validate: async (pin) => (pin === first ? { ok: true } : { ok: false, message: t('pinMismatch') })
  });
  if (second === null) return false;

  await setupPin(first);
  return true;
}

function initLockUi() {
  const keys = $('pinKeys');
  PIN_KEYS.forEach((key) => {
    const button = h('button', { type: 'button', className: `pin-key pin-key-${key}`, dataset: { key } });
    if (key === 'back') {
      button.innerHTML = iconSvg('backspace');
      button.title = t('pinBackspace');
      button.setAttribute('aria-label', t('pinBackspace'));
    } else if (key === 'ok') {
      button.innerHTML = iconSvg('check');
      button.title = t('ok');
      button.setAttribute('aria-label', t('ok'));
    } else {
      button.textContent = key;
    }
    button.addEventListener('click', () => handlePinKey(key));
    keys.appendChild(button);
  });

  $('pinForgotBtn').addEventListener('click', () => resetAfterForgottenPin().catch(reportError));
  $('pinCancelBtn').addEventListener('click', () => {
    if (pinPrompt.active && pinPrompt.active.options.cancellable) finishPinPrompt(null);
  });

  document.addEventListener('keydown', (event) => {
    const prompt = pinPrompt.active;
    if (!prompt || $('dialogRoot').childElementCount) return;
    if (/^\d$/.test(event.key)) handlePinKey(event.key);
    else if (event.key === 'Backspace') handlePinKey('back');
    else if (event.key === 'Enter') handlePinKey('ok');
    else if (event.key === 'Escape' && prompt.options.cancellable) finishPinPrompt(null);
    else return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}

// Keeps the unlock window alive while the user is active, and re-locks an idle page.
function startUnlockTracking() {
  let lastTouch = 0;
  const touch = async () => {
    const now = Date.now();
    if (now - lastTouch < TIMING.UNLOCK_TOUCH_THROTTLE_MS || pinPrompt.active) return;
    lastTouch = now;
    if (await isLockEnabled()) await markUnlocked();
  };
  ['pointerdown', 'keydown'].forEach((name) => document.addEventListener(name, touch, true));

  setInterval(async () => {
    if (pinPrompt.active) return;
    const { lockTimeoutMin } = await getSettings();
    if (lockTimeoutMin > 0 && !(await isUnlockValid())) await ensureUnlocked();
  }, IDLE_CHECK_INTERVAL_MS);
}

async function refreshLockButton() {
  $('lockNowBtn').hidden = !(await isLockEnabled());
}

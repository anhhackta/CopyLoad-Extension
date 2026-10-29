// Texts view: search, kind filters, pinned section, lazy paging, bulk select.

const KIND_FILTERS = ['all', 'pinned', KIND.LINK, KIND.EMAIL, KIND.NUMBER, KIND.CODE, KIND.TEXT];
const KIND_LABEL_KEYS = Object.freeze({
  all: 'kindAll',
  pinned: 'kindPinned',
  [KIND.LINK]: 'kindLink',
  [KIND.EMAIL]: 'kindEmail',
  [KIND.NUMBER]: 'kindNumber',
  [KIND.CODE]: 'kindCode',
  [KIND.TEXT]: 'kindText'
});
const SEARCH_DEBOUNCE_MS = 200;
const LOAD_MORE_MARGIN = '200px';

const textsView = {
  filter: { search: '', kind: 'all' },
  cursor: null,
  hasMore: false,
  loading: false,
  token: 0,
  selecting: false,
  items: new Map(), // String(id) -> list item, for rendered cards
  selection: null,
  observer: null
};

function toTempListItem(entry) {
  return {
    id: entry.id,
    preview: entry.content.length > LIMITS.PREVIEW_CHARS ? entry.content.slice(0, LIMITS.PREVIEW_CHARS) : entry.content,
    length: entry.content.length,
    savedAt: entry.savedAt,
    kind: entry.kind || KIND.TEXT,
    pinned: false,
    temp: true
  };
}

function splitIdsByStore(ids) {
  return { tempIds: ids.filter(isTempId), dbIds: ids.filter((id) => !isTempId(id)) };
}

function activeKindFilter() {
  const { kind, search } = textsView.filter;
  return { search, kind: kind === 'pinned' ? 'all' : kind };
}

// ---------- rendering ----------

function renderKindChips() {
  const chips = $('kindChips');
  chips.replaceChildren(...KIND_FILTERS.map((kind) => h('button', {
    type: 'button',
    className: 'chip',
    textContent: t(KIND_LABEL_KEYS[kind]),
    'aria-pressed': String(textsView.filter.kind === kind),
    onClick: () => {
      textsView.filter.kind = kind;
      renderKindChips();
      refreshTexts().catch(reportError);
    }
  })));
}

function renderTextCard(item) {
  textsView.items.set(String(item.id), item);

  const meta = h('div', { className: 'card-meta' });
  if (item.kind !== KIND.TEXT) {
    meta.appendChild(h('span', { className: `tag tag-${item.kind}`, textContent: t(KIND_LABEL_KEYS[item.kind]) }));
  }
  if (item.temp) meta.appendChild(h('span', { className: 'tag tag-temp', textContent: t('tempBadge') }));
  meta.appendChild(h('span', {
    className: 'meta-text',
    textContent: `${formatTimestamp(item.savedAt)} · ${t('charCount', { n: item.length })}`
  }));

  const body = h('div', { className: 'card-main' }, [
    meta,
    h('div', { className: `card-text${item.kind === KIND.CODE ? ' mono' : ''}`, textContent: item.preview })
  ]);

  const actions = h('div', { className: 'card-actions' });
  actions.appendChild(iconButton('copy', t('copy'), (event) => { event.stopPropagation(); copyTextItem(item); }));
  if (item.temp) {
    actions.appendChild(iconButton('keep', t('keepTemp'), (event) => { event.stopPropagation(); keepTempItem(item); }));
  } else {
    actions.appendChild(iconButton(item.pinned ? 'pinOff' : 'pin', item.pinned ? t('unpin') : t('pin'),
      (event) => { event.stopPropagation(); togglePinTextItem(item); }, item.pinned ? 'active' : ''));
  }
  actions.appendChild(iconButton('trash', t('delete'), (event) => { event.stopPropagation(); deleteTextItem(item); }, 'danger'));

  const check = h('span', { className: 'check' });
  check.innerHTML = iconSvg('check');

  const card = h('li', {
    className: item.pinned ? 'card pinned' : 'card',
    dataset: { id: String(item.id) },
    onClick: () => {
      if (textsView.selecting) textsView.selection.toggle(item.id);
      else copyTextItem(item);
    }
  }, [check, body, actions]);
  if (textsView.selection.has(item.id)) card.classList.add('selected');
  return card;
}

function renderTextEmptyState(hasAnyItem) {
  const empty = $('textEmpty');
  empty.hidden = hasAnyItem;
  if (hasAnyItem) return;
  const filtering = Boolean(textsView.filter.search.trim()) || textsView.filter.kind !== 'all';
  $('textEmptyTitle').textContent = filtering ? t('emptySearch') : t('emptyTexts');
  $('textEmptyHint').textContent = filtering ? '' : t('emptyTextsHint');
}

function updateTextSelectionUi() {
  const selection = textsView.selection;
  document.querySelectorAll('#view-texts .card').forEach((card) => {
    const item = textsView.items.get(card.dataset.id);
    card.classList.toggle('selected', Boolean(item) && selection.has(item.id));
  });
  $('textBulkCount').textContent = t('selectedCount', { n: selection.size });
  const hasSelection = selection.size > 0;
  ['textBulkPin', 'textBulkUnpin', 'textBulkDelete'].forEach((id) => { $(id).disabled = !hasSelection; });
}

function rewatchTextSentinel() {
  textsView.observer.disconnect();
  textsView.observer.observe($('textSentinel'));
}

async function refreshTexts() {
  const token = ++textsView.token;
  const pinnedOnly = textsView.filter.kind === 'pinned';
  const filter = activeKindFilter();
  const matches = buildTextMatcher(filter);

  const [pinnedItems, tempEntries, page] = await Promise.all([
    queryPinnedTexts(filter),
    pinnedOnly ? [] : listTemp(),
    pinnedOnly ? { items: [], nextCursor: null } : queryTexts(filter)
  ]);
  if (token !== textsView.token) return; // a newer refresh superseded this one

  textsView.items.clear();
  textsView.cursor = page.nextCursor;
  textsView.hasMore = Boolean(page.nextCursor);
  textsView.loading = false;

  const recentItems = [...tempEntries.filter(matches).map(toTempListItem), ...page.items];
  $('pinnedList').replaceChildren(...pinnedItems.map(renderTextCard));
  $('pinnedSection').hidden = pinnedItems.length === 0;
  $('pinnedCount').textContent = String(pinnedItems.length);
  $('textList').replaceChildren(...recentItems.map(renderTextCard));
  $('recentTitle').hidden = !(pinnedItems.length && recentItems.length);
  renderTextEmptyState(pinnedItems.length + recentItems.length > 0);

  if (textsView.selecting) updateTextSelectionUi();
  rewatchTextSentinel();
}

async function loadMoreTexts() {
  if (!textsView.hasMore || textsView.loading) return;
  const token = textsView.token;
  textsView.loading = true;
  try {
    const page = await queryTexts({ ...activeKindFilter(), cursor: textsView.cursor });
    if (token !== textsView.token) return;
    $('textList').append(...page.items.map(renderTextCard));
    textsView.cursor = page.nextCursor;
    textsView.hasMore = Boolean(page.nextCursor);
  } finally {
    textsView.loading = false;
  }
  rewatchTextSentinel();
}

// ---------- item actions ----------

async function readFullText(item) {
  if (item.temp) {
    const entry = await getTemp(item.id);
    return entry ? entry.content : null;
  }
  const record = await getTextById(item.id);
  return record ? record.content : null;
}

async function copyTextItem(item) {
  try {
    const content = await readFullText(item);
    if (content === null) return;
    toast((await copyTextToClipboard(content)) ? t('copied') : t('copyFailed'));
  } catch (error) {
    reportError(error);
  }
}

async function togglePinTextItem(item) {
  try {
    await setPinned(STORE.TEXTS, [item.id], !item.pinned);
    await refreshTexts();
  } catch (error) {
    reportError(error);
  }
}

async function keepTempItem(item) {
  try {
    const entry = await getTemp(item.id);
    if (!entry) return;
    await saveTextEntry(entry.content, { savedAt: entry.savedAt });
    await removeTemp([item.id]);
    toast(t('kept'));
    await refreshTexts();
  } catch (error) {
    reportError(error);
  }
}

async function deleteTextItem(item) {
  try {
    if (item.temp) await removeTemp([item.id]);
    else await deleteRecords(STORE.TEXTS, [item.id]);
    toast(t('deleted', { n: 1 }));
    await refreshTexts();
  } catch (error) {
    reportError(error);
  }
}

// ---------- selection + bulk actions ----------

function setTextSelecting(on) {
  textsView.selecting = on;
  $('view-texts').classList.toggle('selecting', on);
  $('textBulkBar').hidden = !on;
  $('textSelectBtn').hidden = on;
  if (on) updateTextSelectionUi();
  else textsView.selection.clear();
}

async function selectAllTexts() {
  const filter = activeKindFilter();
  if (textsView.filter.kind === 'pinned') {
    const pinned = await queryPinnedTexts(filter);
    textsView.selection.replace(pinned.map((item) => item.id));
    return;
  }
  const matches = buildTextMatcher(filter);
  const [dbIds, tempEntries] = await Promise.all([queryTextIds(filter), listTemp()]);
  textsView.selection.replace([...dbIds, ...tempEntries.filter(matches).map((entry) => entry.id)]);
}

async function bulkDeleteTexts() {
  const ids = [...textsView.selection.ids];
  if (!ids.length) return;
  const confirmed = await confirmDialog({
    title: t('confirmDeleteTitle', { n: ids.length }),
    text: t('confirmDeleteText'),
    confirmLabel: t('delete')
  });
  if (!confirmed) return;
  const { tempIds, dbIds } = splitIdsByStore(ids);
  await deleteRecords(STORE.TEXTS, dbIds);
  await removeTemp(tempIds);
  toast(t('deleted', { n: ids.length }));
  setTextSelecting(false);
  await refreshTexts();
}

async function bulkPinTexts(pinned) {
  const { dbIds } = splitIdsByStore([...textsView.selection.ids]);
  if (!dbIds.length) return;
  await setPinned(STORE.TEXTS, dbIds, pinned);
  toast(t(pinned ? 'pinned' : 'unpinned', { n: dbIds.length }));
  setTextSelecting(false);
  await refreshTexts();
}

function initTextsView() {
  textsView.selection = createSelection(updateTextSelectionUi);
  textsView.observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadMoreTexts().catch(reportError);
  }, { root: $('textScroll'), rootMargin: LOAD_MORE_MARGIN });

  renderKindChips();

  $('searchInput').addEventListener('input', debounce((event) => {
    textsView.filter.search = event.target.value;
    refreshTexts().catch(reportError);
  }, SEARCH_DEBOUNCE_MS));

  const guard = (fn) => () => fn().catch(reportError);
  $('textSelectBtn').addEventListener('click', () => setTextSelecting(true));
  $('textBulkCancel').addEventListener('click', () => setTextSelecting(false));
  $('textBulkAll').addEventListener('click', guard(selectAllTexts));
  $('textBulkDelete').addEventListener('click', guard(bulkDeleteTexts));
  $('textBulkPin').addEventListener('click', guard(() => bulkPinTexts(true)));
  $('textBulkUnpin').addEventListener('click', guard(() => bulkPinTexts(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && textsView.selecting && !$('dialogRoot').childElementCount) setTextSelecting(false);
  });
}

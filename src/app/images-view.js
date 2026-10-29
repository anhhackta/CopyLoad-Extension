// Images view: thumbnail grid, preview, pin, bulk select, paste from clipboard.

const imagesView = {
  cursor: null,
  hasMore: false,
  loading: false,
  token: 0,
  selecting: false,
  items: new Map(),
  selection: null,
  observer: null,
  objectUrls: []
};

function createTrackedObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  imagesView.objectUrls.push(url);
  return url;
}

function releaseImageUrls() {
  imagesView.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  imagesView.objectUrls = [];
}

function renderImageTile(item) {
  imagesView.items.set(String(item.id), item);

  const image = h('img', { src: createTrackedObjectUrl(item.thumb), alt: '', draggable: false });
  const check = h('span', { className: 'check' });
  check.innerHTML = iconSvg('check');

  const actions = h('div', { className: 'tile-actions' }, [
    iconButton('copy', t('copy'), (event) => { event.stopPropagation(); copyImageItem(item); }),
    iconButton('download', t('download'), (event) => { event.stopPropagation(); downloadImageItem(item); }),
    iconButton(item.pinned ? 'pinOff' : 'pin', item.pinned ? t('unpin') : t('pin'),
      (event) => { event.stopPropagation(); togglePinImageItem(item); }),
    iconButton('trash', t('delete'), (event) => { event.stopPropagation(); deleteImageItem(item); }, 'danger')
  ]);

  const tile = h('div', {
    className: item.pinned ? 'tile pinned' : 'tile',
    dataset: { id: String(item.id) },
    onClick: () => {
      if (imagesView.selecting) imagesView.selection.toggle(item.id);
      else previewImageItem(item).catch(reportError);
    }
  }, [image, check, actions]);
  if (item.pinned) tile.appendChild(h('span', { className: 'tile-pin', innerHTML: iconSvg('pin') }));
  if (imagesView.selection.has(item.id)) tile.classList.add('selected');
  return tile;
}

function updateImageSelectionUi() {
  const selection = imagesView.selection;
  document.querySelectorAll('#view-images .tile').forEach((tile) => {
    const item = imagesView.items.get(tile.dataset.id);
    tile.classList.toggle('selected', Boolean(item) && selection.has(item.id));
  });
  $('imageBulkCount').textContent = t('selectedCount', { n: selection.size });
  const hasSelection = selection.size > 0;
  ['imageBulkPin', 'imageBulkUnpin', 'imageBulkDelete'].forEach((id) => { $(id).disabled = !hasSelection; });
}

function rewatchImageSentinel() {
  imagesView.observer.disconnect();
  imagesView.observer.observe($('imageSentinel'));
}

async function refreshImages() {
  const token = ++imagesView.token;
  const [pinned, page] = await Promise.all([queryPinnedImages(), queryImages()]);
  if (token !== imagesView.token) return;

  releaseImageUrls();
  imagesView.items.clear();
  imagesView.cursor = page.nextCursor;
  imagesView.hasMore = Boolean(page.nextCursor);
  imagesView.loading = false;

  $('pinnedImageGrid').replaceChildren(...pinned.map(renderImageTile));
  $('pinnedImageSection').hidden = pinned.length === 0;
  $('imageGrid').replaceChildren(...page.items.map(renderImageTile));
  $('recentImageTitle').hidden = !(pinned.length && page.items.length);
  $('imageEmpty').hidden = pinned.length + page.items.length > 0;

  if (imagesView.selecting) updateImageSelectionUi();
  rewatchImageSentinel();
}

async function loadMoreImages() {
  if (!imagesView.hasMore || imagesView.loading) return;
  const token = imagesView.token;
  imagesView.loading = true;
  try {
    const page = await queryImages({ cursor: imagesView.cursor });
    if (token !== imagesView.token) return;
    $('imageGrid').append(...page.items.map(renderImageTile));
    imagesView.cursor = page.nextCursor;
    imagesView.hasMore = Boolean(page.nextCursor);
  } finally {
    imagesView.loading = false;
  }
  rewatchImageSentinel();
}

// ---------- item actions ----------

async function copyImageItem(item) {
  try {
    const record = await getImageById(item.id);
    if (!record) return;
    await copyImageToClipboard(record.blob);
    toast(t('copied'));
  } catch (error) {
    console.error(error);
    toast(t('copyFailed'), 'error');
  }
}

async function downloadImageItem(item) {
  try {
    const record = await getImageById(item.id);
    if (record) downloadBlob(record.blob, `copyload-${timestampForFilename()}.${imageExtension(record.blob.type)}`);
  } catch (error) {
    reportError(error);
  }
}

async function togglePinImageItem(item) {
  try {
    await setPinned(STORE.IMAGES, [item.id], !item.pinned);
    await refreshImages();
  } catch (error) {
    reportError(error);
  }
}

async function deleteImageItem(item) {
  try {
    await deleteRecords(STORE.IMAGES, [item.id]);
    toast(t('deleted', { n: 1 }));
    await refreshImages();
  } catch (error) {
    reportError(error);
  }
}

async function previewImageItem(item) {
  const record = await getImageById(item.id);
  if (!record) return;
  const url = URL.createObjectURL(record.blob);
  const image = h('img', { className: 'preview-image', src: url, alt: t('imagePreview') });
  await openDialog({
    title: t('imagePreview'),
    content: [image],
    actions: [
      { label: t('copy'), onClick: () => copyImageItem(item) },
      { label: t('download'), onClick: () => downloadImageItem(item) },
      { label: t('close'), variant: 'primary', value: true, primary: true }
    ]
  });
  URL.revokeObjectURL(url);
}

async function pasteImageFromClipboard() {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const clipboardItem of clipboardItems) {
      const type = clipboardItem.types.find((mime) => mime.startsWith('image/'));
      if (!type) continue;
      const blob = await clipboardItem.getType(type);
      if (blob.size > LIMITS.MAX_IMAGE_BYTES) {
        toast(t('imageTooLarge', { mb: LIMITS.MAX_IMAGE_BYTES / (1024 * 1024) }), 'error');
        return;
      }
      await saveImageBlob(blob);
      toast(t('imageSaved'));
      await refreshImages();
      return;
    }
    toast(t('noClipboardImage'), 'error');
  } catch (error) {
    console.error(error);
    toast(t('noClipboardImage'), 'error');
  }
}

// ---------- selection + bulk actions ----------

function setImageSelecting(on) {
  imagesView.selecting = on;
  $('view-images').classList.toggle('selecting', on);
  $('imageBulkBar').hidden = !on;
  $('imageSelectBtn').hidden = on;
  if (on) updateImageSelectionUi();
  else imagesView.selection.clear();
}

async function bulkDeleteImages() {
  const ids = [...imagesView.selection.ids];
  if (!ids.length) return;
  const confirmed = await confirmDialog({
    title: t('confirmDeleteTitle', { n: ids.length }),
    text: t('confirmDeleteText'),
    confirmLabel: t('delete')
  });
  if (!confirmed) return;
  await deleteRecords(STORE.IMAGES, ids);
  toast(t('deleted', { n: ids.length }));
  setImageSelecting(false);
  await refreshImages();
}

async function bulkPinImages(pinned) {
  const ids = [...imagesView.selection.ids];
  if (!ids.length) return;
  await setPinned(STORE.IMAGES, ids, pinned);
  toast(t(pinned ? 'pinned' : 'unpinned', { n: ids.length }));
  setImageSelecting(false);
  await refreshImages();
}

function initImagesView() {
  imagesView.selection = createSelection(updateImageSelectionUi);
  imagesView.observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadMoreImages().catch(reportError);
  }, { root: $('imageScroll'), rootMargin: LOAD_MORE_MARGIN });

  const guard = (fn) => () => fn().catch(reportError);
  $('pasteImageBtn').addEventListener('click', pasteImageFromClipboard);
  $('imageSelectBtn').addEventListener('click', () => setImageSelecting(true));
  $('imageBulkCancel').addEventListener('click', () => setImageSelecting(false));
  $('imageBulkAll').addEventListener('click', guard(async () => imagesView.selection.replace(await queryImageIds())));
  $('imageBulkDelete').addEventListener('click', guard(bulkDeleteImages));
  $('imageBulkPin').addEventListener('click', guard(() => bulkPinImages(true)));
  $('imageBulkUnpin').addEventListener('click', guard(() => bulkPinImages(false)));
}

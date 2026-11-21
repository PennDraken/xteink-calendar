const get = (id) => document.getElementById(id);
const canvas = get('calendar');
const context = canvas.getContext('2d', { willReadFrequently: true });
const monthNames = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleString('en', { month: 'long' }));
const defaults = { 'week-start': 1, 'show-week-numbers': true, 'show-adjacent-dates': false, 'image-enabled': true, 'image-height': 28, 'image-radius': 8, 'show-image-treatment': false, 'margin-horizontal': 0, 'margin-vertical': 0, spacing: 8, 'show-lines': true, 'show-note': false, note: 'John Doe', brightness: 100, contrast: 110, 'image-position': 50, dither: false, font: 'serif', 'title-size': 62, 'year-size': 28, 'date-size': 38, invert: false };
const units = { 'image-height': '%', 'image-radius': ' px', 'margin-horizontal': ' px', 'margin-vertical': ' px', spacing: ' px', brightness: '%', contrast: '%', 'image-position': '%', 'title-size': ' px', 'year-size': ' px', 'date-size': ' px' };
let landscape = new Image();
let singleImage = { image: landscape, source: 'assets/mountains.jpg' };
const monthlyImages = new Map();
const pendingImages = new Map();
let toastTimer;

monthNames.forEach((name, index) => {
  get('month').add(new Option(name, index));
  get('image-month').add(new Option(name, index));
});
get('month').value = 10;

function notify(message) {
  clearTimeout(toastTimer);
  get('toast').textContent = message;
  get('toast').hidden = false;
  toastTimer = setTimeout(() => { get('toast').hidden = true; }, 3000);
}

function updateSliders() {
  const limits = getSliderLimits();
  Object.entries(units).forEach(([id, unit]) => {
    const slider = get(id);
    const minimum = Number(slider.min);
    const maximum = Number(slider.max);
    const allowed = Math.min(maximum, limits[id] ?? maximum);
    const available = Math.max(0, Math.min(100, (allowed - minimum) / (maximum - minimum) * 100));
    const invalid = Number(slider.value) > allowed;
    get(`${id}-value`).value = slider.value + unit;
    slider.style.setProperty('--progress', `${(Number(slider.value) - minimum) / (maximum - minimum) * 100}%`);
    slider.style.setProperty('--available', `${available}%`);
    slider.classList.toggle('layout-limited', allowed < maximum);
    slider.setAttribute('aria-invalid', String(invalid));
    slider.setAttribute('aria-valuetext', `${slider.value}${unit}${allowed < maximum ? `; layout limit ${Math.max(minimum, allowed)}${unit}` : ''}`);
    slider.title = allowed < maximum ? `Current layout allows up to ${Math.max(minimum, allowed)}${unit}` : '';
  });
}

function getPageSize() {
  const isLandscape = document.querySelector('input[name="orientation"]:checked').value === 'landscape';
  return { width: isLandscape ? 800 : 480, height: isLandscape ? 480 : 800, isLandscape };
}

function getSliderLimits() {
  const page = getPageSize();
  const month = Number(get('month').value);
  const year = Number(get('year').value);
  const weekStart = Number(get('week-start').value);
  const firstDay = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const rows = Math.ceil((firstDay + new Date(year, month + 1, 0).getDate()) / 7);
  const verticalMargin = Number(get('margin-vertical').value);
  const imageEnabled = get('image-enabled').checked;
  const imageExtent = imageEnabled ? Number(get('image-height').value) * (page.isLandscape ? page.width : page.height) / 100 : 0;
  const imageHeight = page.isLandscape ? 0 : imageExtent;
  const spacing = Number(get('spacing').value);
  const titleHeight = Math.max(Number(get('title-size').value), Number(get('year-size').value));
  const dateHeight = rows * (Number(get('date-size').value) + 12);
  const fixedHeight = 70 + (get('show-note').checked ? 44 : 0);
  const verticalSpacing = page.isLandscape ? 0 : spacing;
  const availableHeight = page.height - verticalMargin * 2 - fixedHeight;
  const titleLimit = Math.floor(availableHeight - imageHeight - verticalSpacing - dateHeight);
  context.save();
  context.font = `${get('date-size').value}px ${get('font').value}`;
  const minimumCalendarWidth = (get('show-week-numbers').checked ? 36 : 0) + 7 * (context.measureText('28').width + 12);
  context.restore();
  const availableWidth = page.width - Number(get('margin-horizontal').value) * 2;
  const imageGap = page.isLandscape && imageExtent > 0 ? spacing : 0;
  return {
    'margin-vertical': Math.floor((page.height - fixedHeight - imageHeight - verticalSpacing - titleHeight - dateHeight) / 2),
    'image-height': page.isLandscape ? Math.floor((availableWidth - spacing - minimumCalendarWidth) / page.width * 100) : Math.min(48, Math.floor((availableHeight - spacing - titleHeight - dateHeight) / page.height * 100)),
    spacing: page.isLandscape ? (imageExtent > 0 ? Math.floor(availableWidth - imageExtent - minimumCalendarWidth) : Number(get('spacing').max)) : Math.floor(availableHeight - imageHeight - titleHeight - dateHeight),
    'title-size': titleLimit,
    'year-size': titleLimit,
    'date-size': Math.floor((availableHeight - imageHeight - verticalSpacing - titleHeight) / rows - 12),
    'margin-horizontal': page.isLandscape ? Math.floor((page.width - imageExtent - imageGap - minimumCalendarWidth) / 2) : Number(get('margin-horizontal').max),
    'image-radius': Math.floor(Math.min((page.isLandscape ? imageExtent : availableWidth) / 2, (page.isLandscape ? page.height - verticalMargin * 2 : imageHeight) / 2)),
  };
}

function isoWeek(date) {
  const thursday = new Date(date.getTime());
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
}

function render() {
  const imageMonth = Number(get('month').value);
  const monthly = get('monthly-images').checked;
  const selectedImage = (monthly && monthlyImages.get(imageMonth)) || singleImage;
  landscape = selectedImage.image;
  get('image-thumbnail').src = selectedImage.source;
  get('image-thumbnail').alt = monthly ? `${monthNames[imageMonth]} image preview` : 'Default image preview';
  get('image-month').value = imageMonth;
  get('monthly-image-controls').hidden = !monthly;
  get('monthly-images').setAttribute('aria-expanded', String(monthly));
  get('image-month-remove').disabled = !monthlyImages.has(imageMonth);
  const month = Number(get('month').value);
  const year = Number(get('year').value);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
  const page = getPageSize();
  if (canvas.width !== page.width || canvas.height !== page.height) {
    canvas.width = page.width;
    canvas.height = page.height;
  }
  document.querySelector('.workspace').dataset.orientation = page.isLandscape ? 'landscape' : 'portrait';
  document.querySelector('label[for="image-height"]').textContent = page.isLandscape ? 'Image width' : 'Image height';
  const horizontalMargin = Number(get('margin-horizontal').value);
  const contentWidth = page.width - horizontalMargin * 2;
  const weekStart = Number(get('week-start').value);
  const firstDay = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((firstDay + days) / 7);
  const titleHeight = Math.max(Number(get('title-size').value), Number(get('year-size').value));
  const verticalMargin = Number(get('margin-vertical').value);
  const footerTop = page.height - verticalMargin - (get('show-note').checked ? 44 : 0);
  const imageExtent = get('image-enabled').checked ? Math.round((page.isLandscape ? page.width : page.height) * Number(get('image-height').value) / 100) : 0;
  const imageHeight = page.isLandscape ? (imageExtent > 0 ? Math.max(0, page.height - verticalMargin * 2) : 0) : imageExtent;
  const imageWidth = page.isLandscape ? imageExtent : contentWidth;
  const calendarLeft = horizontalMargin + (page.isLandscape && imageExtent > 0 ? imageWidth + Number(get('spacing').value) : 0);
  const width = Math.max(1, page.width - horizontalMargin - calendarLeft);
  const foreground = get('invert').checked ? '#fff' : '#111';
  const background = get('invert').checked ? '#111' : '#fff';
  context.fillStyle = background;
  context.fillRect(0, 0, page.width, page.height);

  if (imageHeight > 0 && imageWidth > 0 && landscape.complete && landscape.naturalWidth) {
    const scale = Math.max(imageWidth / landscape.naturalWidth, imageHeight / landscape.naturalHeight);
    const sourceWidth = imageWidth / scale;
    const sourceHeight = imageHeight / scale;
    const sourceTop = (landscape.naturalHeight - sourceHeight) * Number(get('image-position').value) / 100;
    context.save();
    context.filter = `grayscale(1) brightness(${get('brightness').value}%) contrast(${get('contrast').value}%)`;
    context.drawImage(landscape, (landscape.naturalWidth - sourceWidth) / 2, sourceTop, sourceWidth, sourceHeight, horizontalMargin, verticalMargin, imageWidth, imageHeight);
    context.restore();
    if (get('dither').checked) {
      const pixels = context.getImageData(horizontalMargin, verticalMargin, imageWidth, imageHeight);
      const matrix = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
        const column = (pixel / 4) % imageWidth;
        const row = Math.floor(pixel / 4 / imageWidth);
        const tone = pixels.data[pixel] > (matrix[row % 4][column % 4] + 0.5) * 16 ? 255 : 0;
        pixels.data[pixel] = pixels.data[pixel + 1] = pixels.data[pixel + 2] = tone;
      }
      context.putImageData(pixels, horizontalMargin, verticalMargin);
    }
    const imageRadius = Math.min(Number(get('image-radius').value), imageWidth / 2, imageHeight / 2);
    if (imageRadius > 0) {
      context.save();
      context.fillStyle = background;
      context.beginPath();
      context.rect(horizontalMargin, verticalMargin, imageWidth, imageHeight);
      context.roundRect(horizontalMargin, verticalMargin, imageWidth, imageHeight, imageRadius);
      context.fill('evenodd');
      context.restore();
    }
  }

  const titleTop = verticalMargin + (page.isLandscape ? 0 : imageHeight + Number(get('spacing').value));
  context.fillStyle = foreground;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.font = `${get('year-size').value}px ${get('font').value}`;
  const yearMetrics = context.measureText(String(year));
  context.font = `${get('title-size').value}px ${get('font').value}`;
  const titleBaseline = titleTop + Math.max(context.measureText(monthNames[month]).actualBoundingBoxAscent, yearMetrics.actualBoundingBoxAscent);
  context.fillText(monthNames[month], calendarLeft, titleBaseline, Math.max(1, width - Math.max(88, yearMetrics.width + 24)));
  context.font = `${get('year-size').value}px ${get('font').value}`;
  context.textAlign = 'right';
  context.fillText(year, page.width - horizontalMargin, titleBaseline);
  context.textBaseline = 'top';
  const gridTop = titleTop + titleHeight + 16;
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekColumnWidth = get('show-week-numbers').checked ? 36 : 0;
  const datesLeft = calendarLeft + weekColumnWidth;
  const cellWidth = (width - weekColumnWidth) / 7;
  const cellHeight = (footerTop - gridTop - 54) / rows;
  context.textAlign = 'center';
  context.font = '22px sans-serif';
  for (let column = 0; column < 7; column++) context.fillText(labels[(column + weekStart) % 7], datesLeft + cellWidth * (column + 0.5), gridTop);
  context.strokeStyle = foreground;
  context.lineWidth = 0.6;
  for (let row = 0; row <= rows; row++) {
    if (get('show-lines').checked || row === 0) {
      context.globalAlpha = row === 0 ? 0.8 : 0.18;
      context.beginPath();
      context.moveTo(calendarLeft, gridTop + 38 + row * cellHeight);
      context.lineTo(page.width - horizontalMargin, gridTop + 38 + row * cellHeight);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
  if (get('show-week-numbers').checked) {
    context.font = '20px sans-serif';
    context.fillText('#', calendarLeft + weekColumnWidth / 2, gridTop);
    for (let row = 0; row < rows; row++) {
      const thursday = new Date(Date.UTC(year, month, 1 - firstDay + row * 7 + (4 - weekStart + 7) % 7));
      context.fillText(isoWeek(thursday), calendarLeft + weekColumnWidth / 2, gridTop + 38 + row * cellHeight + (cellHeight - 20) / 2);
    }
  }
  context.font = `${get('date-size').value}px ${get('font').value}`;
  for (let slot = 0; slot < rows * 7; slot++) {
    const day = slot - firstDay + 1;
    const adjacent = day < 1 || day > days;
    if (adjacent && !get('show-adjacent-dates').checked) continue;
    context.fillStyle = adjacent ? '#888' : foreground;
    const dateNumber = adjacent ? new Date(year, month, day).getDate() : day;
    context.fillText(dateNumber, datesLeft + cellWidth * (slot % 7 + 0.5), gridTop + 38 + Math.floor(slot / 7) * cellHeight + (cellHeight - Number(get('date-size').value)) / 2, cellWidth - 4);
  }
  context.fillStyle = foreground;
  if (get('show-note').checked) {
    context.textAlign = 'left';
    context.strokeStyle = foreground;
    context.lineWidth = 0.7;
    context.beginPath();
    context.moveTo(calendarLeft, footerTop);
    context.lineTo(page.width - horizontalMargin, footerTop);
    context.stroke();
    context.font = '20px sans-serif';
    context.fillText(get('note').value, calendarLeft, footerTop + 12, width);
  }
  const label = `${monthNames[month]} ${year}`;
  canvas.setAttribute('aria-label', `${label} calendar preview`);
  get('note').disabled = !get('show-note').checked;
  get('note').closest('.note-field').hidden = !get('show-note').checked;
  get('image-height').disabled = !get('image-enabled').checked;
  get('image-height').closest('.slider-field').hidden = !get('image-enabled').checked;
  get('image-radius').disabled = !get('image-enabled').checked;
  get('image-treatment').hidden = !get('show-image-treatment').checked;
  get('show-image-treatment').setAttribute('aria-expanded', String(get('show-image-treatment').checked));
  updateSliders();
  updatePreviewTools();
}

function releaseImage(source) {
  if (source.startsWith('blob:')) URL.revokeObjectURL(source);
}

function loadLandscape(source, month = null) {
  const nextImage = new Image();
  pendingImages.set(month, nextImage);
  nextImage.onload = () => {
    if (pendingImages.get(month) !== nextImage) { releaseImage(source); return; }
    pendingImages.delete(month);
    const previousImage = month === null ? singleImage : monthlyImages.get(month);
    if (previousImage) releaseImage(previousImage.source);
    const image = { image: nextImage, source };
    if (month === null) singleImage = image;
    else monthlyImages.set(month, image);
    render();
  };
  nextImage.onerror = () => {
    releaseImage(source);
    if (pendingImages.get(month) !== nextImage) return;
    pendingImages.delete(month);
    notify('This image could not be loaded. Try another file.');
  };
  nextImage.src = source;
}

function reset() {
  document.querySelector('input[name="orientation"][value="portrait"]').checked = true;
  Object.entries(defaults).forEach(([id, value]) => {
    if (typeof value === 'boolean') get(id).checked = value;
    else get(id).value = value;
  });
  pendingImages.clear();
  releaseImage(singleImage.source);
  monthlyImages.forEach((image) => releaseImage(image.source));
  monthlyImages.clear();
  singleImage = { image: new Image(), source: 'assets/mountains.jpg' };
  get('monthly-images').checked = false;
  get('image-upload').value = '';
  loadLandscape('assets/mountains.jpg');
  render();
}

Object.keys(defaults).forEach((id) => get(id).addEventListener('input', () => {
  const slider = get(id);
  if (slider.type === 'range') {
    const limit = getSliderLimits()[id];
    if (limit !== undefined) slider.value = Math.max(Number(slider.min), Math.min(Number(slider.value), limit));
  }
  render();
}));
['month', 'year'].forEach((id) => get(id).addEventListener('input', render));
document.querySelectorAll('input[name="orientation"]').forEach((input) => input.addEventListener('input', render));
get('year').addEventListener('change', () => {
  get('year').value = Math.max(1900, Math.min(2100, Number(get('year').value) || 2026));
  render();
});

const tabs = [...document.querySelectorAll('.tab')];
const tabScrollPositions = new Map();
const editorPanels = document.querySelector('.editor-panels');
function selectTab(tab) {
  const currentTab = tabs.find((item) => item.classList.contains('active'));
  if (currentTab === tab) return;
  const mobile = matchMedia('(max-width: 640px)').matches;
  if (mobile && currentTab) tabScrollPositions.set(currentTab.dataset.panel, editorPanels.scrollTop);
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', active);
    item.tabIndex = active ? 0 : -1;
    get(`panel-${item.dataset.panel}`).hidden = !active;
  });
  if (mobile) editorPanels.scrollTop = tabScrollPositions.get(tab.dataset.panel) ?? 0;
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next]); tabs[next].focus(); }
  });
});

get('reset').addEventListener('click', () => { reset(); notify('Settings reset. A fresh start.'); });
get('monthly-images').addEventListener('input', render);
get('image-month').addEventListener('input', () => {
  get('month').value = get('image-month').value;
  render();
});
function changeImageMonth(offset) {
  get('month').value = (Number(get('month').value) + offset + 12) % 12;
  render();
}
get('image-month-previous').addEventListener('click', () => changeImageMonth(-1));
get('image-month-next').addEventListener('click', () => changeImageMonth(1));
get('image-month-remove').addEventListener('click', () => {
  const month = Number(get('month').value);
  pendingImages.delete(month);
  const image = monthlyImages.get(month);
  if (image) releaseImage(image.source);
  monthlyImages.delete(month);
  render();
});
get('image-upload').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { notify('Please choose an image file.'); return; }
  loadLandscape(URL.createObjectURL(file), get('monthly-images').checked ? Number(get('month').value) : null);
  event.target.value = '';
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
  get('theme-toggle').setAttribute('aria-label', label);
  get('theme-toggle').title = label;
  get('theme-toggle').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
  if (window.lucide) window.lucide.createIcons();
  try { localStorage.setItem('xteink-theme', theme); } catch {}
}
let savedTheme;
try { savedTheme = localStorage.getItem('xteink-theme'); } catch {}
setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
get('theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
get('preview-expand').addEventListener('click', () => {
  const enlarged = document.querySelector('.preview').classList.toggle('enlarged');
  const button = get('preview-expand');
  button.setAttribute('aria-pressed', enlarged);
  button.setAttribute('aria-label', enlarged ? 'Reduce preview' : 'Enlarge preview');
  button.title = button.getAttribute('aria-label');
});

const workspace = document.querySelector('.workspace');
const canvasStage = document.querySelector('.canvas-stage');
function positionPreviewSettings() {
  const panel = get('preview-settings');
  const button = get('preview-settings-toggle').getBoundingClientRect();
  panel.style.left = `${Math.max(12, Math.min(innerWidth - panel.offsetWidth - 12, button.right - panel.offsetWidth))}px`;
  panel.style.top = `${Math.max(12, Math.min(innerHeight - panel.offsetHeight - 12, button.bottom + 8))}px`;
}
get('preview-settings').addEventListener('toggle', (event) => {
  const open = event.newState === 'open';
  get('preview-settings-toggle').setAttribute('aria-expanded', open);
  if (open) positionPreviewSettings();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && get('preview-settings').matches(':popover-open')) {
    get('preview-settings').hidePopover();
    get('preview-settings-toggle').focus();
  }
});
function updatePreviewTools() {
  if (!matchMedia('(max-width: 640px)').matches) {
    workspace.classList.remove('side-tools');
    return;
  }
  const stageBounds = canvasStage.getBoundingClientRect();
  const previewWeight = document.querySelector('.preview').classList.contains('enlarged') ? 1.8 : 1.1;
  const recoveredHeight = workspace.classList.contains('side-tools') ? 0 : 40 * previewWeight / (previewWeight + 1);
  const availableHeight = stageBounds.height + recoveredHeight;
  const deviceRatio = getPageSize().isLandscape ? 307 / 187 : 187 / 307;
  const previewWidth = Math.min(stageBounds.width - 48, (availableHeight - 24) * deviceRatio);
  const fits = (stageBounds.width - previewWidth) / 2 >= 56 && availableHeight >= 192;
  workspace.classList.toggle('side-tools', fits);
  const stageTop = fits ? 0 : stageBounds.top;
  document.documentElement.style.setProperty('--preview-tools-top', `${stageTop + (availableHeight - 168) / 2}px`);
  if (get('preview-settings').matches(':popover-open')) positionPreviewSettings();
}
const previewToolsObserver = new ResizeObserver(updatePreviewTools);
previewToolsObserver.observe(workspace);
previewToolsObserver.observe(canvasStage);

function encodeBmp(imageData) {
  const { width, height, data } = imageData;
  const rowSize = Math.ceil(width / 4) * 4;
  const pixelOffset = 14 + 40 + 256 * 4;
  const bytes = new Uint8Array(pixelOffset + rowSize * height);
  const header = new DataView(bytes.buffer);
  header.setUint16(0, 0x4d42, true);
  header.setUint32(2, bytes.length, true);
  header.setUint32(10, pixelOffset, true);
  header.setUint32(14, 40, true);
  header.setInt32(18, width, true);
  header.setInt32(22, height, true);
  header.setUint16(26, 1, true);
  header.setUint16(28, 8, true);
  header.setUint32(34, rowSize * height, true);
  header.setUint32(46, 256, true);
  for (let shade = 0; shade < 256; shade++) {
    bytes.fill(shade, 54 + shade * 4, 54 + shade * 4 + 3);
  }
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const source = (row * width + column) * 4;
      bytes[pixelOffset + (height - 1 - row) * rowSize + column] = Math.round(data[source] * .299 + data[source + 1] * .587 + data[source + 2] * .114);
    }
  }
  return bytes;
}

function createCalendarFiles(start, end) {
  const originalMonth = get('month').value;
  const originalYear = get('year').value;
  const files = {};
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  try {
    for (let index = startYear * 12 + startMonth - 1; index <= endYear * 12 + endMonth - 1; index++) {
      const year = Math.floor(index / 12);
      const month = index % 12;
      get('month').value = month;
      get('year').value = year;
      render();
      files[`${year}/${monthNames[month]}.bmp`] = encodeBmp(context.getImageData(0, 0, canvas.width, canvas.height));
    }
  } finally {
    get('month').value = originalMonth;
    get('year').value = originalYear;
    render();
  }
  return files;
}

const today = new Date();
const dateValue = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
get('export-start').value = dateValue(today.getFullYear(), today.getMonth() + 1, today.getDate());
get('export-end').value = dateValue(today.getFullYear() + 1, 12, 31);
const folderExportAvailable = typeof window.showDirectoryPicker === 'function';
get('export-folder').disabled = !folderExportAvailable;
if (!folderExportAvailable) get('export-status').value = 'Folder saving is unavailable in this browser.';
function validateExportRange() {
  get('export-end').setCustomValidity(get('export-end').value < get('export-start').value ? 'End date must be on or after start date.' : '');
}
['export-start', 'export-end'].forEach((id) => get(id).addEventListener('input', validateExportRange));
function updateExportMode() {
  const current = document.querySelector('input[name="export-mode"]:checked').value === 'current';
  get('export-dates').hidden = current;
  ['export-start', 'export-end'].forEach((id) => { get(id).disabled = current; });
  get('export-folder').disabled = !current && !folderExportAvailable;
  get('export-folder').innerHTML = current ? '<i data-lucide="download"></i> Download BMP' : '<i data-lucide="folder-down"></i> Save to folder';
  get('export-status').value = !current && !folderExportAvailable ? 'Folder saving is unavailable in this browser.' : '';
  if (window.lucide) window.lucide.createIcons();
}
document.querySelectorAll('input[name="export-mode"]').forEach((input) => input.addEventListener('input', updateExportMode));
get('export-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  validateExportRange();
  if (!get('export-form').reportValidity()) return;
  const start = get('export-start').value;
  const end = get('export-end').value;
  const current = document.querySelector('input[name="export-mode"]:checked').value === 'current';
  get('export-folder').disabled = true;
  document.querySelectorAll('input[name="export-mode"]').forEach((input) => { input.disabled = true; });
  get('export-status').value = 'Exporting...';
  try {
    const directory = current ? null : await window.showDirectoryPicker({ mode: 'readwrite' });
    await document.fonts.ready;
    if (pendingImages.size) throw new Error('An image is still loading. Please try again.');
    if (current) {
      render();
      const bytes = encodeBmp(context.getImageData(0, 0, canvas.width, canvas.height));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'image/bmp' }));
      const link = document.createElement('a');
      link.download = `${monthNames[Number(get('month').value)]}.bmp`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      get('export-status').value = '1 BMP file downloaded.';
      return;
    }
    const files = createCalendarFiles(start, end);
    for (const [path, bytes] of Object.entries(files)) {
      const [year, name] = path.split('/');
      const yearDirectory = await directory.getDirectoryHandle(year, { create: true });
      const file = await yearDirectory.getFileHandle(name, { create: true });
      const writable = await file.createWritable();
      try { await writable.write(bytes); await writable.close(); }
      catch (error) { await writable.abort().catch(() => {}); throw error; }
    }
    get('export-status').value = `${Object.keys(files).length} BMP files exported.`;
  } catch (error) {
    get('export-status').value = error.name === 'AbortError' ? 'Export cancelled.' : `Export failed: ${error.message}`;
  } finally {
    get('export-folder').disabled = !current && !folderExportAvailable;
    document.querySelectorAll('input[name="export-mode"]').forEach((input) => { input.disabled = false; });
  }
});
reset();
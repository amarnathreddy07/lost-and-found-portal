import { api, assetUrl } from '../api.js';
import { state } from '../store.js';
import { emit } from '../events.js';
import { CATEGORIES, LOCATIONS, LOCATION_GROUPS } from '../constants.js';
import {
  $, clearFormErrors, showFieldErrors, toast, setLoading, safeImage, imageMarkup,
  populateLocationSelect, syncLocationSelect
} from '../ui.js';

let previewUrl = '';
let submitting = false;

function localDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInputValue(value) {
  if (!value) return localDateInput();
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? localDateInput() : localDateInput(date);
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  return date.getTime() <= new Date().getTime();
}

function validate(form) {
  const values = {
    title: form.elements.title.value.trim(),
    type: form.elements.type.value,
    category: form.elements.category.value,
    description: form.elements.description.value.trim(),
    location: form.elements.location.value,
    date: form.elements.date.value,
    imageUrl: form.elements.imageUrl.value.trim()
  };

  const errors = [];
  if (values.title.length < 3) errors.push({ field: 'title', message: 'Use at least 3 characters.' });
  if (!['lost', 'found'].includes(values.type)) errors.push({ field: 'type', message: 'Choose lost or found.' });
  if (!CATEGORIES.includes(values.category)) errors.push({ field: 'category', message: 'Choose a category.' });
  if (values.description.length < 10) errors.push({ field: 'description', message: 'Add at least 10 characters of detail.' });
  if (!LOCATIONS.includes(values.location)) errors.push({ field: 'location', message: 'Choose a campus location.' });
  if (!isValidDateInput(values.date)) errors.push({ field: 'date', message: 'Choose a valid date that is not in the future.' });
  if (values.imageUrl && !safeImage(values.imageUrl)) errors.push({ field: 'imageUrl', message: 'Enter an http(s) image URL.' });

  const file = form.elements.image.files?.[0];
  if (file && !/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type)) {
    toast('Only PNG/JPEG/GIF/WEBP/AVIF images are accepted.', 'error');
    return null;
  }
  if (file && file.size > 5 * 1024 * 1024) {
    toast('Image must be smaller than 5 MB.', 'error');
    return null;
  }

  return errors;
}

function updatePreview(form) {
  const file = form.elements.image.files?.[0];
  const wrap = $('#image-preview-wrap');
  const img = $('#image-preview');

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';

  const typedUrl = form.elements.imageUrl.value.trim();
  const fallback = state.editingItem?.imageUrl || '';
  const source = file ? URL.createObjectURL(file) : assetUrl(safeImage(typedUrl || fallback));

  if (file) previewUrl = source;

  if (source) {
    img.src = source;
    wrap.hidden = false;
  } else {
    img.removeAttribute('src');
    wrap.hidden = true;
  }
}

function resetForm() {
  const form = $('#report-form');
  form.reset();
  syncLocationSelect(form.elements.location, '');
  form.elements.date.value = localDateInput();
  state.editingItem = null;
  clearFormErrors(form);
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  $('#image-preview-wrap').hidden = true;
  $('#image-preview').removeAttribute('src');
}

export function initReport() {
  const form = $('#report-form');

  $('#r-category').innerHTML = '<option value="">SELECT CATEGORY</option>' +
    CATEGORIES.map((value) => `<option value="${value}">${value.toUpperCase()}</option>`).join('');
  populateLocationSelect($('#r-location'), LOCATION_GROUPS, 'SELECT LOCATION');
  form.elements.date.value = localDateInput();
  form.elements.date.max = localDateInput();

  form.elements.image.addEventListener('change', () => updatePreview(form));
  form.elements.imageUrl.addEventListener('input', () => updatePreview(form));

  $('#clear-image').addEventListener('click', () => {
    form.elements.image.value = '';
    form.elements.imageUrl.value = '';
    if (state.editingItem) state.editingItem = { ...state.editingItem, imageUrl: '' };
    updatePreview(form);
  });

  $('#report-cancel').addEventListener('click', () => {
    resetForm();
    emit('navigate', { view: 'home' });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    const errors = validate(form);
    if (errors === null) return;
    if (errors.length) {
      showFieldErrors(form, errors);
      toast('Fix the highlighted fields.', 'error');
      return;
    }

    clearFormErrors(form);
    const payload = new FormData(form);
    const file = payload.get('image');
    if (!file || !file.name) payload.delete('image');
    if (file && file.name) payload.delete('imageUrl');

    submitting = true;
    const submit = $('#report-submit');
    setLoading(submit, true);
    try {
      const editing = state.editingItem;
      const response = editing
        ? await api.items.update(editing._id, payload)
        : await api.items.create(payload);
      toast(response.message, 'success');
      resetForm();
      emit('navigate', { view: 'home' });
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
    } finally {
      submitting = false;
      setLoading(submit, false);
    }
  });
}

export function openReportForm(item = null) {
  const form = $('#report-form');
  state.editingItem = item;
  clearFormErrors(form);

  if (item) {
    form.elements.title.value = item.title || '';
    form.elements.type.value = item.type || '';
    form.elements.category.value = item.category || '';
    form.elements.description.value = item.description || '';
    syncLocationSelect(form.elements.location, item.location || '');
    form.elements.date.value = dateInputValue(item.date);
    form.elements.imageUrl.value = safeImage(item.imageUrl || '');
    form.elements.image.value = '';
    $('#report-title').textContent = 'EDIT LISTING';
    $('#report-subtitle').textContent = 'Update the details below, then save your changes.';
    $('#report-submit').textContent = 'SAVE CHANGES';
    updatePreview(form);
  } else {
    resetForm();
    $('#report-title').textContent = 'POST AN ITEM';
    $('#report-subtitle').textContent = 'Lost something or found something? Give the campus just enough detail to match it.';
    $('#report-submit').textContent = 'POST TO CAMPUS BOARD';
  }

  emit('navigate', { view: 'report' });
}

export function previewMarkup(url, label) {
  const safe = safeImage(url);
  return safe ? imageMarkup(safe, label) : '';
}

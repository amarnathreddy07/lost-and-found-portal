import { api } from '../api.js';
import { state } from '../store.js';
import { emit } from '../events.js';
import { CATEGORIES, LOCATIONS } from '../constants.js';
import {
  $, clearFormErrors, showFieldErrors, toast, setLoading, safeImage, imageMarkup
} from '../ui.js';

let previewUrl = '';

function today() {
  return new Date().toISOString().slice(0, 10);
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
  if (!values.date || Number.isNaN(new Date(values.date).getTime())) errors.push({ field: 'date', message: 'Choose a valid date.' });
  if (values.imageUrl && !safeImage(values.imageUrl)) errors.push({ field: 'imageUrl', message: 'Enter an http(s) image URL.' });

  const file = form.elements.image.files?.[0];
  if (file && !/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type)) {
    toast('Only image files are accepted.', 'error');
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

  const existing = state.editingItem?.imageUrl ? safeImage(state.editingItem.imageUrl) : '';
  const source = file ? URL.createObjectURL(file) : (form.elements.imageUrl.value.trim() && safeImage(form.elements.imageUrl.value));

  if (file) previewUrl = source;

  if (source || existing) {
    img.src = source || existing;
    wrap.hidden = false;
  } else {
    img.removeAttribute('src');
    wrap.hidden = true;
  }
}

function resetForm() {
  const form = $('#report-form');
  form.reset();
  form.elements.date.value = today();
  state.editingItem = null;
  clearFormErrors(form);
  $('#image-preview-wrap').hidden = true;
  $('#image-preview').removeAttribute('src');
}

export function initReport() {
  const form = $('#report-form');

  $('#r-category').innerHTML = '<option value="">SELECT CATEGORY</option>' +
    CATEGORIES.map((value) => `<option value="${value}">${value.toUpperCase()}</option>`).join('');
  $('#r-location').innerHTML = '<option value="">SELECT LOCATION</option>' +
    LOCATIONS.map((value) => `<option value="${value}">${value.toUpperCase()}</option>`).join('');
  form.elements.date.value = today();

  form.elements.image.addEventListener('change', () => updatePreview(form));
  form.elements.imageUrl.addEventListener('input', () => updatePreview(form));

  $('#clear-image').addEventListener('click', () => {
    form.elements.image.value = '';
    form.elements.imageUrl.value = '';
    updatePreview(form);
  });

  $('#report-cancel').addEventListener('click', () => {
    resetForm();
    emit('navigate', { view: 'home' });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
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
      emit('refresh');
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
    } finally {
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
    form.elements.location.value = item.location || '';
    form.elements.date.value = item.date ? new Date(item.date).toISOString().slice(0, 10) : today();
    form.elements.imageUrl.value = item.imageUrl && item.imageUrl.startsWith('http') ? item.imageUrl : '';
    form.elements.image.value = '';
    $('#report-title').textContent = 'EDIT LISTING';
    $('#report-subtitle').textContent = 'Update the details below, then save your changes.';
    $('#report-submit').textContent = 'SAVE CHANGES';
    if (item.imageUrl) {
      $('#image-preview').src = safeImage(item.imageUrl) || '';
      $('#image-preview-wrap').hidden = !safeImage(item.imageUrl);
    }
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

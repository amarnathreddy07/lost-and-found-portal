import { assetUrl } from './api.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function driveFolderId(value) {
  const text = String(value || '').trim();
  const match = text.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|folderview\?id=|open\?[^#\s]*id=)([\w-]{10,})/i);
  return match ? match[1] : '';
}

export function normalizeImageUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const folderId = driveFolderId(text);
  if (folderId) return `https://drive.google.com/drive/folders/${folderId}`;
  if (/^https?:\/\/(?:drive|docs)\.google\.com\/thumbnail\?/i.test(text)) return text;
  const match = text.match(/^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|file\/u\/\d+\/d\/|open\?[^#\s]*id=|uc\?[^#\s]*id=)([\w-]{10,})/i);
  if (!match) return text;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
}

export function safeImage(url) {
  const value = normalizeImageUrl(url);
  if (!value) return '';
  if (/^\/uploads\/[\w.-]+$/.test(value)) return value;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(value)) return value;
  return '';
}

export function imageMarkup(url, placeholder = '?', { expandable = false } = {}) {
  const folderId = driveFolderId(url);
  if (folderId) {
    const expand = expandable
      ? `<button class="media-expand" type="button" data-drive-folder="${escapeHtml(folderId)}" aria-label="View Drive folder" title="View Drive folder">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
          </svg>
        </button>`
      : '';
    const hint = expandable ? '<span class="media-folder-hint">VIEW FOLDER</span>' : '';
    return `<div class="media-placeholder media-folder" role="img" aria-label="Drive folder">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6.5h6l2 2h10v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <path d="M3 9.5h18" />
      </svg>
    </div>${hint}${expand}`;
  }
  const safe = safeImage(url);
  if (!safe) return `<div class="media-placeholder">${escapeHtml(placeholder)}</div>`;
  const src = assetUrl(safe);
  const expand = expandable
    ? `<button class="media-expand" type="button" data-expand-image="${escapeHtml(src)}" aria-label="Expand image" title="Expand image">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
        </svg>
      </button>`
    : '';
  return `<img src="${escapeHtml(src)}" alt="Reported item" loading="lazy" />
    <div class="media-placeholder" hidden>${escapeHtml(placeholder)}</div>
    ${expand}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatCalendarDate(value) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(date);
}

export function truncate(value, length = 110) {
  const text = String(value || '');
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

export function studentMeta(email) {
  const address = String(email || '');
  const match = address.match(/-(\d{2}|\d{4})@/);
  const rawYear = match ? match[1] : '';
  const gradYear = rawYear
    ? (rawYear.length === 4 ? Number(rawYear) : 2000 + Number(rawYear))
    : null;
  const domain = address.split('@')[1] || '';
  const department = (domain.split('.')[0] || '').toUpperCase();
  return { gradYear, department };
}

export function sortStudents(entries) {
  return entries.slice().sort((a, b) => {
    const left = studentMeta(a.email);
    const right = studentMeta(b.email);
    const yearDiff = (right.gradYear || 0) - (left.gradYear || 0);
    if (yearDiff) return yearDiff;
    const deptDiff = left.department.localeCompare(right.department);
    if (deptDiff) return deptDiff;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function typeBadge(type) {
  const normalized = String(type || '').toLowerCase();
  const label = normalized === 'lost' ? 'LOST' : normalized === 'found' ? 'FOUND' : normalized.toUpperCase();
  return `<span class="badge badge-${normalized || 'active'}">${escapeHtml(label)}</span>`;
}

export function statusBadge(status) {
  const value = String(status || 'active').toLowerCase();
  return `<span class="badge badge-${value}">${escapeHtml(value)}</span>`;
}

export function toast(message, type = 'info') {
  const stack = $('#toast-stack');
  if (!stack) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  stack.appendChild(node);
  window.setTimeout(() => {
    node.classList.add('leaving');
    window.setTimeout(() => node.remove(), 220);
  }, 3800);
}

const modalStack = [];
let originalOverflow = '';
let modalCounter = 0;

function focusableElements(dialog) {
  return $$(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    dialog
  ).filter((node) => node.getClientRects().length > 0 || node === dialog);
}

export function openModal({ title = 'DETAILS', body = '', wide = false, dismissible = true, onClose } = {}) {
  const previousFocus = document.activeElement;
  const titleId = `modal-title-${++modalCounter}`;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">
      <div class="modal-head">
        <h2 id="${titleId}">${escapeHtml(title)}</h2>
        <button class="modal-close" type="button" data-modal-close aria-label="Close dialog">&times;</button>
      </div>
      <div class="modal-body">${body}</div>
    </div>`;

  $('#modal-root').appendChild(overlay);

  const dialog = $('.modal', overlay);
  const modalBody = $('.modal-body', overlay);
  const main = $('#main-content');
  const entry = { overlay, dialog, onClose, closed: false, previousFocus, dismissible };
  if (!dismissible) $('.modal-close', overlay).hidden = true;
  modalStack.push(entry);

  if (modalStack.length === 1) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  if (main) {
    main.inert = true;
    main.setAttribute('aria-hidden', 'true');
  }

  const close = (force = false) => {
    if (entry.closed || (!entry.dismissible && !force)) return;
    entry.closed = true;
    const index = modalStack.indexOf(entry);
    if (index >= 0) modalStack.splice(index, 1);
    overlay.remove();

    if (!modalStack.length) {
      document.body.style.overflow = originalOverflow;
      if (main) {
        main.inert = false;
        main.removeAttribute('aria-hidden');
      }
    } else {
      const top = modalStack[modalStack.length - 1];
      if (top && document.contains(top.dialog)) top.dialog.focus();
      else if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    }

    if (typeof entry.onClose === 'function') entry.onClose();
  };
  entry.close = close;

  $('.modal-close', overlay).addEventListener('click', close);
  overlay.addEventListener('mousedown', (event) => {
    if (entry.dismissible && event.target === overlay) close();
  });

  const preferred = $('[data-cancel]', overlay) || $('input, select, textarea', overlay) || $('.modal-close', overlay);
  if (preferred) preferred.focus();

  return {
    overlay,
    dialog,
    body: modalBody,
    close: () => close(true),
    setTitle: (nextTitle) => {
      $('.modal-head h2', dialog).textContent = nextTitle;
    }
  };
}

document.addEventListener('click', (event) => {
  const folderButton = event.target.closest('[data-drive-folder]');
  if (folderButton) {
    event.preventDefault();
    event.stopPropagation();
    const folderId = folderButton.dataset.driveFolder;
    if (!folderId) return;
    const modal = openModal({
      title: 'DRIVE FOLDER',
      wide: true,
      body: `<iframe class="drive-folder-frame" src="https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid" title="Google Drive folder" loading="lazy" allowfullscreen></iframe>`
    });
    modal.overlay.classList.add('image-lightbox-overlay');
    modal.dialog.classList.add('image-lightbox', 'drive-folder-lightbox');
    return;
  }

  const button = event.target.closest('[data-expand-image]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const src = button.dataset.expandImage;
  if (!src) return;
  const modal = openModal({
    title: 'IMAGE PREVIEW',
    wide: true,
    body: `<img class="lightbox-image" src="${escapeHtml(src)}" alt="Expanded reported item" />`
  });
  modal.overlay.classList.add('image-lightbox-overlay');
  modal.dialog.classList.add('image-lightbox');
});

export function closeModal() {
  const top = modalStack[modalStack.length - 1];
  if (top) top.close();
}

document.addEventListener('keydown', (event) => {
  const top = modalStack[modalStack.length - 1];
  if (!top) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    top.close();
    return;
  }

  if (event.key !== 'Tab') return;
  const focusables = focusableElements(top.dialog);
  if (!focusables.length) {
    event.preventDefault();
    top.dialog.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!top.dialog.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
});

export function confirmAction({ title = 'ARE YOU SURE?', message = '', confirmLabel = 'YES, CONTINUE', danger = true } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (answer) => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(answer);
    };

    const modal = openModal({
      title,
      onClose: () => finish(false),
      body: `<p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-accent'}" type="button" data-confirm>${escapeHtml(confirmLabel)}</button>
        </div>`
    });

    $('[data-confirm]', modal.body).addEventListener('click', () => finish(true));
    $('[data-cancel]', modal.body).addEventListener('click', () => finish(false));
  });
}

export function skeletonCards(count = 6) {
  return Array.from({ length: count }, () => `
    <article class="skeleton" aria-hidden="true">
      <div class="skeleton-media"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </article>`).join('');
}

export function clearFormErrors(form) {
  $$('[data-error]', form).forEach((node) => { node.textContent = ''; });
  $$('input, select, textarea', form).forEach((node) => node.removeAttribute('aria-invalid'));
}

function describeFieldError(form, field) {
  const target = $$('[data-error]', form).find((node) => node.dataset.error === field);
  const control = $$('input, select, textarea', form).find((node) => node.name === field);
  if (!target || !control) return;

  if (!target.id) {
    const safeField = String(field).replace(/[^A-Za-z0-9_-]/g, '-');
    target.id = `field-error-${form.id || 'form'}-${safeField}`;
  }
  target.setAttribute('role', 'alert');
  const describedBy = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!describedBy.includes(target.id)) describedBy.push(target.id);
  control.setAttribute('aria-describedby', describedBy.join(' '));
}

export function showFieldErrors(form, errors) {
  clearFormErrors(form);
  const list = Array.isArray(errors) ? errors : Object.entries(errors || {}).map(([field, message]) => ({ field, message }));
  for (const entry of list) {
    const target = $$('[data-error]', form).find((node) => node.dataset.error === entry.field);
    if (target) target.textContent = entry.message;
    const control = $$('input, select, textarea', form).find((node) => node.name === entry.field);
    if (control) control.setAttribute('aria-invalid', 'true');
    describeFieldError(form, entry.field);
  }
  const firstInvalid = $('[aria-invalid="true"]', form);
  if (firstInvalid) firstInvalid.focus();
}

export function setLoading(button, loading, originalText = '') {
  if (!button || (loading && button.dataset.loading === 'true')) return;
  if (loading) {
    button.dataset.loading = 'true';
    button.dataset.original = button.textContent.trim();
    button.disabled = true;
    button.textContent = 'WORKING...';
  } else {
    delete button.dataset.loading;
    button.disabled = false;
    button.textContent = button.dataset.original || originalText || button.textContent;
  }
}

export function populateSelect(select, values, placeholder) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
    values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value.toUpperCase())}</option>`).join('');
  select.value = current;
}

function locationOptionLabel(location) {
  const room = /^AB\d-(\d{3})$/.exec(location);
  if (room) return `ROOM ${room[1]}`;
  const blockPlace = /^AB\d - (.+)$/.exec(location);
  if (blockPlace) return blockPlace[1].toUpperCase();
  if (location === 'AB1 BACKSIDE') return 'BACKSIDE';
  if (location === 'AB1 RECEPTION') return 'RECEPTION';
  if (location.startsWith('STUDENT LOUNGE')) return 'STUDENT LOUNGE (OPP. REGISTRY)';
  return location.toUpperCase();
}

export function populateLocationSelect(select, groups, placeholder) {
  if (!select || select.dataset.locationPickerReady === 'true') return;

  select.title = 'Type a room, lab, or area name to jump to it';
  select.dataset.locationPickerReady = 'true';

  const current = select.value;
  select.replaceChildren(new Option(placeholder, ''));

  groups.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    group.locations.forEach((location) => {
      optgroup.appendChild(new Option(locationOptionLabel(location), location));
    });
    select.appendChild(optgroup);
  });

  select.value = current || '';
}

export function syncLocationSelect(select, value = '') {
  if (!select) return;
  select.value = value || '';
}

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

export function safeImage(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^\/uploads\/[\w.-]+$/.test(value)) return value;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(value)) return value;
  return '';
}

export function imageMarkup(url, placeholder = '?') {
  const safe = safeImage(url);
  if (!safe) return `<div class="media-placeholder">${escapeHtml(placeholder)}</div>`;
  return `<img src="${escapeHtml(safe)}" alt="Reported item" loading="lazy" />
    <div class="media-placeholder" hidden>${escapeHtml(placeholder)}</div>`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function truncate(value, length = 110) {
  const text = String(value || '');
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
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

export function openModal({ title = 'DETAILS', body = '', wide = false } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal-head">
          <h2>${escapeHtml(title)}</h2>
          <button class="modal-close" type="button" data-modal-close aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body">${body}</div>
      </div>
    </div>`;

  const overlay = $('.modal-overlay', root);
  const dialog = $('.modal', root);
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  document.body.style.overflow = 'hidden';
  $('.modal-close', root).addEventListener('click', close);
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close();
  });

  const firstField = $('input, select, textarea, button:not([data-modal-close])', dialog);
  if (firstField) firstField.focus();

  return { overlay, dialog, body: $('.modal-body', root), close };
}

export function closeModal() {
  const overlay = $('.modal-overlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

export function confirmAction({ title = 'ARE YOU SURE?', message = '', confirmLabel = 'YES, CONTINUE', danger = true } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = openModal({
      title,
      body: `<p>${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn ${danger ? 'btn-danger' : 'btn-accent'}" type="button" data-confirm>${escapeHtml(confirmLabel)}</button>
          <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
        </div>`
    });

    const finish = (answer) => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(answer);
    };

    $('[data-confirm]', modal.body).addEventListener('click', () => finish(true));
    $('[data-cancel]', modal.body).addEventListener('click', () => finish(false));
    modal.overlay.addEventListener('mousedown', (event) => {
      if (event.target === modal.overlay) finish(false);
    });
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

export function showFieldErrors(form, errors) {
  clearFormErrors(form);
  const list = Array.isArray(errors) ? errors : Object.entries(errors || {}).map(([field, message]) => ({ field, message }));
  for (const entry of list) {
    const target = $(`[data-error="${entry.field}"]`, form);
    if (target) target.textContent = entry.message;
    const control = $(`[name="${entry.field}"]`, form);
    if (control) control.setAttribute('aria-invalid', 'true');
  }
  const firstInvalid = $('[aria-invalid="true"]', form);
  if (firstInvalid) firstInvalid.focus();
}

export function setLoading(button, loading, originalText = '') {
  if (!button) return;
  if (loading) {
    button.dataset.original = button.textContent.trim();
    button.disabled = true;
    button.textContent = 'WORKING...';
  } else {
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

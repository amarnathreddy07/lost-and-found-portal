import { api, withParams } from '../api.js';
import { state } from '../store.js';
import { emit } from '../events.js';
import { $, imageMarkup, typeBadge, statusBadge, formatDate, truncate, escapeHtml, skeletonCards, toast } from '../ui.js';

export function initHome() {
  $('#item-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-item-id]');
    if (card) emit('openItem', { id: card.dataset.itemId });
  });

  $('#empty-reset').addEventListener('click', () => emit('resetFilters'));

  $('#pagination').addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    emit('refresh');
  });
}

function cardMarkup(item) {
  const owner = item.reportedBy?.name || 'Campus member';
  const status = item.status || 'active';
  return `
    <article class="item-card" data-item-id="${escapeHtml(item._id)}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.title)}">
      <div class="card-media">
        ${imageMarkup(item.imageUrl, (item.category || '?').slice(0, 1).toUpperCase())}
        <div class="card-badges">
          ${typeBadge(item.type)}
          ${status !== 'active' ? statusBadge(status) : ''}
        </div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="badge badge-active">${escapeHtml(item.category)}</span>
          <span class="mono-note">${escapeHtml(item.location)}</span>
        </div>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p class="card-desc">${escapeHtml(truncate(item.description, 105))}</p>
        <div class="card-foot">
          <span class="mono-note">${formatDate(item.date)} &middot; ${escapeHtml(owner)}</span>
          <button class="btn btn-sm" type="button" data-item-id="${escapeHtml(item._id)}">OPEN</button>
        </div>
      </div>
    </article>`;
}

async function loadHeroStats() {
  try {
    const [lost, found, resolved] = await Promise.all([
      api.items.list({ type: 'lost', status: 'active', limit: 1 }),
      api.items.list({ type: 'found', status: 'active', limit: 1 }),
      api.items.list({ status: 'resolved', limit: 1 })
    ]);
    $('#hero-lost').textContent = lost.pagination.total;
    $('#hero-found').textContent = found.pagination.total;
    $('#hero-resolved').textContent = resolved.pagination.total;
  } catch (_error) {
    $('#hero-lost').textContent = '—';
    $('#hero-found').textContent = '—';
    $('#hero-resolved').textContent = '—';
  }
}

function renderPagination(pagination) {
  const container = $('#pagination');
  if (!pagination || pagination.pages <= 1) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  const buttons = [];
  for (let page = 1; page <= pagination.pages; page += 1) {
    buttons.push(`<button class="btn btn-sm ${page === pagination.page ? 'btn-dark' : ''}" type="button" data-page="${page}" ${page === pagination.page ? 'disabled' : ''}>${page}</button>`);
  }
  container.innerHTML = `<span class="mono-note">PAGE ${pagination.page}/${pagination.pages}</span>${buttons.join('')}`;
  container.hidden = false;
}

export async function renderHome() {
  const grid = $('#item-grid');
  grid.innerHTML = skeletonCards(6);
  $('#empty-state').hidden = true;
  $('#result-count').textContent = 'LOADING LISTINGS...';
  $('#pagination').hidden = true;

  try {
    const params = { ...state.filters, page: state.page || 1, limit: 12 };
    const response = await api.items.list(withParams('', params));
    if (!response.items.length) {
      grid.innerHTML = '';
      $('#empty-state').hidden = false;
    } else {
      grid.innerHTML = response.items.map(cardMarkup).join('');
    }
    const { total, page } = response.pagination;
    $('#result-count').textContent = `${total} LISTING${total === 1 ? '' : 'S'} FOUND // PAGE ${page}`;
    renderPagination(response.pagination);
    loadHeroStats();
  } catch (error) {
    grid.innerHTML = '';
    $('#empty-state').hidden = false;
    $('#empty-state').querySelector('strong').textContent = 'COULD NOT LOAD BOARD.';
    $('#result-count').textContent = 'LOAD FAILED';
    toast(error.message, 'error');
  }
}

import { api } from '../api.js';
import { state } from '../store.js';
import { emit } from '../events.js';
import { $, imageMarkup, typeBadge, statusBadge, formatCalendarDate, truncate, escapeHtml, skeletonCards, toast } from '../ui.js';

export function initHome() {
  $('#item-grid').addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-open-item]');
    if (button) emit('openItem', { id: button.dataset.openItem });
  });

  $('#empty-reset').addEventListener('click', () => emit('resetFilters'));

  $('#pagination').addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    emit('refresh');
  });
}

function cardMarkup(item) {
  const owner = item.reportedBy?.name || 'Campus member';
  const status = item.status || 'active';
  const location = item.location || '—';
  return `
    <article class="item-card">
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
          <span class="mono-note" title="${escapeHtml(location)}">${escapeHtml(truncate(location, 32))}</span>
        </div>
        <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        <p class="card-desc">${escapeHtml(truncate(item.description, 105))}</p>
        <div class="card-foot">
          <span class="mono-note">${formatCalendarDate(item.date)} &middot; ${escapeHtml(owner)}</span>
          <button class="btn btn-sm" type="button" data-open-item="${escapeHtml(item._id)}" aria-label="Open ${escapeHtml(item.title)}">OPEN</button>
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

function pageList(current, total) {
  const wanted = [1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total);
  const pages = [...new Set(wanted)].sort((a, b) => a - b);
  const output = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) output.push('<span class="mono-note">…</span>');
    output.push(`<button class="btn btn-sm ${page === current ? 'btn-dark' : ''}" type="button" data-page="${page}" ${page === current ? 'disabled' : ''}>${page}</button>`);
  });
  return output.join('');
}

function renderPagination(pagination) {
  const container = $('#pagination');
  if (!pagination || pagination.pages <= 1) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `<span class="mono-note">PAGE ${pagination.page}/${pagination.pages}</span>${pageList(pagination.page, pagination.pages)}`;
  container.hidden = false;
}

export async function renderHome() {
  const seq = ++state.listSeq;
  const grid = $('#item-grid');
  const empty = $('#empty-state');
  const title = $('strong', empty);
  const description = $('p', empty);

  title.textContent = 'NOTHING HERE YET.';
  description.textContent = 'Try clearing a filter or be the first to report an item.';
  grid.innerHTML = skeletonCards(6);
  empty.hidden = true;
  $('#result-count').textContent = 'LOADING LISTINGS...';
  $('#pagination').hidden = true;

  try {
    const response = await api.items.list({ ...state.filters, page: state.page || 1, limit: 12 });
    if (seq !== state.listSeq) return;

    const pagination = response.pagination || { page: 1, pages: 1, total: 0 };
    const lastPage = Math.max(1, pagination.pages || 1);
    if ((state.page || 1) > lastPage) {
      state.page = lastPage;
      renderHome();
      return;
    }

    const items = Array.isArray(response.items) ? response.items : [];
    if (!items.length) {
      grid.innerHTML = '';
      empty.hidden = false;
    } else {
      grid.innerHTML = items.map(cardMarkup).join('');
    }
    $('#result-count').textContent = `${pagination.total} LISTING${pagination.total === 1 ? '' : 'S'} FOUND // PAGE ${pagination.page}`;
    renderPagination(pagination);
    loadHeroStats();
  } catch (error) {
    if (seq !== state.listSeq) return;
    grid.innerHTML = '';
    empty.hidden = false;
    title.textContent = 'COULD NOT LOAD BOARD.';
    description.textContent = error.message;
    $('#result-count').textContent = 'LOAD FAILED';
    $('#pagination').hidden = true;
    toast(error.message, 'error');
  }
}

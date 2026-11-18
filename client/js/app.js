import { state, getUser, isAdmin, initials } from './store.js';
import { emit, on } from './events.js';
import { $, $$, populateSelect, toast } from './ui.js';
import { CATEGORIES, LOCATIONS } from './constants.js';
import { initHome, renderHome } from './views/home.js';
import { openItem } from './views/item.js';
import { initReport, openReportForm } from './views/report.js';
import { openAuth, logout } from './views/auth.js';
import { initDashboard, renderDashboard } from './views/dashboard.js';
import { initAdmin, renderAdmin } from './views/admin.js';

const VIEWS = ['home', 'report', 'dashboard', 'admin'];

function updateHeader() {
  const user = getUser();
  $('#user-chip').hidden = !user;
  $('#auth-open').hidden = Boolean(user);
  $('#logout-btn').hidden = !user;
  $$('.admin-only').forEach((node) => { node.hidden = !isAdmin(); });

  if (user) {
    $('#user-name').textContent = user.name;
    $('#user-role').textContent = user.role === 'admin' ? 'ADMIN' : 'STUDENT';
    $('#user-initials').textContent = initials();
  }
}

function renderView(view = state.currentView) {
  if (view === 'home') renderHome();
  else if (view === 'dashboard') renderDashboard();
  else if (view === 'admin') renderAdmin();
}

function navigate(view) {
  let target = VIEWS.includes(view) ? view : 'home';
  if (target === 'report' && !getUser()) {
    emit('openAuth', { mode: 'login' });
    target = 'home';
  }
  state.currentView = target;
  $$('.view').forEach((section) => section.classList.toggle('hidden', section.id !== `view-${target}`));
  $$('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === target));
  window.history.replaceState(null, '', `#${target}`);
  window.scrollTo({ top: 0, behavior: 'auto' });
  updateHeader();
  renderView(target);
}

function applyFilters(navigateHome = true) {
  state.page = 1;
  if (navigateHome && state.currentView !== 'home') navigate('home');
  else renderHome();
}

function initFilters() {
  populateSelect($('#filter-category'), CATEGORIES, 'ALL CATEGORIES');
  populateSelect($('#filter-location'), LOCATIONS, 'ALL LOCATIONS');
  $('#filter-sort').value = state.filters.sort;

  let timer;
  $('#filter-q').addEventListener('input', (event) => {
    state.filters.q = event.target.value;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => applyFilters(), 280);
  });

  [['#filter-type', 'type'], ['#filter-category', 'category'], ['#filter-location', 'location'], ['#filter-sort', 'sort']]
    .forEach(([selector, key]) => {
      $(selector).addEventListener('change', (event) => {
        state.filters[key] = event.target.value;
        applyFilters();
      });
    });

  const reset = () => {
    state.filters = { q: '', type: '', category: '', location: '', sort: 'newest' };
    state.page = 1;
    $('#filter-q').value = '';
    $('#filter-type').value = '';
    $('#filter-category').value = '';
    $('#filter-location').value = '';
    $('#filter-sort').value = 'newest';
    applyFilters(false);
    toast('Filters cleared.', 'info');
  };

  $('#filter-reset').addEventListener('click', reset);
  on('resetFilters', reset);
}

function bindGlobalEvents() {
  document.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      event.preventDefault();
      navigate(nav.dataset.nav);
      return;
    }
    const authButton = event.target.closest('#auth-open');
    if (authButton) emit('openAuth', { mode: 'login' });
  });

  $('#logout-btn').addEventListener('click', logout);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const card = event.target.closest('.item-card[data-item-id]');
    if (card) emit('openItem', { id: card.dataset.itemId });
  });

  document.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    image.hidden = true;
    const fallback = image.parentElement?.querySelector('.media-placeholder');
    if (fallback) fallback.hidden = false;
  }, true);

  on('navigate', ({ view }) => navigate(view));
  on('refresh', () => renderView());
  on('openItem', ({ id }) => openItem(id));
  on('editItem', ({ item }) => openReportForm(item));
  on('openAuth', ({ mode }) => openAuth(mode || 'login'));
  on('authChanged', () => {
    updateHeader();
    if (state.currentView === 'admin' && !isAdmin()) navigate('dashboard');
    else renderView();
  });
}

function start() {
  initFilters();
  initHome();
  initReport();
  initDashboard();
  initAdmin();
  bindGlobalEvents();

  const initial = window.location.hash.replace('#', '');
  navigate(VIEWS.includes(initial) ? initial : 'home');
}

start();

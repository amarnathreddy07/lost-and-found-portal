import { api } from './api.js';
import { state, getUser, setUser, clearUser, isAdmin, initials } from './store.js';
import { emit, on } from './events.js';
import { $, $$, populateSelect, populateLocationSelect, syncLocationSelect, toast } from './ui.js';
import { CATEGORIES, LOCATION_GROUPS } from './constants.js';
import { initHome, renderHome } from './views/home.js';
import { openItem } from './views/item.js';
import { initReport, openReportForm } from './views/report.js';
import { openAuth, logout, openPasswordChange } from './views/auth.js';
import { initDashboard, renderDashboard } from './views/dashboard.js';
import { initAdmin, renderAdmin } from './views/admin.js';

const VIEWS = ['home', 'report', 'dashboard', 'admin'];
const VIEW_TITLES = {
  home: 'Campus Board',
  report: 'Report an Item',
  dashboard: 'My Space',
  admin: 'Moderation Desk'
};
let filterTimer;

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

function navigate(view, { replace = false, dashboardTab } = {}) {
  window.clearTimeout(filterTimer);

  let target = VIEWS.includes(view) ? view : 'home';
  if (['report', 'dashboard', 'admin'].includes(target) && !getUser()) {
    state.pendingView = target;
    emit('openAuth', { mode: 'login' });
    target = 'home';
  }

  state.currentView = target;
  if (dashboardTab) {
    state.dashboardTab = dashboardTab;
    $$('[data-dtab]').forEach((tab) => {
      const active = tab.dataset.dtab === dashboardTab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      if (active) $('#dashboard-panel').setAttribute('aria-labelledby', tab.id);
    });
  }
  $$('.view').forEach((section) => section.classList.toggle('hidden', section.id !== `view-${target}`));
  $$('[data-nav]').forEach((button) => {
    const active = button.dataset.nav === target;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('.toolbar').hidden = target !== 'home';
  document.title = `${VIEW_TITLES[target]} — SAI Lost & Found`;
  const nextHash = `#${target}`;
  if (replace) window.history.replaceState(null, '', nextHash);
  else if (window.location.hash !== nextHash) window.history.pushState(null, '', nextHash);
  window.scrollTo({ top: 0, behavior: 'auto' });
  updateHeader();
  renderView(target);

  if (!replace && !state.pendingView) {
    const heading = $(`#view-${target} h1`);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
}

function applyFilters(navigateHome = true) {
  state.page = 1;
  if (navigateHome && state.currentView !== 'home') return;
  renderHome();
}

function initFilters() {
  populateSelect($('#filter-category'), CATEGORIES, 'ALL CATEGORIES');
  populateLocationSelect($('#filter-location'), LOCATION_GROUPS, 'ALL LOCATIONS');
  $('#filter-sort').value = state.filters.sort;

  $('#filter-q').addEventListener('input', (event) => {
    state.filters.q = event.target.value;
    window.clearTimeout(filterTimer);
    filterTimer = window.setTimeout(() => applyFilters(), 280);
  });

  [['#filter-type', 'type'], ['#filter-category', 'category'], ['#filter-location', 'location'], ['#filter-sort', 'sort']]
    .forEach(([selector, key]) => {
      $(selector).addEventListener('change', (event) => {
        state.filters[key] = event.target.value;
        applyFilters();
      });
    });

  const reset = () => {
    window.clearTimeout(filterTimer);
    state.filters = { q: '', type: '', category: '', location: '', sort: 'newest' };
    state.page = 1;
    $('#filter-q').value = '';
    $('#filter-type').value = '';
    $('#filter-category').value = '';
    syncLocationSelect($('#filter-location'), '');
    $('#filter-sort').value = 'newest';
    applyFilters(false);
    toast('Filters cleared.', 'info');
  };

  $('#filter-reset').addEventListener('click', reset);
  on('resetFilters', reset);
}

function bindGlobalEvents() {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      event.preventDefault();
      navigate(nav.dataset.nav, { dashboardTab: nav.dataset.dashboardTab });
      return;
    }
    if (event.target.closest('#auth-open')) emit('openAuth', { mode: 'login' });
  });

  $('#logout-btn').addEventListener('click', logout);

  document.addEventListener('error', (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    image.hidden = true;
    const fallback = image.parentElement?.querySelector('.media-placeholder');
    if (fallback) fallback.hidden = false;
    const expand = image.parentElement?.querySelector('.media-expand');
    if (expand) expand.hidden = true;
  }, true);

  window.addEventListener('auth:expired', () => {
    clearUser();
    state.pendingView = '';
    updateHeader();
    if (state.currentView === 'home') renderHome();
    else navigate('home');
    toast('Session expired. Please sign in again.', 'error');
  });

  window.addEventListener('password:required', () => openPasswordChange());

  window.addEventListener('popstate', () => {
    const view = window.location.hash.replace('#', '');
    if (VIEWS.includes(view)) navigate(view, { replace: true });
  });

  on('navigate', ({ view }) => navigate(view));
  on('refresh', () => renderView());
  on('openItem', ({ id }) => openItem(id));
  on('editItem', ({ item }) => openReportForm(item));
  on('openAuth', ({ mode }) => openAuth(mode || 'login'));
  on('authChanged', () => {
    updateHeader();
    const pending = state.pendingView;
    state.pendingView = '';
    if (pending) navigate(pending);
    else if (state.currentView === 'admin' && !isAdmin()) navigate('dashboard');
    else renderView();
  });
}

async function start() {
  if (getUser()) {
    try {
      const response = await api.auth.me();
      setUser(response.user);
    } catch (_error) {
      clearUser();
    }
  }

  initFilters();
  initHome();
  initReport();
  initDashboard();
  initAdmin();
  bindGlobalEvents();

  const initial = window.location.hash.replace('#', '');
  navigate(VIEWS.includes(initial) ? initial : 'home', { replace: true });
}

start();

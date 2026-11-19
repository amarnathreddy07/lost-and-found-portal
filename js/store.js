const USER_KEY = 'sai_lf_user';

function loadUser() {
  try {
    const value = JSON.parse(localStorage.getItem(USER_KEY));
    if (!value || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
    if (!['user', 'admin'].includes(value.role)) return null;
    return value;
  } catch (_error) {
    return null;
  }
}

let user = loadUser();

export const state = {
  user,
  currentView: 'home',
  dashboardTab: 'items',
  adminTab: 'items',
  editingItem: null,
  page: 1,
  pendingView: '',
  listSeq: 0,
  dashboardSeq: 0,
  adminSeq: 0,
  profileSeq: 0,
  filters: {
    q: '',
    type: '',
    category: '',
    location: '',
    sort: 'newest'
  }
};

export function setUser(value) {
  user = value || null;
  state.user = user;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function clearUser() {
  setUser(null);
}

export function getUser() {
  return user;
}

export function isAuthenticated() {
  return Boolean(user);
}

export function isAdmin() {
  return Boolean(user && user.role === 'admin');
}

export function initials() {
  if (!user) return 'SU';
  return user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

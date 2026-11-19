const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/me', '/auth/change-password'];
const configuredBase = String(document.querySelector('meta[name="api-base"]')?.getAttribute('content') || '').replace(/\/$/, '');
const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
const API_BASE = isLocalHost ? '' : configuredBase;

export function assetUrl(path) {
  const value = String(path || '');
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (API_BASE && value.startsWith('/')) return `${API_BASE}${value}`;
  return value;
}

export function withParams(path, params = {}) {
  if (typeof path === 'string' && path.startsWith('?')) return path;
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function request(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const requestOptions = {
    method,
    headers: { ...headers },
    credentials: 'include'
  };

  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      requestOptions.body = body;
    } else {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, requestOptions);
  } catch (_error) {
    const networkError = new Error('Cannot reach the server. Check your connection and try again.');
    networkError.isNetworkError = true;
    throw networkError;
  }

  let data;
  try {
    data = await response.json();
  } catch (_error) {
    if (response.ok) throw new Error('Unexpected server response. Please try again.');
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && !AUTH_PATHS.some((authPath) => path.startsWith(authPath))) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    if (data.code === 'PASSWORD_CHANGE_REQUIRED' || data.details?.some((detail) => detail.code === 'PASSWORD_CHANGE_REQUIRED')) {
      window.dispatchEvent(new CustomEvent('password:required'));
    }
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.code = data.code;
    error.details = data.details || [];
    throw error;
  }

  return data;
}

export const api = {
  auth: {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    me: () => request('/auth/me'),
    updateProfile: (payload) => request('/auth/profile', { method: 'PATCH', body: payload }),
    createResetRequest: (note) => request('/auth/reset-request', { method: 'POST', body: note ? { note } : {} }),
    myResetRequest: () => request('/auth/reset-request/mine'),
    changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload }),
    logout: () => request('/auth/logout', { method: 'POST' })
  },
  items: {
    list: (params) => request(withParams('/items', params)),
    get: (id) => request(`/items/${encodeURIComponent(id)}`),
    mine: () => request('/items/mine'),
    create: (formData) => request('/items', { method: 'POST', body: formData }),
    update: (id, formData) => request(`/items/${encodeURIComponent(id)}`, { method: 'PUT', body: formData }),
    remove: (id) => request(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    setStatus: (id, status) => request(`/items/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })
  },
  claims: {
    create: (payload) => request('/claims', { method: 'POST', body: payload }),
    mine: () => request('/claims/mine'),
    received: () => request('/claims/received'),
    forItem: (itemId) => request(`/claims/item/${encodeURIComponent(itemId)}`),
    review: (id, decision) => request(`/claims/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: { decision } }),
    all: () => request('/claims')
  },
  admin: {
    stats: () => request('/admin/stats'),
    items: () => request('/admin/items'),
    users: () => request('/admin/users'),
    preloadedUsers: () => request('/admin/users/preloaded'),
    createUser: (payload) => request('/admin/users', { method: 'POST', body: payload }),
    updateUser: (id, payload) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
    importUsers: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/admin/users/import', { method: 'POST', body: formData });
    },
    resetPassword: (id, password, mode = 'custom') => request(`/admin/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'POST',
      body: password ? { password, mode } : { mode: 'format' }
    }),
    setRole: (id, role) => request(`/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } }),
    removeUser: (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    resetRequests: () => request('/admin/reset-requests'),
    resolveResetRequest: (id, status, password, mode = 'custom') => request(`/admin/reset-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: status === 'resolved'
        ? password ? { status, password, mode } : { status, mode: 'format' }
        : { status }
    })
  }
};

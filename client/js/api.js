const TOKEN_KEY = 'sai_lf_token';

let token = localStorage.getItem(TOKEN_KEY);

export function setToken(value) {
  token = value || '';
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return token;
}

export function withParams(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export async function request(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const requestOptions = { method, headers: { ...headers } };

  if (token) requestOptions.headers.Authorization = `Bearer ${token}`;

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
    response = await fetch(`/api${path}`, requestOptions);
  } catch (_error) {
    const networkError = new Error('Cannot reach the server. Check your connection and try again.');
    networkError.isNetworkError = true;
    throw networkError;
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
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
    logout: () => request('/auth/logout', { method: 'POST' })
  },
  items: {
    list: (params) => request(withParams('/items', params)),
    get: (id) => request(`/items/${id}`),
    mine: () => request('/items/mine'),
    create: (formData) => request('/items', { method: 'POST', body: formData }),
    update: (id, formData) => request(`/items/${id}`, { method: 'PUT', body: formData }),
    remove: (id) => request(`/items/${id}`, { method: 'DELETE' }),
    setStatus: (id, status) => request(`/items/${id}/status`, { method: 'PATCH', body: { status } })
  },
  claims: {
    create: (payload) => request('/claims', { method: 'POST', body: payload }),
    mine: () => request('/claims/mine'),
    received: () => request('/claims/received'),
    forItem: (itemId) => request(`/claims/item/${itemId}`),
    review: (id, decision) => request(`/claims/${id}/review`, { method: 'PATCH', body: { decision } }),
    all: () => request('/claims')
  },
  admin: {
    stats: () => request('/admin/stats'),
    items: () => request('/admin/items'),
    users: () => request('/admin/users'),
    setRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
    removeUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' })
  }
};

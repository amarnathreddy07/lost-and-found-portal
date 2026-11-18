import { api, setToken } from '../api.js';
import { setUser } from '../store.js';
import { emit } from '../events.js';
import { $, escapeHtml, openModal, clearFormErrors, showFieldErrors, setLoading, toast } from '../ui.js';

function formMarkup(mode) {
  const isLogin = mode === 'login';
  return `
    <form id="auth-form" novalidate>
      ${isLogin ? '' : `
        <div class="field" style="margin-bottom:14px">
          <label for="auth-name">FULL NAME <span class="required">*</span></label>
          <input id="auth-name" name="name" type="text" autocomplete="name" required />
          <small class="error-text" data-error="name"></small>
        </div>`}
      <div class="field" style="margin-bottom:14px">
        <label for="auth-email">UNIVERSITY EMAIL <span class="required">*</span></label>
        <input id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@saiuniversity.edu" required />
        <small class="error-text" data-error="email"></small>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="auth-password">PASSWORD <span class="required">*</span></label>
        <input id="auth-password" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="${isLogin ? 'Your password' : 'At least 8 characters'}" required />
        <small class="error-text" data-error="password"></small>
      </div>
      ${isLogin ? '' : `
        <div class="field" style="margin-bottom:14px">
          <label for="auth-student">STUDENT ID <span class="optional">(OPTIONAL)</span></label>
          <input id="auth-student" name="studentId" type="text" placeholder="SAI-22CS-001" />
          <small class="error-text" data-error="studentId"></small>
        </div>
        <div class="field" style="margin-bottom:14px">
          <label for="auth-phone">PHONE <span class="optional">(OPTIONAL)</span></label>
          <input id="auth-phone" name="phone" type="tel" placeholder="+91 90000 00000" />
          <small class="error-text" data-error="phone"></small>
        </div>`}
      <button class="btn btn-accent" type="submit">${isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}</button>
      <button class="btn btn-outline" type="button" data-auth-toggle="${isLogin ? 'register' : 'login'}">
        ${isLogin ? 'NEW HERE? REGISTER' : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
      </button>
      ${isLogin ? '<p class="hint" style="margin-top:12px">DEMO: admin@saiuniversity.edu / Admin@12345</p>' : ''}
    </form>`;
}

function renderAuth(mode) {
  const modal = openModal({
    title: mode === 'login' ? 'SIGN IN TO CAMPUS' : 'JOIN THE CAMPUS BOARD',
    body: formMarkup(mode)
  });
  const form = $('#auth-form', modal.body);

  $('[data-auth-toggle]', modal.body).addEventListener('click', () => {
    modal.close();
    renderAuth(mode === 'login' ? 'register' : 'login');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);

    const values = Object.fromEntries(new FormData(form).entries());
    const errors = [];
    if (mode === 'register' && (values.name || '').trim().length < 2) {
      errors.push({ field: 'name', message: 'Enter your full name.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) {
      errors.push({ field: 'email', message: 'Enter a valid email address.' });
    }
    if ((values.password || '').length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    }
    if (errors.length) {
      showFieldErrors(form, errors);
      return;
    }

    const submit = $('button[type="submit"]', form);
    setLoading(submit, true);
    try {
      const response = mode === 'login'
        ? await api.auth.login(values)
        : await api.auth.register(values);
      setToken(response.token);
      setUser(response.user);
      modal.close();
      toast(response.message, 'success');
      emit('authChanged');
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
    } finally {
      setLoading(submit, false);
    }
  });
}

export function openAuth(mode = 'login') {
  renderAuth(mode);
}

export async function logout() {
  try {
    await api.auth.logout();
  } catch (_error) {
    toast('Signed out locally.', 'info');
  }
  setToken('');
  setUser(null);
  emit('authChanged');
  emit('navigate', { view: 'home' });
  emit('refresh');
}

export function authNotice(text) {
  return `<div class="inline-notice">${escapeHtml(text)}</div>`;
}

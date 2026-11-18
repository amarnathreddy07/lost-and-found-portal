import { api } from '../api.js';
import { getUser, setUser, state } from '../store.js';
import { emit } from '../events.js';
import { $, openModal, clearFormErrors, showFieldErrors, setLoading, toast } from '../ui.js';

let passwordModalOpen = false;

function formMarkup(mode) {
  const isLogin = mode === 'login';
  return `
    <form id="auth-form" novalidate>
      <div class="auth-brand">
        <img src="/assets/saiu-logo-bw.png" alt="" aria-hidden="true" />
        <span>SAI UNIVERSITY</span>
      </div>
      ${isLogin ? '' : `
        <div class="field" style="margin-bottom:14px">
          <label for="auth-name">FULL NAME <span class="required">*</span></label>
          <input id="auth-name" name="name" type="text" autocomplete="name" required />
          <small class="error-text" data-error="name"></small>
        </div>`}
      <div class="field" style="margin-bottom:14px">
        <label for="auth-email">UNIVERSITY EMAIL <span class="required">*</span></label>
        <input id="auth-email" name="email" type="email" autocomplete="email" placeholder="amarnathreddy.s-29@scds.saiuniversity.edu.in" required />
        <small class="error-text" data-error="email"></small>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="auth-password">PASSWORD <span class="required">*</span></label>
        <input id="auth-password" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="At least 8 characters, letter + number" required />
        <small class="error-text" data-error="password"></small>
      </div>
      ${isLogin ? '' : `
        <div class="field" style="margin-bottom:14px">
          <label for="auth-student">PRN NUMBER <span class="optional">(OPTIONAL)</span></label>
          <input id="auth-student" name="studentId" type="text" placeholder="PRN-001" />
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
    </form>`;
}

function renderAuth(mode) {
  let finished = false;
  const modal = openModal({
    title: mode === 'login' ? 'SIGN IN TO CAMPUS' : 'JOIN THE CAMPUS BOARD',
    onClose: () => { if (!finished) state.pendingView = ''; },
    body: formMarkup(mode)
  });
  const form = $('#auth-form', modal.body);

  $('[data-auth-toggle]', modal.body).addEventListener('click', () => {
    finished = true;
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
    if (!/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]-\d{2}@[A-Za-z]+(?:-[A-Za-z]+)*\.saiuniversity\.edu\.in$/i.test(values.email || '')) {
      errors.push({ field: 'email', message: 'Use name.initial-YY@department.saiuniversity.edu.in.' });
    }
    if ((values.password || '').length < 8 || !/[A-Za-z]/.test(values.password || '') || !/\d/.test(values.password || '')) {
      errors.push({ field: 'password', message: 'Use 8+ characters with a letter and a number.' });
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
      finished = true;
      setUser(response.user);
      modal.close();
      toast(response.message, 'success');
      emit('authChanged');
      if (response.user?.mustChangePassword) openPasswordChange();
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
    } finally {
      setLoading(submit, false);
    }
  });
}

export function openPasswordChange() {
  if (passwordModalOpen || !getUser()) return;
  passwordModalOpen = true;

  const modal = openModal({
    title: 'PASSWORD CHANGE REQUIRED',
    dismissible: false,
    body: `<p class="hint">Set a new password before using the portal. Choose something at least 8 characters with a letter and a number.</p>
      <form id="password-change-form" novalidate style="margin-top:14px">
        <div class="field" style="margin-bottom:14px">
          <label for="change-current">CURRENT TEMPORARY PASSWORD <span class="required">*</span></label>
          <input id="change-current" name="currentPassword" type="password" autocomplete="current-password" required />
          <small class="error-text" data-error="currentPassword"></small>
        </div>
        <div class="field" style="margin-bottom:14px">
          <label for="change-new">NEW PASSWORD <span class="required">*</span></label>
          <input id="change-new" name="newPassword" type="password" autocomplete="new-password" required />
          <small class="error-text" data-error="newPassword"></small>
        </div>
        <div class="field" style="margin-bottom:14px">
          <label for="change-confirm">CONFIRM NEW PASSWORD <span class="required">*</span></label>
          <input id="change-confirm" name="confirmPassword" type="password" autocomplete="new-password" required />
          <small class="error-text" data-error="confirmPassword"></small>
        </div>
        <button class="btn btn-accent" type="submit">SAVE NEW PASSWORD</button>
      </form>`
  });

  const form = $('#password-change-form', modal.body);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = [];
    if (!values.currentPassword) errors.push({ field: 'currentPassword', message: 'Enter your temporary password.' });
    if ((values.newPassword || '').length < 8 || !/[A-Za-z]/.test(values.newPassword || '') || !/\d/.test(values.newPassword || '')) {
      errors.push({ field: 'newPassword', message: 'Use 8+ characters with a letter and a number.' });
    }
    if (values.newPassword !== values.confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    }
    if (errors.length) {
      showFieldErrors(form, errors);
      return;
    }

    const submit = $('button[type="submit"]', form);
    setLoading(submit, true);
    try {
      const response = await api.auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      setUser(response.user);
      modal.close();
      passwordModalOpen = false;
      toast(response.message, 'success');
      emit('authChanged');
    } catch (error) {
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
    toast('Signed out successfully.', 'success');
  } catch (_error) {
    toast('Signed out locally.', 'info');
  }
  state.pendingView = '';
  setUser(null);
  emit('navigate', { view: 'home' });
}

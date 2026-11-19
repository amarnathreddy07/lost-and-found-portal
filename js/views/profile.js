import { api } from '../api.js';
import { getUser, setUser, state, initials } from '../store.js';
import { emit } from '../events.js';
import { $, escapeHtml, openModal, clearFormErrors, showFieldErrors, toast, setLoading } from '../ui.js';

function infoRow(label, value) {
  return `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value || '—')}</strong></div>`;
}

function openEditProfile(user) {
  const modal = openModal({
    title: 'EDIT PROFILE',
    body: `<form id="edit-profile-form">
      <div class="field">
        <label for="edit-name">FULL NAME <span class="required">*</span></label>
        <input id="edit-name" name="name" value="${escapeHtml(user.name)}" required />
        <small class="error-text" data-error="name"></small>
      </div>
      <div class="field">
        <label for="edit-phone">PHONE NUMBER</label>
        <input id="edit-phone" name="phone" value="${escapeHtml(user.phone || '')}" />
        <small class="error-text" data-error="phone"></small>
      </div>
      <div class="field">
        <label for="edit-student-id">PRN / STUDENT ID <span class="required">*</span></label>
        <input id="edit-student-id" name="studentId" value="${escapeHtml(user.studentId || '')}" required />
        <small class="error-text" data-error="studentId"></small>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
        <button class="btn btn-accent" type="submit">SAVE CHANGES</button>
      </div>
    </form>`
  });

  $('[data-cancel]', modal.body).addEventListener('click', () => modal.close());

  const form = $('#edit-profile-form', modal.body);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const values = Object.fromEntries(new FormData(form).entries());
    const submit = $('button[type="submit"]', form);
    setLoading(submit, true);
    try {
      const response = await api.auth.updateProfile(values);
      setUser(response.user);
      emit('profileUpdated');
      toast(response.message, 'success');
      modal.close();
      renderProfile();
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
      setLoading(submit, false);
    }
  });
}

function openResetRequestModal() {
  const modal = openModal({
    title: 'REQUEST PASSWORD RESET',
    body: `<p class="hint">Passwords are stored as secure hashes, so they cannot be read back. Confirm below to raise a ticket with the campus admin. The admin will generate a temporary password and share it with you securely.</p>
      <div class="field" style="margin-top:14px">
        <label for="reset-request-note">MESSAGE TO THE ADMIN (OPTIONAL)</label>
        <textarea id="reset-request-note" name="note" rows="3" maxlength="500" placeholder="e.g. I forgot my password"></textarea>
        <small class="error-text" data-error="note"></small>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
        <button class="btn btn-accent" type="button" data-confirm>CONFIRM &amp; RAISE TICKET</button>
      </div>`
  });

  $('[data-cancel]', modal.body).addEventListener('click', () => modal.close());
  const confirm = $('[data-confirm]', modal.body);
  confirm.addEventListener('click', async () => {
    const note = $('#reset-request-note', modal.body).value;
    setLoading(confirm, true);
    try {
      const response = await api.auth.createResetRequest(note);
      toast(response.message, 'success');
      modal.close();
      renderProfile();
    } catch (error) {
      toast(error.message, 'error');
      setLoading(confirm, false);
    }
  });
}

function profileMarkup(user, resetRequest, resetTicketsAvailable) {
  const isAdmin = user.role === 'admin';
  const requestStatus = resetRequest?.status;

  return `
    <div class="profile-header">
      <span class="avatar profile-avatar">${escapeHtml(initials())}</span>
      <div>
        <h2>${escapeHtml(user.name)}</h2>
        <span class="tag ${isAdmin ? 'tag-lost' : 'tag-pending'}">${isAdmin ? 'CAMPUS ADMIN' : 'STUDENT'}</span>
      </div>
    </div>

    <h3>GENERAL INFORMATION</h3>
    <div class="detail-grid">
      ${infoRow('FULL NAME', user.name)}
      ${infoRow('EMAIL', user.email)}
      ${infoRow('PRN / STUDENT ID', user.studentId)}
      ${infoRow('DEPARTMENT', user.department)}
      ${infoRow('PHONE', user.phone)}
      ${infoRow('ACCOUNT TYPE', isAdmin ? 'CAMPUS ADMIN' : 'STUDENT')}
    </div>

    ${requestStatus ? `<p class="hint">PASSWORD RESET TICKET: <span class="tag tag-pending">${escapeHtml(requestStatus.toUpperCase())}</span></p>` : ''}
    ${resetTicketsAvailable ? '' : '<p class="hint">PASSWORD TICKETS ARE NOT AVAILABLE ON THIS SERVER YET.</p>'}

    <div class="modal-actions">
      <button class="btn btn-accent" type="button" data-edit-profile>EDIT PROFILE</button>
      <button class="btn btn-outline" type="button" data-reset-request ${requestStatus === 'pending' || !resetTicketsAvailable ? 'disabled' : ''}>CHANGE PASSWORD</button>
    </div>`;
}

export async function renderProfile() {
  const seq = ++state.profileSeq;
  const panel = $('#profile-panel');
  if (!panel) return;

  if (!getUser()) {
    panel.innerHTML = '<div class="inline-notice">SIGN IN TO VIEW YOUR PROFILE.</div>';
    return;
  }

  panel.innerHTML = '<p class="mono-note">LOADING YOUR PROFILE...</p>';
  let resetTicketsAvailable = true;
  try {
    const [me, resetResponse] = await Promise.all([
      api.auth.me(),
      api.auth.myResetRequest().catch((error) => {
        if (error.status === 404) {
          resetTicketsAvailable = false;
          return { request: null };
        }
        throw error;
      })
    ]);
    if (seq !== state.profileSeq) return;

    const user = me.user;
    setUser(user);
    emit('profileUpdated');

    panel.innerHTML = profileMarkup(user, resetResponse.request, resetTicketsAvailable);
    $('[data-edit-profile]', panel)?.addEventListener('click', () => openEditProfile(user));
    $('[data-reset-request]', panel)?.addEventListener('click', openResetRequestModal);
  } catch (error) {
    if (seq !== state.profileSeq) return;
    panel.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
  }
}

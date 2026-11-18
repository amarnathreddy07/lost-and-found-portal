import { api } from '../api.js';
import { isAdmin, state, getUser } from '../store.js';
import { emit } from '../events.js';
import {
  $, $$, escapeHtml, statusBadge, typeBadge, formatCalendarDate, formatDate, truncate,
  confirmAction, openModal, clearFormErrors, showFieldErrors, toast, setLoading,
  studentMeta, sortStudents
} from '../ui.js';

let adminGradYear = '';
let adminDepartment = '';

function statsMarkup(stats) {
  const cards = [
    ['TOTAL ITEMS', stats.totalItems],
    ['ACTIVE LOST', stats.activeLost],
    ['ACTIVE FOUND', stats.activeFound],
    ['RESOLVED RATE', `${stats.resolvedRate}%`],
    ['PENDING CLAIMS', stats.pendingClaims],
    ['REGISTERED USERS', stats.totalUsers],
    ['CLAIMED ITEMS', stats.claimedItems],
    ['RESOLVED ITEMS', stats.resolvedItems]
  ];
  return cards.map(([label, value]) => `
    <div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
}

function itemsTable(items) {
  if (!items.length) return '<div class="inline-notice">NO LISTINGS FOUND.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>ITEM</th><th>TYPE</th><th>STATUS</th><th>OWNER</th><th>LOCATION</th><th>DATE</th><th>ACTIONS</th></tr></thead>
      <tbody>${items.map((item) => {
        const id = escapeHtml(item._id);
        return `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong><br /><span class="mono-note">${escapeHtml(truncate(item.description, 60))}</span></td>
          <td>${typeBadge(item.type)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>${escapeHtml(item.reportedBy?.name || '—')}<br /><span class="mono-note">${escapeHtml(item.reportedBy?.email || '')}</span></td>
          <td>${escapeHtml(item.location)}</td>
          <td>${formatCalendarDate(item.date)}</td>
          <td><div class="row-actions">
            <button class="btn btn-xs" type="button" data-aaction="edit" data-id="${id}">EDIT</button>
            <button class="btn btn-xs" type="button" data-aaction="status" data-id="${id}" data-status="resolved">RESOLVE</button>
            <button class="btn btn-xs btn-danger" type="button" data-aaction="delete-item" data-id="${id}">DELETE</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function claimsTable(claims) {
  if (!claims.length) return '<div class="inline-notice">NO CLAIMS FOUND.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>ITEM</th><th>CLAIMANT</th><th>PROOF</th><th>STATUS</th><th>DATE</th><th>ACTIONS</th></tr></thead>
      <tbody>${claims.map((claim) => {
        const id = escapeHtml(claim._id);
        return `
        <tr>
          <td><strong>${escapeHtml(claim.item?.title || 'Removed listing')}</strong><br />${typeBadge(claim.item?.type || 'lost')}</td>
          <td>${escapeHtml(claim.claimant?.name || '—')}<br /><span class="mono-note">${escapeHtml(claim.claimant?.email || '')}</span></td>
          <td>${escapeHtml(truncate(claim.proof, 90))}</td>
          <td>${statusBadge(claim.status)}</td>
          <td>${formatDate(claim.createdAt)}</td>
          <td>${claim.status === 'pending' ? `
            <div class="row-actions">
              <button class="btn btn-xs btn-accent" type="button" data-aaction="review" data-id="${id}" data-decision="approved">APPROVE</button>
              <button class="btn btn-xs btn-danger" type="button" data-aaction="review" data-id="${id}" data-decision="rejected">REJECT</button>
            </div>` : `<span class="mono-note">BY ${escapeHtml(claim.reviewedBy?.name || 'SYSTEM')}</span>`}
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function usersTable(users) {
  if (!users.length) return '<div class="inline-notice">NO USERS FOUND.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>NAME</th><th>EMAIL</th><th>GRAD YEAR</th><th>PRN</th><th>ROLE</th><th>PASSWORD</th><th>JOINED</th><th>ACTIONS</th></tr></thead>
      <tbody>${users.map((user) => {
        const id = escapeHtml(user._id);
        const isSelf = user._id === getUser()?.id;
        const meta = studentMeta(user.email);
        return `
        <tr>
          <td><strong>${escapeHtml(user.name)}</strong></td>
          <td>${escapeHtml(user.email)}</td>
          <td>${meta.gradYear || '—'}</td>
          <td>${escapeHtml(user.studentId || '—')}${meta.department ? `<br /><span class="mono-note">${escapeHtml(meta.department)}</span>` : ''}</td>
          <td>
            <select data-role-for="${id}" aria-label="Role for ${escapeHtml(user.name)}" ${isSelf ? 'disabled' : ''}>
              <option value="user" ${user.role === 'user' ? 'selected' : ''}>USER</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ADMIN</option>
            </select>
            ${user.role === 'admin' ? '<span class="badge badge-admin">ADMIN</span>' : ''}
          </td>
          <td>${user.mustChangePassword ? '<span class="badge badge-pending">CHANGE REQUIRED</span>' : '<span class="badge badge-active">READY</span>'}</td>
          <td>${formatDate(user.createdAt)}</td>
          <td><div class="row-actions">
            <button class="btn btn-xs" type="button" data-aaction="reset-password" data-id="${id}" data-name="${escapeHtml(user.name)}">RESET PASSWORD</button>
            <button class="btn btn-xs btn-danger" type="button" data-aaction="delete-user" data-id="${id}" ${isSelf ? 'disabled' : ''}>DELETE USER</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function syncUserFilters(users) {
  const yearSelect = $('#admin-grad-year');
  const departmentSelect = $('#admin-department');
  if (!yearSelect || !departmentSelect) return sortStudents(users);

  const sorted = sortStudents(users);
  const years = [...new Set(sorted.map((user) => studentMeta(user.email).gradYear).filter(Boolean))];
  if (adminGradYear && !years.includes(Number(adminGradYear))) {
    adminGradYear = '';
    adminDepartment = '';
  }

  yearSelect.innerHTML = `<option value="">ALL GRAD YEARS</option>${years
    .map((year) => `<option value="${year}">${year}</option>`).join('')}`;
  yearSelect.value = adminGradYear;

  const departments = adminGradYear
    ? [...new Set(sorted
      .filter((user) => studentMeta(user.email).gradYear === Number(adminGradYear))
      .map((user) => studentMeta(user.email).department)
      .filter(Boolean))]
    : [];

  if (adminDepartment && !departments.includes(adminDepartment)) adminDepartment = '';
  departmentSelect.innerHTML = `<option value="">ALL DEPARTMENTS</option>${departments
    .map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`).join('')}`;
  departmentSelect.value = adminDepartment;
  departmentSelect.disabled = !adminGradYear;

  return sorted.filter((user) => {
    const meta = studentMeta(user.email);
    return (!adminGradYear || meta.gradYear === Number(adminGradYear))
      && (!adminDepartment || meta.department === adminDepartment);
  });
}

function activateAdminTab(tabName) {
  state.adminTab = tabName;
  $$('[data-atab]').forEach((node) => {
    const active = node.dataset.atab === tabName;
    node.classList.toggle('active', active);
    node.setAttribute('aria-selected', String(active));
  });
  const tab = $(`[data-atab="${tabName}"]`);
  if (tab) $('#admin-panel').setAttribute('aria-labelledby', tab.id);
  return renderAdmin();
}

async function openCreateUser() {
  const modal = openModal({ title: 'CREATE USER', body: '<p class="mono-note">LOADING PRELOADED PROFILES...</p>' });
  let available = [];
  let initialPassword = '';
  let preloadedError = '';

  try {
    const response = await api.admin.preloadedUsers();
    available = sortStudents((response.users || []).filter((entry) => !entry.created));
    initialPassword = response.initialPassword || '';
  } catch (error) {
    preloadedError = error.message;
  }

  const years = [...new Set(available.map((entry) => studentMeta(entry.email).gradYear).filter(Boolean))];
  modal.body.innerHTML = `<p class="hint">${initialPassword
    ? `The initial password is <strong>${escapeHtml(initialPassword)}</strong> and the user must change it at first sign-in.`
    : 'The user must change their temporary password at first sign-in.'}</p>
    ${preloadedError ? `<div class="inline-notice">QUICK FILL UNAVAILABLE — ${escapeHtml(preloadedError)}</div>` : ''}
    ${!available.length && !preloadedError ? '<div class="inline-notice">NO UNUSED PRELOADED PROFILES. ENTER DETAILS MANUALLY.</div>' : ''}
    <form id="create-user-form" style="margin-top:14px">
      <div class="mono-note" style="margin-bottom:12px">OPTIONAL QUICK FILL</div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-year">GRAD YEAR</label>
        <select id="create-year" ${available.length ? '' : 'disabled'}>
          <option value="">ALL GRAD YEARS</option>
          ${years.map((year) => `<option value="${year}">${year}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-department-filter">DEPARTMENT FILTER</label>
        <select id="create-department-filter" disabled>
          <option value="">ALL DEPARTMENTS</option>
        </select>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-profile">PRELOADED PROFILE</label>
        <select id="create-profile" ${available.length ? '' : 'disabled'}>
          <option value="">ENTER DETAILS MANUALLY</option>
          ${available.map((entry) => `<option value="${escapeHtml(entry.email)}">${escapeHtml(entry.name)} — ${escapeHtml(entry.email)}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-name">FULL NAME <span class="required">*</span></label>
        <input id="create-name" name="name" type="text" autocomplete="name" required />
        <small class="error-text" data-error="name"></small>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-email">UNIVERSITY EMAIL <span class="required">*</span></label>
        <input id="create-email" name="email" type="email" autocomplete="email" placeholder="name.initial-YY@department.saiuniversity.edu.in" required />
        <small class="error-text" data-error="email"></small>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-student-id">PRN / STUDENT ID</label>
        <input id="create-student-id" name="studentId" type="text" />
        <small class="error-text" data-error="studentId"></small>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-department">DEPARTMENT</label>
        <input id="create-department" name="department" type="text" />
        <small class="error-text" data-error="department"></small>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="create-phone">PHONE</label>
        <input id="create-phone" name="phone" type="tel" />
        <small class="error-text" data-error="phone"></small>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
        <button class="btn btn-accent" type="submit">CREATE ACCOUNT</button>
      </div>
    </form>`;

  const form = $('#create-user-form', modal.body);
  const yearSelect = $('#create-year', form);
  const departmentFilter = $('#create-department-filter', form);
  const profileSelect = $('#create-profile', form);
  const submit = $('button[type="submit"]', form);
  const fields = {
    name: $('#create-name', form),
    email: $('#create-email', form),
    studentId: $('#create-student-id', form),
    department: $('#create-department', form),
    phone: $('#create-phone', form)
  };

  const visibleEntries = () => available.filter((entry) => {
    const meta = studentMeta(entry.email);
    return (!yearSelect.value || meta.gradYear === Number(yearSelect.value))
      && (!departmentFilter.value || meta.department === departmentFilter.value);
  });

  const refreshProfiles = () => {
    const visible = visibleEntries();
    const selected = profileSelect.value;
    profileSelect.innerHTML = `<option value="">ENTER DETAILS MANUALLY</option>${visible
      .map((entry) => `<option value="${escapeHtml(entry.email)}">${escapeHtml(entry.name)} — ${escapeHtml(entry.email)}</option>`).join('')}`;
    profileSelect.value = visible.some((entry) => entry.email === selected) ? selected : '';
  };

  const refreshDepartments = () => {
    const departments = yearSelect.value
      ? [...new Set(available
        .filter((entry) => studentMeta(entry.email).gradYear === Number(yearSelect.value))
        .map((entry) => studentMeta(entry.email).department)
        .filter(Boolean))].sort()
      : [];
    departmentFilter.innerHTML = `<option value="">ALL DEPARTMENTS</option>${departments
      .map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`).join('')}`;
    departmentFilter.value = '';
    departmentFilter.disabled = !yearSelect.value;
    refreshProfiles();
  };

  profileSelect.addEventListener('change', () => {
    const entry = available.find((item) => item.email === profileSelect.value);
    if (!entry) return;
    fields.name.value = entry.name || '';
    fields.email.value = entry.email || '';
    fields.studentId.value = entry.studentId || '';
    fields.department.value = entry.department || studentMeta(entry.email).department || '';
    fields.phone.value = entry.phone || '';
  });
  fields.email.addEventListener('blur', () => {
    if (!fields.department.value.trim()) fields.department.value = studentMeta(fields.email.value).department || '';
  });
  yearSelect.addEventListener('change', refreshDepartments);
  departmentFilter.addEventListener('change', refreshProfiles);
  refreshProfiles();

  $('[data-cancel]', modal.body).addEventListener('click', () => modal.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.name = String(payload.name || '').trim();
    payload.email = String(payload.email || '').trim().toLowerCase();
    payload.studentId = String(payload.studentId || '').trim();
    payload.department = String(payload.department || '').trim();
    payload.phone = String(payload.phone || '').trim();
    const errors = [];
    if (payload.name.length < 2) errors.push({ field: 'name', message: 'Enter the full name.' });
    if (!/^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]-\d{2}@[A-Za-z]+(?:-[A-Za-z]+)*\.saiuniversity\.edu\.in$/i.test(payload.email)) {
      errors.push({ field: 'email', message: 'Use name.initial-YY@department.saiuniversity.edu.in.' });
    }
    if (errors.length) {
      showFieldErrors(form, errors);
      return;
    }

    setLoading(submit, true);
    try {
      const result = await api.admin.createUser(payload);
      modal.close();
      toast(result.message, 'success');
      await activateAdminTab('users');
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
      setLoading(submit, false);
    }
  });
}

function resultList(title, entries) {
  if (!entries?.length) return '';
  return `<div style="margin-top:14px">
    <strong>${escapeHtml(title)}</strong>
    <ul class="import-list">${entries.map((entry) => `<li>ROW ${escapeHtml(entry.row)} — ${escapeHtml(entry.email || '')}${entry.message ? ` — ${escapeHtml(entry.message)}` : ''}</li>`).join('')}</ul>
  </div>`;
}

function openImportUsers() {
  const modal = openModal({
    title: 'IMPORT USERS FROM CSV',
    body: `<p class="hint">CSV columns: <code>email</code> (required), <code>name</code>, <code>prn</code>, <code>password</code>. Department is derived from the email domain. If password is blank, the fixed default is used.</p>
      <form id="import-users-form" style="margin-top:14px">
        <div class="field" style="margin-bottom:14px">
          <label for="import-csv">CSV FILE <span class="required">*</span></label>
          <input id="import-csv" name="file" type="file" accept=".csv,text/csv" required />
          <small class="error-text" data-error="file"></small>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
          <button class="btn btn-accent" type="submit">IMPORT USERS</button>
        </div>
      </form>`
  });

  const form = $('#import-users-form', modal.body);
  $('[data-cancel]', modal.body).addEventListener('click', () => modal.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const file = $('#import-csv', form).files?.[0];
    if (!file) {
      showFieldErrors(form, [{ field: 'file', message: 'Choose a CSV file.' }]);
      return;
    }

    const submit = $('button[type="submit"]', form);
    setLoading(submit, true);
    try {
      const response = await api.admin.importUsers(file);
      modal.body.innerHTML = `<div class="password-result">
        <p><strong>${escapeHtml(response.message)}</strong></p>
        <p class="hint">Created users must change their password at first sign-in.</p>
        ${resultList('CREATED', response.created)}
        ${resultList('SKIPPED', response.skipped)}
        ${resultList('ERRORS', response.errors)}
      </div>
      <div class="modal-actions"><button class="btn btn-accent" type="button" data-done>DONE</button></div>`;
      $('[data-done]', modal.body).addEventListener('click', () => { modal.close(); renderAdmin(); });
      toast(response.message, 'success');
    } catch (error) {
      toast(error.message, 'error');
      setLoading(submit, false);
    }
  });
}

function openResetPassword(user) {
  const modal = openModal({
    title: `RESET PASSWORD — ${user.name}`,
    body: `<p class="hint">Resetting signs out existing sessions and requires ${escapeHtml(user.name)} to choose a new password at next sign-in.</p>
      <form id="reset-password-form" style="margin-top:14px">
        <label class="radio-row"><input type="radio" name="resetMode" value="generate" checked /> GENERATE A TEMPORARY PASSWORD</label>
        <label class="radio-row"><input type="radio" name="resetMode" value="custom" /> ENTER A TEMPORARY PASSWORD</label>
        <div id="custom-password-field" class="field" hidden style="margin-top:14px">
          <label for="reset-password-input">TEMPORARY PASSWORD <span class="required">*</span></label>
          <input id="reset-password-input" name="password" type="text" autocomplete="off" />
          <small class="error-text" data-error="password"></small>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" type="button" data-cancel>CANCEL</button>
          <button class="btn btn-accent" type="submit">RESET PASSWORD</button>
        </div>
      </form>`
  });

  const form = $('#reset-password-form', modal.body);
  const customField = $('#custom-password-field', modal.body);
  $$('input[name="resetMode"]', form).forEach((radio) => {
    radio.addEventListener('change', () => { customField.hidden = $('input[name="resetMode"]:checked', form).value !== 'custom'; });
  });
  $('[data-cancel]', modal.body).addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors(form);
    const values = Object.fromEntries(new FormData(form).entries());
    if (values.resetMode === 'custom' && ((values.password || '').length < 8 || !/[A-Za-z]/.test(values.password || '') || !/\d/.test(values.password || ''))) {
      showFieldErrors(form, [{ field: 'password', message: 'Use 8+ characters with a letter and a number.' }]);
      return;
    }

    const submit = $('button[type="submit"]', form);
    setLoading(submit, true);
    try {
      const response = await api.admin.resetPassword(user._id, values.resetMode === 'custom' ? values.password : '');
      modal.body.innerHTML = `<div class="password-result">
        <p class="hint">Temporary password for <strong>${escapeHtml(user.name)}</strong>:</p>
        <code class="inline-code">${escapeHtml(response.temporaryPassword)}</code>
        <p class="hint">Share it securely. It will not be shown again.</p>
      </div>
      <div class="modal-actions"><button class="btn btn-accent" type="button" data-done>DONE</button></div>`;
      $('[data-done]', modal.body).addEventListener('click', () => { modal.close(); renderAdmin(); });
      toast(response.message, 'success');
    } catch (error) {
      if (error.details?.length) showFieldErrors(form, error.details);
      toast(error.message, 'error');
      setLoading(submit, false);
    }
  });
}

export function initAdmin() {
  $$('[data-atab]').forEach((tab) => {
    tab.addEventListener('click', () => activateAdminTab(tab.dataset.atab));
  });

  $('#admin-create-user').addEventListener('click', openCreateUser);
  $('#admin-import-users').addEventListener('click', openImportUsers);

  $('#admin-grad-year').addEventListener('change', (event) => {
    adminGradYear = event.target.value;
    adminDepartment = '';
    renderAdmin();
  });
  $('#admin-department').addEventListener('change', (event) => {
    adminDepartment = event.target.value;
    renderAdmin();
  });

  $('#admin-refresh').addEventListener('click', async () => {
    const ok = await renderAdmin();
    if (ok) toast('Admin data refreshed.', 'success');
  });

  $('#admin-panel').addEventListener('change', async (event) => {
    const select = event.target.closest?.('[data-role-for]');
    if (!select) return;
    try {
      const response = await api.admin.setRole(select.dataset.roleFor, select.value);
      toast(response.message, 'success');
      renderAdmin();
    } catch (error) {
      toast(error.message, 'error');
      renderAdmin();
    }
  });

  $('#admin-panel').addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-aaction]');
    if (!button) return;
    const { aaction, id, status, decision } = button.dataset;

    if (aaction === 'edit') {
      try {
        const response = await api.items.get(id);
        emit('editItem', { item: response.item });
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }

    if (aaction === 'status') {
      setLoading(button, true);
      try {
        const response = await api.items.setStatus(id, status);
        toast(response.message, 'success');
        renderAdmin();
      } catch (error) {
        toast(error.message, 'error');
        setLoading(button, false);
      }
      return;
    }

    if (aaction === 'delete-item') {
      const confirmed = await confirmAction({ title: 'DELETE LISTING?', message: 'This removes the listing and all claims on it.', confirmLabel: 'YES, DELETE' });
      if (!confirmed) return;
      try {
        const response = await api.items.remove(id);
        toast(response.message, 'success');
        renderAdmin();
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }

    if (aaction === 'review') {
      const confirmed = await confirmAction({
        title: `${decision.toUpperCase()} CLAIM?`,
        message: decision === 'approved'
          ? 'This marks the item as claimed and rejects other pending claims.'
          : 'The item will stay available for other students.',
        confirmLabel: `YES, ${decision.toUpperCase()}`,
        danger: decision !== 'approved'
      });
      if (!confirmed) return;
      setLoading(button, true);
      try {
        const response = await api.claims.review(id, decision);
        toast(response.message, 'success');
        renderAdmin();
      } catch (error) {
        toast(error.message, 'error');
        setLoading(button, false);
      }
      return;
    }

    if (aaction === 'reset-password') {
      openResetPassword({ _id: id, name: button.dataset.name || 'this user' });
      return;
    }

    if (aaction === 'delete-user') {
      const confirmed = await confirmAction({ title: 'DELETE USER?', message: 'Their listings and claims will also be removed.', confirmLabel: 'YES, DELETE' });
      if (!confirmed) return;
      try {
        const response = await api.admin.removeUser(id);
        toast(response.message, 'success');
        renderAdmin();
      } catch (error) {
        toast(error.message, 'error');
      }
    }
  });
}

export async function renderAdmin() {
  const seq = ++state.adminSeq;
  const panel = $('#admin-panel');
  const statsBox = $('#admin-stats');

  if (!isAdmin()) {
    statsBox.innerHTML = '';
    panel.innerHTML = '<div class="inline-notice">ADMIN ACCESS REQUIRED. SIGN IN WITH AN ADMIN ACCOUNT.</div>';
    const filterBar = $('#admin-user-filters');
    if (filterBar) filterBar.hidden = true;
    return false;
  }

  statsBox.innerHTML = '<p class="mono-note">LOADING STATS...</p>';
  panel.innerHTML = '<p class="mono-note">LOADING MODERATION DATA...</p>';

  try {
    const [statsResponse, dataResponse] = await Promise.all([
      api.admin.stats(),
      state.adminTab === 'items'
        ? api.admin.items()
        : state.adminTab === 'claims'
          ? api.claims.all()
          : api.admin.users()
    ]);
    if (seq !== state.adminSeq) return false;

    statsBox.innerHTML = statsMarkup(statsResponse.stats);
    const filterBar = $('#admin-user-filters');
    if (filterBar) filterBar.hidden = state.adminTab !== 'users';
    if (state.adminTab === 'items') panel.innerHTML = itemsTable(dataResponse.items || []);
    else if (state.adminTab === 'claims') panel.innerHTML = claimsTable(dataResponse.claims || []);
    else panel.innerHTML = usersTable(syncUserFilters(dataResponse.users || []));
    return true;
  } catch (error) {
    if (seq !== state.adminSeq) return false;
    statsBox.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
    panel.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
    toast(error.message, 'error');
    return false;
  }
}

import { api } from '../api.js';
import { isAdmin, state, getUser } from '../store.js';
import { emit } from '../events.js';
import {
  $, $$, escapeHtml, statusBadge, typeBadge, formatDate, truncate,
  confirmAction, toast, setLoading
} from '../ui.js';

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
      <tbody>${items.map((item) => `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong><br /><span class="mono-note">${escapeHtml(truncate(item.description, 60))}</span></td>
          <td>${typeBadge(item.type)}</td>
          <td>${statusBadge(item.status)}</td>
          <td>${escapeHtml(item.reportedBy?.name || '—')}<br /><span class="mono-note">${escapeHtml(item.reportedBy?.email || '')}</span></td>
          <td>${escapeHtml(item.location)}</td>
          <td>${formatDate(item.date)}</td>
          <td><div class="row-actions">
            <button class="btn btn-xs" type="button" data-aaction="edit" data-id="${item._id}">EDIT</button>
            <button class="btn btn-xs" type="button" data-aaction="status" data-id="${item._id}" data-status="resolved">RESOLVE</button>
            <button class="btn btn-xs btn-danger" type="button" data-aaction="delete-item" data-id="${item._id}">DELETE</button>
          </div></td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

function claimsTable(claims) {
  if (!claims.length) return '<div class="inline-notice">NO CLAIMS FOUND.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>ITEM</th><th>CLAIMANT</th><th>PROOF</th><th>STATUS</th><th>DATE</th><th>ACTIONS</th></tr></thead>
      <tbody>${claims.map((claim) => `
        <tr>
          <td><strong>${escapeHtml(claim.item?.title || 'Removed listing')}</strong><br />${typeBadge(claim.item?.type || 'lost')}</td>
          <td>${escapeHtml(claim.claimant?.name || '—')}<br /><span class="mono-note">${escapeHtml(claim.claimant?.email || '')}</span></td>
          <td>${escapeHtml(truncate(claim.proof, 90))}</td>
          <td>${statusBadge(claim.status)}</td>
          <td>${formatDate(claim.createdAt)}</td>
          <td>${claim.status === 'pending' ? `
            <div class="row-actions">
              <button class="btn btn-xs btn-accent" type="button" data-aaction="review" data-id="${claim._id}" data-decision="approved">APPROVE</button>
              <button class="btn btn-xs btn-danger" type="button" data-aaction="review" data-id="${claim._id}" data-decision="rejected">REJECT</button>
            </div>` : `<span class="mono-note">BY ${escapeHtml(claim.reviewedBy?.name || 'SYSTEM')}</span>`}
          </td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

function usersTable(users) {
  if (!users.length) return '<div class="inline-notice">NO USERS FOUND.</div>';
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>NAME</th><th>EMAIL</th><th>STUDENT ID</th><th>ROLE</th><th>JOINED</th><th>ACTIONS</th></tr></thead>
      <tbody>${users.map((user) => `
        <tr>
          <td><strong>${escapeHtml(user.name)}</strong></td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.studentId || '—')}</td>
          <td>
            <select data-role-for="${user._id}" aria-label="Role for ${escapeHtml(user.name)}" ${user._id === getUser()?.id ? 'disabled' : ''}>
              <option value="user" ${user.role === 'user' ? 'selected' : ''}>USER</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ADMIN</option>
            </select>
            ${user.role === 'admin' ? '<span class="badge badge-admin">ADMIN</span>' : ''}
          </td>
          <td>${formatDate(user.createdAt)}</td>
          <td><button class="btn btn-xs btn-danger" type="button" data-aaction="delete-user" data-id="${user._id}" ${user._id === getUser()?.id ? 'disabled' : ''}>DELETE USER</button></td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

export function initAdmin() {
  $$('[data-atab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.adminTab = tab.dataset.atab;
      $$('[data-atab]').forEach((node) => node.classList.toggle('active', node === tab));
      renderAdmin();
    });
  });

  $('#admin-refresh').addEventListener('click', () => {
    renderAdmin();
    toast('Admin data refreshed.', 'success');
  });

  $('#admin-panel').addEventListener('change', async (event) => {
    const select = event.target.closest('[data-role-for]');
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
        emit('refresh');
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }

    if (aaction === 'review') {
      setLoading(button, true);
      try {
        const response = await api.claims.review(id, decision);
        toast(response.message, 'success');
        renderAdmin();
        emit('refresh');
      } catch (error) {
        toast(error.message, 'error');
        setLoading(button, false);
      }
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
  const panel = $('#admin-panel');
  const statsBox = $('#admin-stats');

  if (!isAdmin()) {
    statsBox.innerHTML = '';
    panel.innerHTML = '<div class="inline-notice">ADMIN ACCESS REQUIRED. SIGN IN WITH AN ADMIN ACCOUNT.</div>';
    return;
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

    statsBox.innerHTML = statsMarkup(statsResponse.stats);
    if (state.adminTab === 'items') panel.innerHTML = itemsTable(dataResponse.items);
    else if (state.adminTab === 'claims') panel.innerHTML = claimsTable(dataResponse.claims);
    else panel.innerHTML = usersTable(dataResponse.users);
  } catch (error) {
    statsBox.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
    panel.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
    toast(error.message, 'error');
  }
}

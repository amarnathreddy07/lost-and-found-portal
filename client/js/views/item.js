import { api } from '../api.js';
import { getUser, isAdmin } from '../store.js';
import { emit } from '../events.js';
import {
  $, escapeHtml, imageMarkup, typeBadge, statusBadge, formatDate,
  openModal, closeModal, confirmAction, toast, showFieldErrors, clearFormErrors, setLoading
} from '../ui.js';

function detailMarkup(item) {
  const user = getUser();
  const owner = item.reportedBy || {};
  const mine = user && owner._id === user.id;
  const canManage = user && (mine || isAdmin());
  const status = item.status || 'active';

  let accessBlock = '';
  if (!user) {
    accessBlock = `<div class="inline-notice">SIGN IN TO CLAIM THIS ITEM. <button class="btn btn-xs btn-accent" type="button" data-action="signin">SIGN IN</button></div>`;
  } else if (mine) {
    accessBlock = `<div class="inline-notice">THIS IS YOUR LISTING. USE THE MANAGEMENT CONTROLS BELOW.</div>`;
  } else if (status !== 'active') {
    accessBlock = `<div class="inline-notice">CLAIMS ARE CLOSED FOR THIS LISTING (${escapeHtml(status.toUpperCase())}).</div>`;
  } else {
    accessBlock = `
      <form class="claim-box" id="claim-form" novalidate>
        <h3>CLAIM THIS ITEM</h3>
        <p class="hint">Tell the owner how you know it is yours. Specific details work best.</p>
        <div class="field">
          <label for="claim-proof">PROOF / NOTES <span class="required">*</span></label>
          <textarea id="claim-proof" name="proof" rows="3" minlength="10" maxlength="1500" placeholder="e.g. My name is written inside the cover..." required></textarea>
          <small class="error-text" data-error="proof"></small>
        </div>
        <div class="modal-actions"><button class="btn btn-accent" type="submit">SUBMIT CLAIM</button></div>
      </form>`;
  }

  const manageBlock = canManage ? `
    <div class="claim-box">
      <h3>MANAGE LISTING</h3>
      <div class="row-actions">
        <button class="btn btn-sm" type="button" data-action="edit">EDIT</button>
        <button class="btn btn-sm" type="button" data-action="claims">VIEW CLAIMS</button>
        ${status !== 'active' ? '<button class="btn btn-sm" type="button" data-action="status" data-status="active">REOPEN</button>' : ''}
        ${status !== 'claimed' ? '<button class="btn btn-sm" type="button" data-action="status" data-status="claimed">MARK CLAIMED</button>' : ''}
        ${status !== 'resolved' ? '<button class="btn btn-sm" type="button" data-action="status" data-status="resolved">MARK RESOLVED</button>' : ''}
        <button class="btn btn-sm btn-danger" type="button" data-action="delete">DELETE</button>
      </div>
    </div>` : '';

  return `
    <div class="detail-media">${imageMarkup(item.imageUrl, (item.category || '?').slice(0, 1).toUpperCase())}</div>
    <div class="card-meta">
      ${typeBadge(item.type)}
      ${statusBadge(status)}
      <span class="badge badge-active">${escapeHtml(item.category)}</span>
    </div>
    <h3 style="margin-top:12px">${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <div class="detail-grid">
      <div><small>CAMPUS LOCATION</small><strong>${escapeHtml(item.location)}</strong></div>
      <div><small>DATE REPORTED</small><strong>${formatDate(item.date)}</strong></div>
      <div><small>REPORTED BY</small><strong>${escapeHtml(owner.name || 'Campus member')}</strong></div>
      <div><small>POSTED</small><strong>${formatDate(item.createdAt)}</strong></div>
    </div>
    ${accessBlock}
    ${manageBlock}`;
}

async function showClaims(itemId) {
  const modal = openModal({ title: 'CLAIMS FOR THIS LISTING', body: '<p class="mono-note">LOADING CLAIMS...</p>', wide: true });
  try {
    const response = await api.claims.forItem(itemId);
    if (!response.claims.length) {
      modal.body.innerHTML = '<div class="inline-notice">NO CLAIMS HAVE BEEN SUBMITTED YET.</div>';
      return;
    }
    modal.body.innerHTML = response.claims.map((claim) => `
      <div class="list-card">
        <div class="list-card-head">
          <strong>${escapeHtml(claim.claimant?.name || 'Student')}</strong>
          ${statusBadge(claim.status)}
        </div>
        <div class="list-card-body">${escapeHtml(claim.proof)}</div>
        <span class="mono-note">${formatDate(claim.createdAt)}</span>
      </div>`).join('');
  } catch (error) {
    modal.body.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
  }
}

export async function openItem(id) {
  const modal = openModal({ title: 'LOADING LISTING...', body: '<div class="skeleton"><div class="skeleton-media"></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>' });
  let item;
  try {
    const response = await api.items.get(id);
    item = response.item;
  } catch (error) {
    modal.body.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
    return;
  }

  $('.modal-head h2').textContent = item.title.toUpperCase();
  modal.body.innerHTML = detailMarkup(item);

  modal.body.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    if (action === 'signin') {
      closeModal();
      emit('openAuth', { mode: 'login' });
      return;
    }

    if (action === 'edit') {
      closeModal();
      emit('editItem', { item });
      return;
    }

    if (action === 'claims') {
      showClaims(item._id);
      return;
    }

    if (action === 'status') {
      const status = actionButton.dataset.status;
      setLoading(actionButton, true);
      try {
        const response = await api.items.setStatus(item._id, status);
        toast(response.message, 'success');
        closeModal();
        emit('refresh');
      } catch (error) {
        toast(error.message, 'error');
        setLoading(actionButton, false);
      }
      return;
    }

    if (action === 'delete') {
      const confirmed = await confirmAction({
        title: 'DELETE LISTING?',
        message: `“${item.title}” and all of its claims will be permanently removed.`,
        confirmLabel: 'YES, DELETE'
      });
      if (!confirmed) return;
      try {
        const response = await api.items.remove(item._id);
        toast(response.message, 'success');
        closeModal();
        emit('refresh');
      } catch (error) {
        toast(error.message, 'error');
      }
    }
  });

  const claimForm = $('#claim-form', modal.body);
  if (claimForm) {
    claimForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const proof = claimForm.elements.proof.value.trim();
      if (proof.length < 10) {
        showFieldErrors(claimForm, [{ field: 'proof', message: 'Tell the owner at least 10 characters of proof.' }]);
        return;
      }
      clearFormErrors(claimForm);
      const submit = $('button[type="submit"]', claimForm);
      setLoading(submit, true);
      try {
        const response = await api.claims.create({ itemId: item._id, proof });
        toast(response.message, 'success');
        closeModal();
        emit('refresh');
      } catch (error) {
        if (error.details?.length) showFieldErrors(claimForm, error.details);
        else toast(error.message, 'error');
        setLoading(submit, false);
      }
    });
  }
}

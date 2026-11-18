import { api } from '../api.js';
import { getUser, state } from '../store.js';
import { emit } from '../events.js';
import {
  $, $$, escapeHtml, statusBadge, typeBadge, formatCalendarDate, formatDate, truncate,
  confirmAction, toast, setLoading
} from '../ui.js';

function empty(message) {
  return `<div class="inline-notice">${escapeHtml(message)}</div>`;
}

function listingCard(item) {
  const id = escapeHtml(item._id);
  return `
    <div class="list-card">
      <div class="list-card-head">
        <h3>${escapeHtml(item.title)}</h3>
        <div>${typeBadge(item.type)} ${statusBadge(item.status)}</div>
      </div>
      <div class="list-card-body">
        ${escapeHtml(item.location)} &middot; ${formatCalendarDate(item.date)} &middot; ${escapeHtml(item.category)}
        <br />${escapeHtml(truncate(item.description, 140))}
      </div>
      <div class="row-actions">
        <button class="btn btn-xs" type="button" data-daction="edit" data-id="${id}">EDIT</button>
        <button class="btn btn-xs" type="button" data-daction="status" data-id="${id}" data-status="active">REOPEN</button>
        <button class="btn btn-xs" type="button" data-daction="status" data-id="${id}" data-status="claimed">CLAIMED</button>
        <button class="btn btn-xs" type="button" data-daction="status" data-id="${id}" data-status="resolved">RESOLVED</button>
        <button class="btn btn-xs btn-danger" type="button" data-daction="delete" data-id="${id}">DELETE</button>
      </div>
    </div>`;
}

function submittedCard(claim) {
  return `
    <div class="list-card">
      <div class="list-card-head">
        <h3>${escapeHtml(claim.item?.title || 'Removed listing')}</h3>
        ${statusBadge(claim.status)}
      </div>
      <div class="list-card-body">
        <strong>YOUR PROOF:</strong> ${escapeHtml(claim.proof)}<br />
        <span class="mono-note">SUBMITTED ${formatDate(claim.createdAt)} &middot; ITEM STATUS: ${escapeHtml(claim.item?.status || 'unknown')}</span>
        ${claim.reviewedBy?.name ? `<br /><strong>REVIEWED BY:</strong> ${escapeHtml(claim.reviewedBy.name)}${claim.reviewedAt ? ` &middot; ${formatDate(claim.reviewedAt)}` : ''}` : ''}
      </div>
    </div>`;
}

function receivedCard(claim) {
  const claimant = claim.claimant || {};
  const id = escapeHtml(claim._id);
  const canReview = claim.status === 'pending';
  return `
    <div class="list-card">
      <div class="list-card-head">
        <h3>${escapeHtml(claim.item?.title || 'Removed listing')}</h3>
        ${statusBadge(claim.status)}
      </div>
      <div class="list-card-body">
        <strong>CLAIMANT:</strong> ${escapeHtml(claimant.name || 'Student')}
        ${claimant.studentId ? ` &middot; ${escapeHtml(claimant.studentId)}` : ''}
        ${claimant.email ? `<br /><strong>CONTACT:</strong> ${escapeHtml(claimant.email)} ${claimant.phone ? `/ ${escapeHtml(claimant.phone)}` : ''}` : ''}
        <br /><strong>PROOF:</strong> ${escapeHtml(claim.proof)}
        <br /><span class="mono-note">SUBMITTED ${formatDate(claim.createdAt)}</span>
      </div>
      ${canReview ? `
        <div class="row-actions">
          <button class="btn btn-xs btn-accent" type="button" data-daction="review" data-id="${id}" data-decision="approved">APPROVE</button>
          <button class="btn btn-xs btn-danger" type="button" data-daction="review" data-id="${id}" data-decision="rejected">REJECT</button>
        </div>` : ''}
    </div>`;
}

export function initDashboard() {
  $$('[data-dtab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.dashboardTab = tab.dataset.dtab;
      $$('[data-dtab]').forEach((node) => {
        const active = node === tab;
        node.classList.toggle('active', active);
        node.setAttribute('aria-selected', String(active));
      });
      $('#dashboard-panel').setAttribute('aria-labelledby', tab.id);
      renderDashboard();
    });
  });

  $('#dashboard-panel').addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-daction]');
    if (!button) return;
    const { daction, id, status, decision } = button.dataset;

    if (daction === 'edit') {
      try {
        const response = await api.items.get(id);
        emit('editItem', { item: response.item });
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }

    if (daction === 'delete') {
      const confirmed = await confirmAction({
        title: 'DELETE THIS LISTING?',
        message: 'The listing and all claims attached to it will be removed.',
        confirmLabel: 'YES, DELETE'
      });
      if (!confirmed) return;
      try {
        const response = await api.items.remove(id);
        toast(response.message, 'success');
        renderDashboard();
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }

    if (daction === 'status') {
      setLoading(button, true);
      try {
        const response = await api.items.setStatus(id, status);
        toast(response.message, 'success');
        renderDashboard();
      } catch (error) {
        toast(error.message, 'error');
        setLoading(button, false);
      }
      return;
    }

    if (daction === 'review') {
      const note = decision === 'approved'
        ? 'Approving this claim will mark the item as claimed and reject other pending claims.'
        : 'Rejecting this claim will keep the item available for other students.';
      const confirmed = await confirmAction({
        title: `${decision.toUpperCase()} CLAIM?`,
        message: note,
        confirmLabel: `YES, ${decision.toUpperCase()}`,
        danger: decision !== 'approved'
      });
      if (!confirmed) return;
      setLoading(button, true);
      try {
        const response = await api.claims.review(id, decision);
        toast(response.message, 'success');
        renderDashboard();
      } catch (error) {
        toast(error.message, 'error');
        setLoading(button, false);
      }
    }
  });
}

export async function renderDashboard() {
  const seq = ++state.dashboardSeq;
  const panel = $('#dashboard-panel');

  if (!getUser()) {
    panel.innerHTML = `${empty('SIGN IN TO MANAGE YOUR LISTINGS AND CLAIMS.')}
      <button class="btn btn-accent" type="button" data-dlogin>SIGN IN NOW</button>`;
    $('[data-dlogin]', panel).addEventListener('click', () => emit('openAuth', { mode: 'login' }));
    return;
  }

  panel.innerHTML = '<p class="mono-note">LOADING YOUR DATA...</p>';
  try {
    let response;
    if (state.dashboardTab === 'items') response = await api.items.mine();
    else if (state.dashboardTab === 'submitted') response = await api.claims.mine();
    else response = await api.claims.received();
    if (seq !== state.dashboardSeq) return;

    if (state.dashboardTab === 'items') {
      const items = Array.isArray(response.items) ? response.items : [];
      panel.innerHTML = items.length ? items.map(listingCard).join('') : empty('YOU HAVE NOT REPORTED ANY ITEMS YET. USE THE REPORT FORM TO START.');
    } else if (state.dashboardTab === 'submitted') {
      const claims = Array.isArray(response.claims) ? response.claims : [];
      panel.innerHTML = claims.length ? claims.map(submittedCard).join('') : empty('YOU HAVE NOT SUBMITTED ANY CLAIMS YET.');
    } else {
      const claims = Array.isArray(response.claims) ? response.claims : [];
      panel.innerHTML = claims.length ? claims.map(receivedCard).join('') : empty('NO ONE HAS CLAIMED YOUR LISTINGS YET.');
    }
  } catch (error) {
    if (seq !== state.dashboardSeq) return;
    panel.innerHTML = `<div class="inline-notice">${escapeHtml(error.message)}</div>`;
    toast(error.message, 'error');
  }
}

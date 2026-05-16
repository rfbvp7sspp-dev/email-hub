import { saveDebrief, loadDebriefs, deleteDebrief, getRecentHospitals } from './storage.js';
import { showToast, esc, fmtTime } from './ui.js';

export function createDebrief(overrides = {}) {
  return {
    id:        crypto.randomUUID(),
    hospital:  '',
    notes:     '',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function openDebriefModal() {
  const modal = document.getElementById('debriefModal');
  if (!modal) return;

  const hospitals = getRecentHospitals();
  const datalist  = document.getElementById('hospitalSuggestions');
  if (datalist) {
    datalist.innerHTML = hospitals.map(h => `<option value="${esc(h)}">`).join('');
  }

  const hInput = document.getElementById('debriefHospital');
  const nInput = document.getElementById('debriefNotes');
  if (hInput) hInput.value = '';
  if (nInput) nInput.value = '';

  modal.classList.add('open');
  if (hInput) setTimeout(() => hInput.focus(), 120);
}

export function closeDebriefModal() {
  document.getElementById('debriefModal')?.classList.remove('open');
}

export function submitDebrief() {
  const hospital = document.getElementById('debriefHospital')?.value.trim() || '';
  const notes    = document.getElementById('debriefNotes')?.value.trim()    || '';

  if (!hospital && !notes) {
    showToast('&#9888;', 'Add a hospital or notes first');
    return;
  }

  saveDebrief(createDebrief({ hospital, notes }));
  closeDebriefModal();
  showToast('&#10003;', 'Debrief saved');

  if (document.getElementById('todayView')?.classList.contains('active')) {
    window._renderToday?.();
  }
}

export function renderDebriefList(containerId, limit = null) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const list = limit ? loadDebriefs().slice(0, limit) : loadDebriefs();

  if (!list.length) {
    el.innerHTML = `<div class="empty-hint">No debriefs yet</div>`;
    return;
  }

  el.innerHTML = list.map(d => `
    <div class="debrief-card">
      <div class="debrief-header">
        <div class="debrief-hospital">${d.hospital ? esc(d.hospital) : '<span style="color:var(--text3)">No hospital</span>'}</div>
        <div class="debrief-time">${fmtDate(d.createdAt)}</div>
      </div>
      ${d.notes ? `<div class="debrief-notes">${esc(d.notes)}</div>` : ''}
    </div>`).join('');
}

export function initDebriefHandlers() {
  window.openDebrief    = openDebriefModal;
  window.closeDebrief   = closeDebriefModal;
  window.submitDebrief  = submitDebrief;

  window.__deleteDebrief = (id) => {
    deleteDebrief(id);
    showToast('&#128465;', 'Debrief deleted');
    window._renderToday?.();
  };
}

function fmtDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

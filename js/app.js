import { CONFIG }                          from './config.js';
import { saveRecent, getRecents, saveTask as _saveTask, loadTasks } from './storage.js';
import { parseEmailFile }                  from './email-reader.js';
import { buildPrompt }                     from './prompt-builder.js';
import { copyAndOpen }                      from './providers.js';
import { showToast, startClock, showView, esc, initials, fmtTime } from './ui.js';
import { createTask, addTaskFromEmail, renderTasks, initTaskHandlers, exportTaskToClipboard } from './tasks.js';
import { renderDebriefList, initDebriefHandlers } from './debrief.js';
import { initSearch }                      from './search.js';

// ── APP STATE ──
let currentEmail = null;
let bodyExpanded = false;

// ── INIT ──
(function init() {
  startClock('appClock');
  initTaskHandlers();
  initDebriefHandlers();
  initSearch();
  _bindFilePicker();
  window._renderToday = renderToday;
  renderToday();
  showView('todayView');
})();

// ── TODAY VIEW ──

function renderToday() {
  const d = new Date();
  const dateEl = document.getElementById('todayDate');
  if (dateEl) {
    dateEl.textContent = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // Open tasks
  const tasks = loadTasks().filter(t => t.status !== 'done');
  const countEl = document.getElementById('todayTaskCount');
  const taskListEl = document.getElementById('todayTaskList');

  if (countEl) {
    countEl.textContent = tasks.length
      ? `${tasks.length} open task${tasks.length !== 1 ? 's' : ''}`
      : 'All done';
  }

  if (taskListEl) {
    taskListEl.innerHTML = tasks.slice(0, 3).map(t => `
      <div class="today-row" onclick="window.goTasks()">
        <div class="today-row-dot" style="background:${_statusColour(t.status)}"></div>
        <div class="today-row-text">${esc(t.title)}</div>
        <div class="today-row-badge">${_statusLabel(t.status)}</div>
      </div>`).join('') || `<div class="empty-hint">No open tasks</div>`;
  }

  // Recent debriefs
  renderDebriefList('todayDebriefList', 3);

  // Recent emails
  const emails = getRecents().slice(0, 3);
  const emailListEl = document.getElementById('todayEmailList');
  if (emailListEl) {
    emailListEl.innerHTML = emails.length
      ? emails.map(e => `
          <div class="today-row" onclick="window.goInbox()">
            <div class="today-row-dot" style="background:var(--gold)"></div>
            <div class="today-row-text">${esc(e.subject)}</div>
            <div class="today-row-sub">${esc(e.sender)}</div>
          </div>`).join('')
      : `<div class="empty-hint">No recent emails</div>`;
  }
}

function _statusColour(s) {
  return { todo: '#636366', 'in-progress': '#0A84FF', waiting: '#FF9F0A', done: '#30D158' }[s] || '#636366';
}

function _statusLabel(s) {
  return { todo: 'To Do', 'in-progress': 'In Progress', waiting: 'Waiting', done: 'Done' }[s] || s;
}

// ── FILE PICKER ──
function _bindFilePicker() {
  ['filePicker', 'filePickerInbox'].forEach(id => {
    const picker = document.getElementById(id);
    if (!picker) return;
    picker.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          _loadEmailText(ev.target.result, file.name);
        } catch (err) {
          alert('Read error: ' + err.message);
        }
      };
      reader.onerror = () =>
        alert('FileReader failed — try the Paste fallback below instead.');
      reader.readAsText(file, 'UTF-8');
      this.value = '';
    });
  });
}

function _loadEmailText(text, filename) {
  const email = parseEmailFile(text, filename);
  saveRecent(email);
  _openEmail(email);
}

// ── NAVIGATION ──

window.goToday = function () {
  showView('todayView');
  renderToday();
};

window.goInbox = function () {
  showView('inboxView');
  renderRecents();
};

window.goTasks = function () {
  showView('tasksView');
  renderTasks();
};

window.openOneDrive = function () {
  const url = CONFIG.links.oneDrive;
  if (url) window.open(url, '_blank');
  else showToast('&#9432;', 'OneDrive link not configured — edit js/config.js');
};

window.openOutlookLink = function () {
  const url = CONFIG.links.outlook;
  if (url) window.open(url, '_blank');
  else {
    window.location.href = 'ms-outlook://';
    setTimeout(() => window.open('https://outlook.office.com', '_blank'), 1200);
  }
};

// ── PASTE FALLBACK ──

window.loadPasted = function () {
  const text = (document.getElementById('pasteInput') || {}).value || '';
  if (!text.trim()) { showToast('&#9888;', 'Nothing pasted yet'); return; }
  try {
    _loadEmailText(text.trim(), 'pasted');
    document.getElementById('pasteInput').value = '';
  } catch (err) {
    alert('Parse error: ' + err.message);
  }
};

// ── RECENTS ──

function renderRecents() {
  const list    = getRecents();
  const secEl   = document.getElementById('recentSection');
  const empEl   = document.getElementById('emptyState');
  const listEl  = document.getElementById('recentList');
  if (!secEl || !empEl || !listEl) return;

  if (!list.length) {
    secEl.style.display = 'none';
    empEl.style.display = 'flex';
    return;
  }

  secEl.style.display = 'flex';
  empEl.style.display = 'none';
  listEl.innerHTML = '';

  list.forEach((email, i) => {
    const row = document.createElement('div');
    row.className = 'email-row';
    row.style.animationDelay = `${i * 0.04}s`;
    row.innerHTML = `
      <div class="row-avatar">${initials(email.sender)}</div>
      <div class="row-info">
        <div class="row-sender">${esc(email.sender)}</div>
        <div class="row-subject">${esc(email.subject)}</div>
      </div>
      <div class="row-right">
        <div class="row-time">${fmtTime(email.time || email.loadedAt)}</div>
        <div class="row-chev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>`;
    row.addEventListener('click', () => _openEmail(email));
    listEl.appendChild(row);
  });
}

// ── EMAIL VIEW ──

function _openEmail(email) {
  currentEmail = email;
  bodyExpanded = false;
  renderEmailView();
  showView('emailView');
  const scrollEl = document.getElementById('emailScroll');
  if (scrollEl) scrollEl.scrollTop = 0;
}

function renderEmailView() {
  const e       = currentEmail;
  const hasLong = e.body && e.body.length > 300;
  const scrollEl = document.getElementById('emailScroll');
  if (!scrollEl) return;

  const attachHTML = e.attachments && e.attachments.length
    ? `<div class="attach-row">${e.attachments.map(a => `
        <div class="attach-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          ${esc(a)}
        </div>`).join('')}</div>`
    : '';

  const actionDefs = [
    { key: 'reply',        label: 'Draft Reply',     desc: 'Smart reply via assistant',       cls: 'primary', icon: _iconReply() },
    { key: 'summarise',    label: 'Summarise',        desc: 'Key points and actions',          cls: '',        icon: _iconSummarise() },
    { key: 'workorder',    label: 'Work Order',       desc: 'Tech services fault/loan report', cls: '',        icon: _iconTech() },
    { key: 'techservices', label: 'Tech Services',    desc: 'Handover or loan unit request',   cls: '',        icon: _iconTech() },
    { key: 'task',         label: 'Create Task',      desc: 'Extract action items',            cls: '',        icon: _iconTask() },
    { key: 'escalate',     label: 'Escalate to Chris',desc: 'Draft escalation for manager',    cls: 'wide',    icon: _iconEscalate() },
  ];

  const actionsHTML = actionDefs.map(a => `
    <div class="action-card ${a.cls}" role="button" tabindex="0">
      <div class="action-header">
        <div class="act-label">${a.label}</div>
        <div class="act-desc">${a.desc}</div>
      </div>
      <div class="provider-pills">
        <button class="pill pill-claude"  onclick="window.runAction('${a.key}','claude')">Claude</button>
        <button class="pill pill-chatgpt" onclick="window.runAction('${a.key}','chatgpt')">ChatGPT</button>
        <button class="pill pill-copilot" onclick="window.runAction('${a.key}','copilot')">Copilot</button>
      </div>
    </div>`).join('');

  scrollEl.innerHTML = `
    <div class="email-card">
      <div class="card-strip"></div>
      <div class="card-meta">
        <div class="sender-row">
          <div class="avatar">${initials(e.sender)}</div>
          <div class="sender-info">
            <div class="sender-name">${esc(e.sender)}</div>
            ${e.email ? `<div class="sender-email">${esc(e.email)}</div>` : ''}
          </div>
          <div class="email-time">${fmtTime(e.time)}</div>
        </div>
        <div class="email-subject">${esc(e.subject)}</div>
      </div>
      <div class="card-body" id="cardBody">${
        e.body
          ? esc(e.body).replace(/\n/g, '<br>')
          : '<span style="color:var(--text3)">No body</span>'
      }</div>
      ${hasLong ? `
        <button class="expand-btn" id="expandBtn" onclick="window.toggleBody()">
          Show more
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>` : ''}
      ${attachHTML}
    </div>

    <div class="section-label" style="margin-top:4px">Actions</div>
    ${actionsHTML}

    <button class="action-card" style="margin-top:4px;flex-direction:row;align-items:center;gap:10px;"
      onclick="window.addCurrentEmailAsTask()">
      ${_iconTask()}
      <div class="action-header">
        <div class="act-label">Add to Task List</div>
        <div class="act-desc">Save this email as a task locally</div>
      </div>
    </button>`;
}

// ── EMAIL ACTIONS ──

window.runAction = function (action, provider) {
  if (!currentEmail) return;
  try {
    const prompt = buildPrompt(action, currentEmail, provider);
    copyAndOpen(prompt, provider);
  } catch (err) {
    showToast('&#9888;', err.message);
  }
};

window.toggleBody = function () {
  bodyExpanded = !bodyExpanded;
  const body = document.getElementById('cardBody');
  const btn  = document.getElementById('expandBtn');
  if (body) body.classList.toggle('expanded', bodyExpanded);
  if (btn) {
    btn.classList.toggle('open', bodyExpanded);
    btn.childNodes[0].textContent = bodyExpanded ? 'Show less ' : 'Show more ';
  }
};

window.addCurrentEmailAsTask = function () {
  if (!currentEmail) return;
  addTaskFromEmail(currentEmail);
};

// ── TASK ACTIONS ──

window.addTaskManually = function () {
  const input = document.getElementById('newTaskInput');
  if (!input) return;
  const title = input.value.trim();
  if (!title) { showToast('&#9888;', 'Enter a task first'); return; }
  const task = createTask({ title });
  _saveTask(task);
  input.value = '';
  renderTasks();
  showToast('&#10003;', 'Task added');
};

window.exportTask = function (id) {
  exportTaskToClipboard(id);
};

// ── SVG ICONS ──

function _iconReply() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>`;
}
function _iconSummarise() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>`;
}
function _iconTech() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9F0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>`;
}
function _iconTask() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BF5AF2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>`;
}
function _iconEscalate() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF453A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`;
}

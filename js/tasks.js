import { loadTasks, saveTask, updateTask, deleteTask } from './storage.js';
import { showToast, esc, fmtTime } from './ui.js';

// ── TASK SHAPE ──
// { id, title, status, dueDate, sourceSubject, sourceSender, createdAt, completedAt }

/**
 * Create a new task object with defaults merged with any overrides.
 * @param {object} overrides
 * @returns {object}
 */
export function createTask(overrides = {}) {
  return {
    id:            crypto.randomUUID(),
    title:         '',
    status:        'todo',
    dueDate:       '',
    sourceSubject: '',
    sourceSender:  '',
    createdAt:     new Date().toISOString(),
    completedAt:   null,
    ...overrides,
  };
}

/**
 * Create and persist a task pre-filled from the current email.
 * @param {object} email - Normalised email object.
 */
export function addTaskFromEmail(email) {
  const task = createTask({
    title:         `Follow up: ${email.subject}`,
    sourceSubject: email.subject,
    sourceSender:  email.sender,
  });
  saveTask(task);
  showToast('&#10003;', 'Task added from email');
  renderTasks();
}

// ── RENDER ──

/**
 * Render all tasks into #taskList and update #taskCount.
 */
export function renderTasks() {
  const tasks    = loadTasks();
  const listEl   = document.getElementById('taskList');
  const countEl  = document.getElementById('taskCount');
  if (!listEl) return;

  const active    = tasks.filter(t => t.status !== 'done');
  const done      = tasks.filter(t => t.status === 'done');
  const ordered   = [...active, ...done];

  if (countEl) {
    countEl.textContent = active.length
      ? `${active.length} open task${active.length !== 1 ? 's' : ''}`
      : 'All done';
  }

  if (!ordered.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div class="empty-title">No Tasks Yet</div>
        <div class="empty-desc">Add a task manually or use "Create Task" on an email.</div>
      </div>`;
    return;
  }

  listEl.innerHTML = ordered.map((task, i) => _taskCardHTML(task, i)).join('');
}

function _taskCardHTML(task, i) {
  const isDone    = task.status === 'done';
  const doneClass = isDone ? ' task-done' : '';
  const checkCls  = isDone ? ' checked' : '';
  const metaParts = [];
  if (task.sourceSender)  metaParts.push(esc(task.sourceSender));
  if (task.sourceSubject) metaParts.push(esc(task.sourceSubject));
  if (task.createdAt)     metaParts.push(fmtTime(task.createdAt));
  const meta = metaParts.join(' · ');

  return `
    <div class="task-card${doneClass}" id="task-${esc(task.id)}" style="animation-delay:${i * 0.03}s">
      <button class="task-check${checkCls}" onclick="window.__toggleTask('${esc(task.id)}')" aria-label="Toggle complete">
        <svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
      <div class="task-body">
        <div class="task-title">${esc(task.title)}</div>
        ${meta ? `<div class="task-meta">${meta}</div>` : ''}
        <select class="task-status-select" onchange="window.__changeStatus('${esc(task.id)}', this.value)">
          <option value="todo"        ${task.status === 'todo'        ? 'selected' : ''}>To Do</option>
          <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="waiting"     ${task.status === 'waiting'     ? 'selected' : ''}>Waiting</option>
          <option value="done"        ${task.status === 'done'        ? 'selected' : ''}>Done</option>
        </select>
      </div>
      <button class="task-delete-btn" onclick="window.__deleteTask('${esc(task.id)}')" aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>`;
}

// ── HANDLERS ──

/**
 * Wire up window-level handlers called from inline onclick attributes.
 * Call once on app init.
 */
export function initTaskHandlers() {

  window.__toggleTask = (id) => {
    const tasks   = loadTasks();
    const task    = tasks.find(t => t.id === id);
    if (!task) return;
    const isDone  = task.status === 'done';
    const changes = isDone
      ? { status: 'todo', completedAt: null }
      : { status: 'done', completedAt: new Date().toISOString() };

    if (!isDone) {
      // Animate out before re-render.
      const card = document.getElementById(`task-${id}`);
      if (card) {
        card.classList.add('task-completing');
        updateTask(id, changes);
        setTimeout(renderTasks, 450);
        return;
      }
    }
    updateTask(id, changes);
    renderTasks();
  };

  window.__changeStatus = (id, status) => {
    updateTask(id, { status });
    renderTasks();
  };

  window.__deleteTask = (id) => {
    const card = document.getElementById(`task-${id}`);
    if (card) {
      card.classList.add('task-completing');
      setTimeout(() => {
        deleteTask(id);
        renderTasks();
      }, 420);
    } else {
      deleteTask(id);
      renderTasks();
    }
    showToast('&#128465;', 'Task deleted');
  };
}

// ── EXPORT ──

/**
 * Copy a task as JSON and show a toast for Agent Queue handoff.
 * @param {string} id - Task ID.
 */
export function exportTaskToClipboard(id) {
  const task = loadTasks().find(t => t.id === id);
  if (!task) return;
  const json = JSON.stringify(task, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json)
      .then(() => showToast('&#10003;', 'Task JSON copied — paste into Agent Queue'))
      .catch(() => showToast('&#9888;', 'Clipboard blocked'));
  } else {
    showToast('&#9888;', 'Clipboard not available');
  }
}

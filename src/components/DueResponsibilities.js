import { RecurrenceEngine } from '../engine/recurrenceEngine.js';
import { haptics } from '../services/hapticsService.js';

export function renderDueResponsibilities(state, onToggle, onAddTask, onRemoveTask, onToggleCustomTask, onPostponeTask) {
  const dueList = RecurrenceEngine.getDueResponsibilities();
  const customTasks = state.customTasks || [];

  const completedCore = dueList.filter((item) => state.dailyResponsibilities[item.id]?.completed).length;
  const completedCustom = customTasks.filter(t => t.completed).length;
  const totalComplete = completedCore + completedCustom;
  const totalDue = dueList.length + customTasks.length;
  const allDone = totalComplete === totalDue && totalDue > 0;

  const progressPct = totalDue > 0 ? Math.round((totalComplete / totalDue) * 100) : 0;

  // Circular ring SVG — shows ✓ in centre when all done
  const ringRadius = 14;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressPct / 100) * ringCircumference;
  const ringHtml = `
    <svg class="today-ring ${allDone ? 'today-ring--done' : ''}" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle class="today-ring-track" cx="17" cy="17" r="${ringRadius}" fill="none" stroke-width="2.5"/>
      <circle
        class="today-ring-fill"
        cx="17" cy="17" r="${ringRadius}"
        fill="none"
        stroke-width="2.5"
        stroke-dasharray="${ringCircumference}"
        stroke-dashoffset="${ringOffset}"
        transform="rotate(-90 17 17)"
      />
      ${allDone ? `<polyline points="11,17 15,21 23,13" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` : ''}
    </svg>
  `;

  const element = document.createElement('section');
  element.className = 'system-section section-gap-top';

  // ── Core task rows ─────────────────────────────────────────────────────────
  const coreTasksHtml = dueList.map((task) => {
    const isDone = Boolean(state.dailyResponsibilities[task.id]?.completed);
    const xp = task.xp || 15;
    const catLabel = task.category || 'Daily';
    return `
      <div class="task-item ${isDone ? 'is-completed' : ''}" data-id="${task.id}" data-type="core" role="button" aria-pressed="${isDone}">
        <div class="task-left">
          <div class="task-checkbox ${isDone ? 'checked' : ''}">
            ${isDone ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">
            <span class="task-label">${task.name}</span>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span class="category-pill pill-neutral">${catLabel}</span>
              ${task.frequency === 'alternate-day' ? `<span class="category-pill pill-alt">Alt. Day</span>` : ''}
            </div>
          </div>
        </div>
        <span class="task-xp-tag">+${xp}</span>
      </div>
    `;
  }).join('');

  // ── Custom task rows with urgency ──────────────────────────────────────────
  const customTasksHtml = customTasks.map((task) => {
    const isDone = Boolean(task.completed);
    const catTag = task.tag || task.category || 'Custom';
    const days = task.postponedDays || 0;
    const isPostponed = Boolean(task.postponed); // already flagged for tomorrow

    // Urgency class: 0 = none, 1 = orange, 2+ = red
    const urgencyClass = days === 0 ? '' : days === 1 ? 'postpone-1' : 'postpone-2';

    // Postpone indicator pill
    let postponePillHtml = '';
    if (days === 1) {
      postponePillHtml = `<span class="postpone-pill postpone-pill--orange">postponed 1×</span>`;
    } else if (days >= 2) {
      postponePillHtml = `<span class="postpone-pill postpone-pill--red">postponed ${days}×</span>`;
    }

    return `
      <div
        class="task-item ${isDone ? 'is-completed' : ''} ${urgencyClass}"
        data-id="${task.id}"
        data-type="custom"
        role="button"
        aria-pressed="${isDone}"
      >
        <div class="task-left">
          <div class="task-checkbox ${isDone ? 'checked' : ''}">
            ${isDone ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">
            <span class="task-label">${task.name}</span>
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              <span class="category-pill pill-neutral">${catTag}</span>
              ${postponePillHtml}
              ${isPostponed && !isDone ? `<span class="postpone-pill postpone-pill--orange" style="opacity:0.7;">carries to tomorrow</span>` : ''}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <span class="task-xp-tag">+${task.xp}</span>
          <button class="task-remove-btn" data-remove-id="${task.id}" title="Remove task" aria-label="Remove ${task.name}">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Recreation status
  const rec = state.recreation;
  let recTitle = 'Daily challenge done.';
  let recSub = "You've earned your leisure time.";
  if (!rec.isUnlocked) {
    recTitle = 'Keep going.';
    recSub = 'Finish your habits to unlock free time.';
  }

  element.innerHTML = `
    <!-- Today section header -->
    <div class="today-section-header">
      <div class="today-header-left">
        <span class="today-title">Today</span>
        <span class="today-subtitle">Let's make it count.</span>
      </div>
      <div class="today-header-right">
        <span class="today-count">${totalComplete} of ${totalDue}</span>
        ${ringHtml}
      </div>
    </div>

    <!-- Task list -->
    <div class="task-list-flat">
      <div class="responsibilities-list">
        ${coreTasksHtml}
        ${customTasksHtml}
        ${totalDue === 0 ? `<p style="font-size: 13px; color: var(--color-text-tertiary); padding: 16px 0; letter-spacing: -0.005em;">No habits scheduled. Add one below.</p>` : ''}
      </div>

      <!-- Add task row -->
      <div class="add-task-row-v2">
        <span class="add-task-plus" aria-hidden="true">+</span>
        <input
          id="add-task-input"
          class="add-task-input-v2"
          type="text"
          placeholder="Add a task..."
          maxlength="80"
          autocomplete="off"
        />
        <button id="add-task-btn" class="add-task-submit-btn" aria-label="Add task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Recreation banner -->
    <div class="rec-banner ${rec.isUnlocked ? 'rec-banner--unlocked' : 'rec-banner--locked'}">
      <div class="rec-banner-left">
        <svg class="rec-banner-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
        <div class="rec-banner-text">
          <div class="rec-banner-title">${recTitle}</div>
          <div class="rec-banner-sub">${recSub}</div>
        </div>
      </div>
      <span class="rec-banner-badge">${rec.isUnlocked ? 'Unlocked' : 'Locked'}</span>
    </div>
  `;

  // ── Event: toggle core task ─────────────────────────────────────────────────
  element.querySelectorAll('.task-item[data-type="core"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-remove-btn')) return;
      haptics.impactLight();
      onToggle(row.dataset.id);
    });
  });

  // ── Event: toggle / long-press custom task ──────────────────────────────────
  element.querySelectorAll('.task-item[data-type="custom"]').forEach((row) => {
    let pressTimer = null;
    let didLongPress = false;
    let startX = 0;
    let startY = 0;
    const MOVE_THRESHOLD = 6; // px — ignore micro-jitter

    function startPress(e) {
      didLongPress = false;
      startX = e.clientX;
      startY = e.clientY;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        haptics.impactMedium?.();
        showContextMenu(row, row.dataset.id);
      }, 500);
    }

    function cancelPress() {
      clearTimeout(pressTimer);
    }

    function onMove(e) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancelPress();
    }

    row.addEventListener('pointerdown', startPress);
    row.addEventListener('pointerup', cancelPress);
    row.addEventListener('pointercancel', cancelPress);
    row.addEventListener('pointermove', onMove);

    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-remove-btn')) return;
      if (didLongPress) return; // long-press already handled
      haptics.impactLight();
      onToggleCustomTask(row.dataset.id);
    });
  });

  // ── Event: remove custom task ───────────────────────────────────────────────
  element.querySelectorAll('.task-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptics.impactMedium?.();
      onRemoveTask(btn.dataset.removeId);
    });
  });

  // ── Add task ────────────────────────────────────────────────────────────────
  const input = element.querySelector('#add-task-input');
  const addBtn = element.querySelector('#add-task-btn');

  function submitTask() {
    const val = input.value.trim();
    if (val) {
      haptics.impactLight?.();
      onAddTask(val);
      input.value = '';
    }
  }

  addBtn.addEventListener('click', submitTask);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTask();
  });

  // ── Long-press context menu ─────────────────────────────────────────────────
  function showContextMenu(row, taskId) {
    // Remove any existing menu
    document.querySelector('.task-context-menu')?.remove();

    const task = customTasks.find(t => t.id === taskId);
    if (!task) return;

    const menu = document.createElement('div');
    menu.className = 'task-context-menu';

    const isAlreadyPostponed = task.postponed;

    menu.innerHTML = `
      <button class="task-context-item" id="ctx-complete">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Mark complete
      </button>
      ${!task.completed && !isAlreadyPostponed ? `
        <div class="task-context-divider"></div>
        <button class="task-context-item" id="ctx-postpone">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
          </svg>
          Postpone to tomorrow
        </button>
      ` : ''}
      <div class="task-context-divider"></div>
      <button class="task-context-item task-context-item--danger" id="ctx-delete">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
        Remove task
      </button>
    `;

    // Position near the row
    const rect = row.getBoundingClientRect();
    menu.style.top = `${rect.top + window.scrollY + rect.height / 2}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
    menu.style.transformOrigin = 'top left';

    document.body.appendChild(menu);

    // Close on outside click
    function closeMenu() {
      menu.remove();
      document.removeEventListener('pointerdown', onOutside);
    }
    function onOutside(e) {
      if (!menu.contains(e.target)) closeMenu();
    }
    setTimeout(() => document.addEventListener('pointerdown', onOutside), 10);

    menu.querySelector('#ctx-complete')?.addEventListener('click', () => {
      closeMenu();
      if (!task.completed) onToggleCustomTask(taskId);
    });

    menu.querySelector('#ctx-postpone')?.addEventListener('click', () => {
      closeMenu();
      haptics.impactLight?.();
      onPostponeTask(taskId);
    });

    menu.querySelector('#ctx-delete')?.addEventListener('click', () => {
      closeMenu();
      haptics.impactMedium?.();
      onRemoveTask(taskId);
    });
  }

  return element;
}

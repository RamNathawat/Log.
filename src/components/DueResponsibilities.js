import { RecurrenceEngine } from '../engine/recurrenceEngine.js';
import { haptics } from '../services/hapticsService.js';

export function renderDueResponsibilities(
  state,
  onToggle,
  onAddTask,
  onRemoveTask,
  onToggleCustomTask,
  onPostponeTask,
  onPostponeCoreTask,
  onUnskipTask,
  onUnskipCoreTask
) {
  const dueList = RecurrenceEngine.getDueResponsibilities();
  const customTasks = state.customTasks || [];
  const postponedCore = state.postponedCoreTasks || {};

  const activeCore = dueList.filter(item => !postponedCore[item.id]);
  const activeCustom = customTasks.filter(t => !t.postponed);

  const completedCore = dueList.filter((item) => state.dailyResponsibilities[item.id]?.completed).length;
  const completedCustom = customTasks.filter(t => t.completed).length;
  const totalComplete = completedCore + completedCustom;
  const totalDue = activeCore.length + activeCustom.length;
  const allDone = totalComplete >= totalDue && totalDue > 0;

  const progressPct = totalDue > 0 ? Math.min(100, Math.round((totalComplete / totalDue) * 100)) : 0;

  // Ring SVG
  const ringRadius = 14;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (progressPct / 100) * ringCircumference;
  const ringHtml = `
    <svg class="today-ring ${allDone ? 'today-ring--done' : ''}" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle class="today-ring-track" cx="17" cy="17" r="${ringRadius}" fill="none" stroke-width="2.5"/>
      <circle class="today-ring-fill" cx="17" cy="17" r="${ringRadius}" fill="none" stroke-width="2.5"
        stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringOffset}" transform="rotate(-90 17 17)"/>
      ${allDone ? `<polyline points="11,17 15,21 23,13" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` : ''}
    </svg>
  `;

  // ── Helper: unified postpone pill for both task types ───────────────────
  function getPostponePill({ isCore, postponedDays, isPostponed }) {
    if (!isPostponed) return '';

    if (isCore) {
      if (postponedDays <= 1) {
        return `<span class="postpone-pill postpone-pill--orange">skipped today</span>`;
      }
      const cls = postponedDays >= 3 ? 'postpone-pill--red' : 'postpone-pill--orange';
      return `<span class="postpone-pill ${cls}">skipped ${postponedDays}×</span>`;
    } else {
      if (postponedDays === 0 || postponedDays === 1) {
        return `<span class="postpone-pill postpone-pill--orange">skipped today</span>`;
      }
      const count = postponedDays || 1;
      const cls = count >= 3 ? 'postpone-pill--red' : 'postpone-pill--orange';
      return `<span class="postpone-pill ${cls}">skipped ${count}×</span>`;
    }
  }

  // ── Core task rows ─────────────────────────────────────────────────────────
  const coreTasksHtml = dueList.map((task) => {
    const isDone = Boolean(state.dailyResponsibilities[task.id]?.completed);
    const xp = task.xp || 15;
    const catLabel = task.category || 'Daily';
    const isPostponed = Boolean(postponedCore[task.id]);
    const days = postponedCore[task.id]?.postponedDays || 0;
    const uClass = !isPostponed ? '' : days <= 1 ? 'postpone-1' : 'postpone-2';
    const pill = getPostponePill({ isCore: true, postponedDays: days, isPostponed });

    return `
      <div class="task-item ${isDone ? 'is-completed' : ''} ${uClass}"
           data-id="${task.id}" data-type="core" role="button" aria-pressed="${isDone}">
        <div class="task-left">
          <div class="task-checkbox ${isDone ? 'checked' : ''}">
            ${isDone ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">
            <span class="task-label">${task.name}</span>
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              <span class="category-pill pill-neutral">${catLabel}</span>
              ${task.frequency === 'alternate-day' ? `<span class="category-pill pill-alt">Alt. Day</span>` : ''}
              ${pill}
            </div>
          </div>
        </div>
        <div class="task-right">
          <span class="task-xp-tag">+${xp}</span>
        </div>
      </div>
    `;
  }).join('');

  // ── Custom task rows ───────────────────────────────────────────────────────
  const customTasksHtml = customTasks.map((task) => {
    const isDone = Boolean(task.completed);
    const catTag = task.tag || task.category || 'Custom';
    const days = task.postponedDays || 0;
    const isPostponed = Boolean(task.postponed);
    const uClass = !isPostponed ? '' : days <= 1 ? 'postpone-1' : 'postpone-2';
    const pill = getPostponePill({ isCore: false, postponedDays: days, isPostponed });

    return `
      <div class="task-item ${isDone ? 'is-completed' : ''} ${uClass}"
           data-id="${task.id}" data-type="custom" role="button" aria-pressed="${isDone}">
        <div class="task-left">
          <div class="task-checkbox ${isDone ? 'checked' : ''}">
            ${isDone ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">
            <span class="task-label">${task.name}</span>
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              <span class="category-pill pill-neutral">${catTag}</span>
              ${pill}
            </div>
          </div>
        </div>
        <div class="task-right">
          <button class="task-remove-btn" data-remove-id="${task.id}" title="Remove task" aria-label="Remove ${task.name}">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <span class="task-xp-tag">+${task.xp}</span>
        </div>
      </div>
    `;
  }).join('');

  // Recreation status
  const rec = state.recreation;
  const recTitle = rec.isUnlocked ? 'Daily challenge done.' : 'Keep going.';
  const recSub   = rec.isUnlocked ? "You've earned your leisure time." : 'Finish your habits to unlock free time.';

  const element = document.createElement('section');
  element.className = 'system-section section-gap-top';

  element.innerHTML = `
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

    <div class="task-list-flat">
      <div class="responsibilities-list">
        ${coreTasksHtml}
        ${customTasksHtml}
        ${totalDue === 0 ? `<p style="font-size:13px;color:var(--color-text-tertiary);padding:16px 0;">No habits scheduled. Add one below.</p>` : ''}
      </div>

      <div class="add-task-row-v2">
        <span class="add-task-plus" aria-hidden="true">+</span>
        <input id="add-task-input" class="add-task-input-v2" type="text"
               placeholder="Add a task..." maxlength="80" autocomplete="off"/>
        <button id="add-task-btn" class="add-task-submit-btn" aria-label="Add task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <div class="rec-banner ${rec.isUnlocked ? 'rec-banner--unlocked' : 'rec-banner--locked'}">
      <div class="rec-banner-left">
        <svg class="rec-banner-icon" width="28" height="28" viewBox="0 0 26 26" fill="none" stroke="${rec.isUnlocked ? '#ffffff' : 'currentColor'}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5.5 10.5 C6.8 7.5, 9.2 7.5, 10.5 10.5"/>
          <path d="M15.5 10.5 C16.8 7.5, 19.2 7.5, 20.5 10.5"/>
          <path d="M6.5 15.5 C8.5 20.5, 17.5 20.5, 19.5 15.5"/>
        </svg>
        <div class="rec-banner-text">
          <div class="rec-banner-title">${recTitle}</div>
          <div class="rec-banner-sub">${recSub}</div>
        </div>
      </div>
      <span class="rec-banner-badge ${rec.isUnlocked ? 'rec-banner-badge--unlocked' : 'rec-banner-badge--locked'}">${rec.isUnlocked ? 'UNLOCKED' : 'Locked'}</span>
    </div>
  `;

  // ── Bottom action sheet for postpone ──────────────────────────────────────
  function showPostponeSheet(taskId, type) {
    const isCore = type === 'core';
    const task = isCore ? null : customTasks.find(t => t.id === taskId);
    const isDone = isCore
      ? Boolean(state.dailyResponsibilities[taskId]?.completed)
      : Boolean(task?.completed);

    // Only show for unchecked tasks
    if (isDone) return;

    const isAlreadyPostponed = isCore
      ? Boolean(postponedCore[taskId])
      : Boolean(task?.postponed);

    const taskName = isCore
      ? dueList.find(t => t.id === taskId)?.name || taskId
      : task?.name || taskId;

    // Remove any existing active action sheets first
    document.querySelectorAll('.action-sheet-backdrop').forEach(b => b.remove());

    // Build sheet
    const backdrop = document.createElement('div');
    backdrop.className = 'action-sheet-backdrop';

    const sheet = document.createElement('div');
    sheet.className = 'action-sheet';
    sheet.innerHTML = `
      <div class="action-sheet-handle"></div>
      <div class="action-sheet-title">Task Options</div>
      <div class="action-sheet-list">
        ${!isAlreadyPostponed ? `
          <button class="action-sheet-item" id="as-skip">
            <div class="action-sheet-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label">Skip today</span>
              <span class="action-sheet-item-sub">Carries to tomorrow (-1 WIL, -1 LIFE)</span>
            </div>
          </button>
        ` : `
          <button class="action-sheet-item" id="as-unskip">
            <div class="action-sheet-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label">Do it now</span>
              <span class="action-sheet-item-sub">Pull it back — get it done (+1 WIL, +1 LIFE)</span>
            </div>
          </button>
        `}
        ${!isCore ? `
          <div class="action-sheet-divider"></div>
          <button class="action-sheet-item" id="as-delete">
            <div class="action-sheet-item-icon" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.25);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label" style="color: #ef4444;">Delete task</span>
              <span class="action-sheet-item-sub">Permanently remove this custom task</span>
            </div>
          </button>
        ` : ''}
      </div>
      <div style="font-size: 12px; color: var(--color-text-tertiary); text-align: center; letter-spacing: -0.005em; padding-bottom: 12px;">
        "${taskName}"
      </div>
      <button class="action-sheet-cancel" id="as-cancel">Cancel</button>
    `;

    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);

    // Force reflow for silky smooth 60fps hardware accelerated slide-up
    void sheet.offsetHeight;

    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
      sheet.classList.add('visible');
    });

    function close() {
      backdrop.classList.remove('visible');
      sheet.classList.remove('visible');
      setTimeout(() => backdrop.remove(), 320);
    }

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    sheet.querySelector('#as-cancel').addEventListener('click', close);

    sheet.querySelector('#as-skip')?.addEventListener('click', () => {
      close();
      haptics.impactLight?.();
      if (isCore) onPostponeCoreTask(taskId);
      else onPostponeTask(taskId);
    });

    sheet.querySelector('#as-unskip')?.addEventListener('click', () => {
      close();
      haptics.impactLight?.();
      if (isCore) onUnskipCoreTask(taskId);
      else onUnskipTask(taskId);
    });

    sheet.querySelector('#as-delete')?.addEventListener('click', () => {
      close();
      haptics.impactMedium?.();
      onRemoveTask(taskId);
    });
  }

  // ── Attach interactions to ALL task rows ───────────────────────────────────
  function attachTaskEvents(row, type) {
    let pressTimer = null;
    let didLongPress = false;
    let lastLongPressTime = 0;
    let startX = 0, startY = 0;
    const THRESHOLD = 8;

    // Desktop: right-click → postpone sheet (suppressed if touch long-press just fired)
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Date.now() - lastLongPressTime < 800) return; // Prevent double trigger from touch
      didLongPress = true;
      lastLongPressTime = Date.now();
      showPostponeSheet(row.dataset.id, type);
    });

    // Touch & Pointer: long-press → postpone sheet
    row.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return; // Only primary button / touch
      didLongPress = false;
      startX = e.clientX;
      startY = e.clientY;

      pressTimer = setTimeout(() => {
        didLongPress = true;
        lastLongPressTime = Date.now();
        haptics.impactMedium?.();
        showPostponeSheet(row.dataset.id, type);
      }, 480);
    });

    function cancelPress() {
      clearTimeout(pressTimer);
    }

    row.addEventListener('pointerup', () => {
      cancelPress();
      if (didLongPress) {
        setTimeout(() => { didLongPress = false; }, 150);
      }
    });
    row.addEventListener('pointercancel', () => {
      cancelPress();
      didLongPress = false;
    });
    row.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - startX) > THRESHOLD || Math.abs(e.clientY - startY) > THRESHOLD) {
        cancelPress();
      }
    });

    // Normal click = toggle
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-remove-btn')) return;
      if (didLongPress || Date.now() - lastLongPressTime < 400) return;
      haptics.impactLight?.();
      if (type === 'core') onToggle(row.dataset.id);
      else onToggleCustomTask(row.dataset.id);
    });
  }

  element.querySelectorAll('.task-item[data-type="core"]').forEach(r => attachTaskEvents(r, 'core'));
  element.querySelectorAll('.task-item[data-type="custom"]').forEach(r => attachTaskEvents(r, 'custom'));

  // Remove button (custom only)
  element.querySelectorAll('.task-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptics.impactMedium?.();
      onRemoveTask(btn.dataset.removeId);
    });
  });

  // Add task
  const input  = element.querySelector('#add-task-input');
  const addBtn = element.querySelector('#add-task-btn');

  function submitTask() {
    const val = input.value.trim();
    if (val) { haptics.impactLight?.(); onAddTask(val); input.value = ''; }
  }
  addBtn.addEventListener('click', submitTask);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTask(); });

  return element;
}

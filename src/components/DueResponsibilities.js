import { RecurrenceEngine } from '../engine/recurrenceEngine.js';
import { haptics } from '../services/hapticsService.js';

export function renderDueResponsibilities(state, onToggle, onAddTask, onRemoveTask, onToggleCustomTask) {
  const dueList = RecurrenceEngine.getDueResponsibilities();
  const customTasks = state.customTasks || [];

  const completedCore = dueList.filter((item) => state.dailyResponsibilities[item.id]?.completed).length;
  const completedCustom = customTasks.filter(t => t.completed).length;
  const totalComplete = completedCore + completedCustom;
  const totalDue = dueList.length + customTasks.length;
  const allDone = totalComplete === totalDue && totalDue > 0;

  const progressPct = totalDue > 0 ? Math.round((totalComplete / totalDue) * 100) : 0;

  const element = document.createElement('section');
  element.className = 'system-section section-gap-top';

  // Build task rows for core daily habits
  const coreTasksHtml = dueList.map((task) => {
    const isDone = Boolean(state.dailyResponsibilities[task.id]?.completed);
    const xp = task.xp || 15;
    const catLabel = task.category || 'Daily';
    return `
      <div class="task-item ${isDone ? 'is-completed' : ''}" data-id="${task.id}" data-type="core" role="button" aria-pressed="${isDone}">
        <div class="task-left">
          <div class="task-checkbox ${isDone ? 'checked' : ''}"></div>
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

  // Build task rows for custom tasks
  const customTasksHtml = customTasks.map((task) => {
    const isDone = Boolean(task.completed);
    const catTag = task.tag || task.category || 'Custom';
    return `
      <div class="task-item ${isDone ? 'is-completed' : ''}" data-id="${task.id}" data-type="custom" role="button" aria-pressed="${isDone}">
        <div class="task-left">
          <div class="task-checkbox ${isDone ? 'checked' : ''}"></div>
          <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">
            <span class="task-label">${task.name}</span>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span class="category-pill pill-neutral">${catTag}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <span class="task-xp-tag">+${task.xp}</span>
          <button class="task-remove-btn" data-remove-id="${task.id}" title="Remove task" aria-label="Remove ${task.name}">x</button>
        </div>
      </div>
    `;
  }).join('');

  // Recreation status bar
  const rec = state.recreation;
  let recText = 'Finish your habits to unlock free time';
  if (rec.isUnlocked) {
    recText = rec.source === 'SIDE_QUEST_QUALIFIED'
      ? 'Daily challenge done — you\'ve earned your leisure'
      : 'All done — guilt-free recreation earned';
  }

  element.innerHTML = `
    <div class="section-label" style="margin-bottom: 8px;">Today's Habits</div>
    <div class="card" style="padding: 20px 22px 18px;">

      <!-- Progress header -->
      <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px;">
        <div style="display: flex; align-items: baseline; gap: 7px;">
          <span style="font-family: var(--font-mono); font-size: 22px; font-weight: 500; letter-spacing: -0.04em; color: var(--color-text-primary); line-height: 1;">${totalComplete}</span>
          <span style="font-size: 13px; color: var(--color-text-secondary); font-weight: 400; letter-spacing: -0.005em;">of ${totalDue} completed</span>
        </div>
        <span class="status-badge ${allDone ? 'status-badge-unlocked' : 'status-badge-locked'}">
          ${allDone ? 'Complete' : `${progressPct}%`}
        </span>
      </div>

      <!-- Progress bar -->
      <div class="system-progress-track" style="margin-bottom: 16px;">
        <div class="system-progress-fill" style="width: ${progressPct}%;"></div>
      </div>

      <!-- Task list — scrollable -->
      <div class="responsibilities-scroll">
        <div class="responsibilities-list">
          ${coreTasksHtml}
          ${customTasksHtml}
          ${totalDue === 0 ? `<p style="font-size: 13px; color: var(--color-text-tertiary); padding: 12px 0; letter-spacing: -0.005em;">No habits scheduled. Add one below.</p>` : ''}
        </div>
      </div>

      <!-- Add task -->
      <div class="add-task-row">
        <input
          id="add-task-input"
          class="add-task-input"
          type="text"
          placeholder="Add a task — e.g. gym, cooked food, read..."
          maxlength="80"
          autocomplete="off"
        />
        <button id="add-task-btn" class="add-task-btn">Add</button>
      </div>

      <!-- Recreation state -->
      <div class="recreation-banner ${rec.isUnlocked ? 'unlocked' : 'locked'}" style="margin-top: 14px;">
        <span class="recreation-banner-text">${recText}</span>
        <span class="recreation-banner-label">${rec.isUnlocked ? 'Unlocked' : 'Locked'}</span>
      </div>
    </div>
  `;

  // Toggle core task
  element.querySelectorAll('.task-item[data-type="core"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-remove-btn')) return;
      haptics.impactLight();
      onToggle(row.dataset.id);
    });
  });

  // Toggle custom task
  element.querySelectorAll('.task-item[data-type="custom"]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-remove-btn')) return;
      haptics.impactLight();
      onToggleCustomTask(row.dataset.id);
    });
  });

  // Remove custom task
  element.querySelectorAll('.task-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      haptics.impactMedium();
      onRemoveTask(btn.dataset.removeId);
    });
  });

  // Add task
  const input = element.querySelector('#add-task-input');
  const addBtn = element.querySelector('#add-task-btn');

  function submitTask() {
    const val = input.value.trim();
    if (val) {
      haptics.impactLight();
      onAddTask(val);
      input.value = '';
    }
  }

  addBtn.addEventListener('click', submitTask);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTask();
  });

  return element;
}

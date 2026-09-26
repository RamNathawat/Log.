import { RecurrenceEngine } from '../engine/recurrenceEngine.js';
import { StorageService } from '../state/StorageService.js';
import { dbSync } from '../state/DatabaseSyncService.js';
import { haptics } from '../services/hapticsService.js';
import { renderExemptionModal } from './ExemptionModal.js';
import { renderTradeModal } from './TradeModal.js';
import { renderTradeRequestCards } from './TradeRequestCard.js';

export function renderDueResponsibilities(
  state,
  onToggle,
  onAddTask,
  onRemoveTask,
  onToggleCustomTask,
  onPostponeTask,
  onPostponeCoreTask,
  onUnskipTask,
  onUnskipCoreTask,
  onExemptTask,
  onUnexemptTask,
  onSendTrade,
  onRespondTrade,
  onCancelTrade
) {
  const profile = state.profile || 'ram';
  const dueList = RecurrenceEngine.getDueResponsibilities(undefined, profile);
  const customTasks = state.customTasks || [];
  const postponedCore = state.postponedCoreTasks || {};
  const exemptions = state.taskExemptions || {};
  const delegated = state.delegatedTasks || {};

  // Active actionable tasks due today (excluding postponed, exempt, or delegated tasks)
  const activeCore = dueList.filter(item => !postponedCore[item.id] && !exemptions[item.id] && !delegated[item.id]);
  const activeCustom = customTasks.filter(t => !t.postponed && !exemptions[t.id] && !delegated[t.id]);

  const completedCore = activeCore.filter((item) => state.dailyResponsibilities[item.id]?.completed).length;
  const completedCustom = activeCustom.filter(t => t.completed).length;
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

  // ── Helper: unified status pill for both task types ─────────────────────
  function getTaskStatusPill(taskId, isCore, postponedDays, isPostponed, isTradePending) {
    if (isTradePending) {
      return `<span class="postpone-pill" style="font-style:italic;opacity:0.85;">awaiting response…</span>`;
    }

    if (exemptions[taskId]) {
      const reason = exemptions[taskId].reason || 'Exempt';
      return `<span class="postpone-pill">exempt: ${reason}</span>`;
    }

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

  // ── Core task rows (Delegated tasks are removed from the active list) ───────
  const coreTasksHtml = dueList
    .filter(task => !delegated[task.id])
    .map((task) => {
      const isDone = Boolean(state.dailyResponsibilities[task.id]?.completed);
      const xp = task.xp || 15;
      const catLabel = task.category || 'Daily';
      const isPostponed = Boolean(postponedCore[task.id]);
      const isExempt = Boolean(exemptions[task.id]);
      const isTradePending = (state.trades || []).some(t => 
        (t.status === 'PENDING' || t.status === 'COUNTER_OFFER') && 
        t.fromUser === state.syncKey && 
        t.taskId === task.id
      );
      const days = postponedCore[task.id]?.postponedDays || 0;
      const uClass = isTradePending 
        ? 'is-trade-pending' 
        : isExempt 
          ? 'is-exempt' 
          : !isPostponed 
            ? '' 
            : days <= 1 ? 'postpone-1' : 'postpone-2';
      const pill = getTaskStatusPill(task.id, true, days, isPostponed, isTradePending);

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

  // ── Custom task rows (Delegated tasks are removed from the active list) ─────
  const customTasksHtml = customTasks
    .filter(task => !delegated[task.id])
    .map((task) => {
      const isDone = Boolean(task.completed);
      const isTraded = Boolean(task.isTraded);
      const catTag = isTraded ? 'Traded' : (task.tag || task.category || 'Custom');
      const days = task.postponedDays || 0;
      const isPostponed = Boolean(task.postponed);
      const isExempt = Boolean(exemptions[task.id]);
      const isTradePending = (state.trades || []).some(t => 
        (t.status === 'PENDING' || t.status === 'COUNTER_OFFER') && 
        t.fromUser === state.syncKey && 
        t.taskId === task.id
      );
      const uClass = isTradePending 
        ? 'is-trade-pending' 
        : isExempt 
          ? 'is-exempt' 
          : !isPostponed 
            ? '' 
            : days <= 1 ? 'postpone-1' : 'postpone-2';
      const pill = getTaskStatusPill(task.id, false, days, isPostponed, isTradePending);

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
            ${(!isTraded && !isTradePending) ? `
              <button class="task-remove-btn" data-remove-id="${task.id}" title="Remove task" aria-label="Remove ${task.name}">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </button>
            ` : ''}
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
    <!-- Pending Sibling Trade Cards -->
    <div id="trade-requests-mount"></div>

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

  // Render incoming trade cards
  const tradeMount = element.querySelector('#trade-requests-mount');
  const availableTasksForSwap = [...dueList, ...customTasks].filter(t => 
    t.isTradeable !== false && 
    t.id !== 'reading' && 
    t.id !== 'workout' && 
    !t.id.startsWith('reading') && 
    !t.id.startsWith('workout') && 
    !state.dailyResponsibilities[t.id]?.completed && 
    !t.completed &&
    !delegated[t.id]
  );
  const tradeCardsEl = renderTradeRequestCards(
    state.trades || [],
    state.syncKey,
    availableTasksForSwap,
    onRespondTrade,
    null
  );
  if (tradeCardsEl) {
    tradeMount.appendChild(tradeCardsEl);
  }

  // ── Bottom action sheet for task options ──────────────────────────────────
  function showPostponeSheet(taskId, type) {
    const isCore = type === 'core';
    const coreTask = isCore ? dueList.find(t => t.id === taskId) : null;
    const customTask = isCore ? null : customTasks.find(t => t.id === taskId);
    const taskObj = coreTask || customTask || { id: taskId, name: taskId };

    const isDone = isCore
      ? Boolean(state.dailyResponsibilities[taskId]?.completed)
      : Boolean(customTask?.completed);

    // Only show for unchecked tasks
    if (isDone) return;

    const isAlreadyPostponed = isCore
      ? Boolean(postponedCore[taskId])
      : Boolean(customTask?.postponed);

    const isExempt = Boolean(exemptions[taskId]);
    const taskName = taskObj.name || taskId;

    // Personal growth habits (Reading & Exercise) cannot be traded
    const isTradeable = isCore
      ? (coreTask?.isTradeable !== false && taskId !== 'reading' && taskId !== 'workout')
      : true;

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
              <span class="action-sheet-item-label">Skip for today</span>
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

        <div class="action-sheet-divider"></div>

        <!-- Justified Exemption (0 Penalty) -->
        ${!isExempt ? `
          <button class="action-sheet-item" id="as-exempt">
            <div class="action-sheet-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label">Exempt / Valid Reason</span>
              <span class="action-sheet-item-sub">Mom cooked, injury, supply issue (0 penalty)</span>
            </div>
          </button>
        ` : `
          <button class="action-sheet-item" id="as-unexempt">
            <div class="action-sheet-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label">Remove Exemption</span>
              <span class="action-sheet-item-sub">Return task to active due list</span>
            </div>
          </button>
        `}

        <!-- Trade / Swap with Sibling -->
        ${isTradeable ? `
          <div class="action-sheet-divider"></div>
          <button class="action-sheet-item" id="as-trade">
            <div class="action-sheet-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l4-4M17 20l-4-4"/>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label">Trade / Swap Task</span>
              <span class="action-sheet-item-sub">Offer note or swap task with sibling</span>
            </div>
          </button>
        ` : ''}

        ${!isCore ? `
          <div class="action-sheet-divider"></div>
          <button class="action-sheet-item action-sheet-item--destructive" id="as-delete">
            <div class="action-sheet-item-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <div class="action-sheet-item-text">
              <span class="action-sheet-item-label">Delete task</span>
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

    sheet.querySelector('#as-exempt')?.addEventListener('click', () => {
      close();
      renderExemptionModal(taskObj, type, onExemptTask, null);
    });

    sheet.querySelector('#as-unexempt')?.addEventListener('click', () => {
      close();
      haptics.impactLight?.();
      onUnexemptTask(taskId);
    });

    sheet.querySelector('#as-trade')?.addEventListener('click', () => {
      close();

      // Priority: Firestore-cached sibling snapshot (works cross-device)
      // Fallback: localStorage (same-device testing only)
      let siblingAvailableTasks = dbSync.getSiblingSnapshot() || [];

      if (siblingAvailableTasks.length === 0) {
        // Same-device fallback
        const siblingProfile = (profile === 'sister') ? 'ram' : 'sister';
        const siblingCoreDue = RecurrenceEngine.getDueResponsibilities(undefined, siblingProfile)
          .filter(t => t.isTradeable !== false && t.id !== 'reading' && t.id !== 'workout');
        const siblingState = StorageService.load(siblingProfile);
        const siblingCustom = (siblingState?.customTasks || [])
          .filter(t => !t.completed && t.isTradeable !== false);
        siblingAvailableTasks = [
          ...siblingCoreDue.map(t => ({ id: t.id, name: t.name, category: t.category || 'Core Habit' })),
          ...siblingCustom.map(t => ({ id: t.id, name: t.name, category: t.category || 'Custom Habit' }))
        ];
      }

      renderTradeModal(taskObj, type, siblingAvailableTasks, onSendTrade, null, false);
    });

    sheet.querySelector('#as-delete')?.addEventListener('click', () => {
      close();
      haptics.impactMedium?.();
      onRemoveTask(taskId);
    });
  }

  // ── Bottom sheet for managing a pending trade proposal ──────────────────
  function showPendingTradeSheet(taskId, type) {
    const pendingTrade = (state.trades || []).find(t => 
      (t.status === 'PENDING' || t.status === 'COUNTER_OFFER') && 
      t.fromUser === state.syncKey && 
      t.taskId === taskId
    );
    if (!pendingTrade) return;

    document.querySelectorAll('.action-sheet-backdrop').forEach(b => b.remove());

    const backdrop = document.createElement('div');
    backdrop.className = 'action-sheet-backdrop';

    const sheet = document.createElement('div');
    sheet.className = 'action-sheet';
    sheet.innerHTML = `
      <div class="action-sheet-handle"></div>
      <div class="action-sheet-title">Trade Sent</div>

      <div style="padding: 4px 0 16px;">
        <div style="font-size: 16px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; margin-bottom: 6px;">
          ${pendingTrade.taskName}
        </div>
        <div style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.5;">
          ${pendingTrade.swapTaskName
            ? `Proposed to swap with <strong style="color:var(--color-text-primary)">${pendingTrade.swapTaskName}</strong>.`
            : 'Trade offer sent — waiting for sibling to respond.'}
          ${pendingTrade.note ? `<br/><span style="color:var(--color-text-primary);font-style:italic;margin-top:4px;display:block;">Note: "${pendingTrade.note}"</span>` : ''}
        </div>
      </div>

      <div class="action-sheet-list">
        <button class="action-sheet-item action-sheet-item--destructive" id="as-cancel-trade-proposal">
          <div class="action-sheet-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <div class="action-sheet-item-text">
            <span class="action-sheet-item-label">Withdraw Trade Offer</span>
            <span class="action-sheet-item-sub">Cancels the proposal and returns task to your list</span>
          </div>
        </button>
      </div>

      <button class="action-sheet-cancel" id="as-close-pending-trade">Keep Waiting</button>
    `;

    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);

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
    sheet.querySelector('#as-close-pending-trade').addEventListener('click', close);

    sheet.querySelector('#as-cancel-trade-proposal').addEventListener('click', () => {
      close();
      haptics.impactMedium?.();
      if (onCancelTrade) {
        onCancelTrade(pendingTrade.id);
      }
    });
  }

  // ── Attach interactions to ALL task rows ───────────────────────────────────
  function attachTaskEvents(row, type) {
    let pressTimer = null;
    let didLongPress = false;
    let lastLongPressTime = 0;
    let startX = 0, startY = 0;
    const THRESHOLD = 12;

    // Desktop: right-click → postpone sheet (suppressed if touch long-press just fired)
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Date.now() - lastLongPressTime < 800) return; // Prevent double trigger from touch
      didLongPress = true;
      lastLongPressTime = Date.now();
      if (row.classList.contains('is-trade-pending')) {
        showPendingTradeSheet(row.dataset.id, type);
      } else {
        showPostponeSheet(row.dataset.id, type);
      }
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
        if (row.classList.contains('is-trade-pending')) {
          showPendingTradeSheet(row.dataset.id, type);
        } else {
          showPostponeSheet(row.dataset.id, type);
        }
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

    // Normal click = toggle (or open pending trade sheet if pending)
    row.addEventListener('click', (e) => {
      if (e.target.closest('.task-remove-btn')) return;
      if (didLongPress || Date.now() - lastLongPressTime < 400) return;
      if (row.classList.contains('is-trade-pending')) {
        showPendingTradeSheet(row.dataset.id, type);
        return;
      }
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

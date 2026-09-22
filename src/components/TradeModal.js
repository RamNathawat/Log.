import { haptics } from '../services/hapticsService.js';

export function renderTradeModal(task, type, availableSwapTasks, onSendTrade, onClose, isCounterOffer = false) {
  const backdrop = document.createElement('div');
  backdrop.className = 'action-sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'action-sheet';
  sheet.style.maxHeight = '92vh';
  sheet.style.overflowY = 'auto';

  const swapOptionsHtml = (availableSwapTasks || []).map(t => `
    <option value="${t.id}" data-name="${t.name}">
      ${t.name} (${t.category || 'Chore'})
    </option>
  `).join('');

  sheet.innerHTML = `
    <div class="action-sheet-handle"></div>
    <div class="action-sheet-title" style="margin-bottom: 12px;">${isCounterOffer ? 'Counter Proposal' : 'Propose Task Trade'}</div>

    <!-- Active Task Summary Card -->
    <div style="background: var(--color-surface-subtle); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--color-border-subtle); margin-bottom: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
        <span style="font-size: 10px; font-family: var(--font-mono); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-tertiary);">
          Task to Trade Away
        </span>
        <span class="task-xp-tag">+${task.xp || 15}</span>
      </div>
      <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.01em;">
        ${task.name}
      </div>
    </div>

    <!-- 1. Task Swap Selection (ABOVE NOTE) -->
    ${availableSwapTasks && availableSwapTasks.length > 0 ? `
      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
        <label for="trade-swap-select" style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
          1. Swap for Sibling's Task (Optional)
        </label>
        <div style="position: relative; width: 100%;">
          <select id="trade-swap-select" class="add-task-input-v2" style="width: 100%; box-sizing: border-box; background: var(--color-surface); color: var(--color-text-primary); cursor: pointer; padding-right: 32px; appearance: none; -webkit-appearance: none;">
            <option value="">-- No direct task swap (Favor note only) --</option>
            ${swapOptionsHtml}
          </select>
          <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--color-text-tertiary);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 2. Favor / Note Input -->
    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;">
      <label for="trade-note-input" style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
        2. Offer / Note in Return
      </label>
      <input type="text" id="trade-note-input" class="add-task-input-v2"
             placeholder="e.g. I'll make coffee tomorrow / cook dinner" maxlength="100" autocomplete="off"
             style="width: 100%; box-sizing: border-box;"/>
    </div>

    <div style="display: flex; gap: 8px;">
      <button id="btn-send-trade" class="btn-primary" style="flex: 1; padding: 13px 16px; font-size: 13.5px; font-weight: 600;">
        ${isCounterOffer ? 'Send Counter Proposal' : 'Send Trade Proposal'}
      </button>
      <button id="btn-cancel-trade" class="action-sheet-cancel" style="margin-top: 0; width: auto; padding: 0 16px;">
        Cancel
      </button>
    </div>
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
    setTimeout(() => {
      backdrop.remove();
      if (onClose) onClose();
    }, 320);
  }

  const noteInput = sheet.querySelector('#trade-note-input');
  const swapSelect = sheet.querySelector('#trade-swap-select');

  sheet.querySelector('#btn-send-trade').addEventListener('click', () => {
    const note = noteInput.value.trim();
    let swapTaskId = null;
    let swapTaskName = null;

    if (swapSelect && swapSelect.value) {
      swapTaskId = swapSelect.value;
      const opt = swapSelect.options[swapSelect.selectedIndex];
      swapTaskName = opt.getAttribute('data-name');
    }

    if (!note && !swapTaskId) {
      noteInput.focus();
      return;
    }

    haptics.impactMedium?.();
    close();
    onSendTrade({
      taskId: task.id,
      taskName: task.name,
      type,
      note,
      swapTaskId,
      swapTaskName
    });
  });

  sheet.querySelector('#btn-cancel-trade').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return backdrop;
}

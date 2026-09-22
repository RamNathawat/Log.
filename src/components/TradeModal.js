import { haptics } from '../services/hapticsService.js';

export function renderTradeModal(task, type, availableSwapTasks, onSendTrade, onClose, isCounterOffer = false) {
  const backdrop = document.createElement('div');
  backdrop.className = 'action-sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'action-sheet';
  sheet.style.maxHeight = '90vh';
  sheet.style.overflowY = 'auto';

  const swapOptionsHtml = (availableSwapTasks || []).map(t => `
    <option value="${t.id}" data-name="${t.name}">
      ${t.name} (${t.category || 'Habit'})
    </option>
  `).join('');

  sheet.innerHTML = `
    <div class="action-sheet-handle"></div>
    <div class="action-sheet-title">${isCounterOffer ? 'Counter Proposal' : 'Sibling Task Trade'}</div>

    <div style="padding: 4px 0 16px;">
      <div style="font-size: 16px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; margin-bottom: 4px;">
        ${task.name}
      </div>
      <div style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
        ${isCounterOffer
          ? 'Propose an alternate favor or pick a different task to swap.'
          : 'Request your sibling to handle this task today. Add an offer note or propose a direct task swap.'}
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
      <label for="trade-note-input" style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
        Offer / Note in Return
      </label>
      <input type="text" id="trade-note-input" class="add-task-input-v2"
             placeholder="e.g. I'll make coffee tomorrow / cook dinner" maxlength="100" autocomplete="off"
             style="width: 100%; box-sizing: border-box;"/>
    </div>

    ${availableSwapTasks && availableSwapTasks.length > 0 ? `
      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
        <label for="trade-swap-select" style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
          ${isCounterOffer ? 'Swap for Different Task (Optional)' : "Swap for Sibling's Task (Optional)"}
        </label>
        <select id="trade-swap-select" class="add-task-input-v2" style="width: 100%; box-sizing: border-box; background: var(--color-surface); color: var(--color-text-primary); cursor: pointer;">
          <option value="">-- No direct swap (Note / Favor only) --</option>
          ${swapOptionsHtml}
        </select>
      </div>
    ` : ''}

    <div style="display: flex; gap: 8px;">
      <button id="btn-send-trade" class="btn-primary" style="flex: 1; padding: 14px; font-size: 14px; font-weight: 600;">
        ${isCounterOffer ? 'Send Counter-Proposal' : 'Send Trade Proposal'}
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

import { haptics } from '../services/hapticsService.js';

export function renderExemptionModal(task, type, onExempt, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'action-sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'action-sheet';
  sheet.style.maxHeight = '90vh';
  sheet.style.overflowY = 'auto';

  const reasonChips = [
    { label: 'Mom / Family handled', category: 'Family' },
    { label: 'Cut / Physical injury', category: 'Injury' },
    { label: 'Unwell / Rest day', category: 'Health' },
    { label: 'Supply / Water issue', category: 'Utility' },
    { label: 'Already completed earlier', category: 'Handled' }
  ];

  sheet.innerHTML = `
    <div class="action-sheet-handle"></div>
    <div class="action-sheet-title">Justified Exemption</div>

    <div style="padding: 4px 0 16px;">
      <div style="font-size: 16px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; margin-bottom: 4px;">
        ${task.name}
      </div>
      <div style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
        Legitimate reasons (e.g. family helped, physical injury, supplies off) waive the discipline penalty with zero WIL/LIFE loss.
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
      <label style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
        Quick Reasons
      </label>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;" id="exemption-chips">
        ${reasonChips.map(r => `
          <button type="button" class="exemption-chip" data-reason="${r.label}" data-cat="${r.category}">
            ${r.label}
          </button>
        `).join('')}
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px;">
      <label for="exemption-reason-input" style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
        Reason Details
      </label>
      <input type="text" id="exemption-reason-input" class="add-task-input-v2"
             placeholder="e.g. Cut on finger / Mom cooked food" maxlength="80" autocomplete="off"
             style="width: 100%; box-sizing: border-box;"/>
    </div>

    <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border-subtle); border-radius: 12px; padding: 10px 14px; margin-bottom: 16px;">
      <div style="font-size: 12px; color: var(--color-text-tertiary); line-height: 1.4;">
        <strong style="color: var(--color-text-primary);">Accountability check:</strong> Protect your streak for genuine reasons. Misuse undermines personal discipline.
      </div>
    </div>

    <div style="display: flex; gap: 8px;">
      <button id="btn-submit-exemption" class="btn-primary" style="flex: 1; padding: 14px; font-size: 14px; font-weight: 600;">
        Apply Exemption (0 Penalty)
      </button>
      <button id="btn-cancel-exemption" class="action-sheet-cancel" style="margin-top: 0; width: auto; padding: 0 16px;">
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

  const reasonInput = sheet.querySelector('#exemption-reason-input');
  let selectedCategory = 'General';

  sheet.querySelectorAll('.exemption-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      haptics.impactLight?.();
      sheet.querySelectorAll('.exemption-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      reasonInput.value = chip.dataset.reason;
      selectedCategory = chip.dataset.cat;
    });
  });

  sheet.querySelector('#btn-submit-exemption').addEventListener('click', () => {
    const reason = reasonInput.value.trim();
    if (!reason) {
      reasonInput.focus();
      return;
    }
    haptics.impactMedium?.();
    close();
    onExempt(task.id, type, { reason, category: selectedCategory });
  });

  sheet.querySelector('#btn-cancel-exemption').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return backdrop;
}

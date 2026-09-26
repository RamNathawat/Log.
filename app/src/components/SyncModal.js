import { haptics } from '../services/hapticsService.js';

export function renderSyncModal(state, onSync, onSwitchProfile, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal-content';

  const currentProfile = state?.profile || 'ram';
  const currentKey = state?.syncKey || 'OS2290';

  modal.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Cloud Sync</h2>
      <p style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
        Each account is isolated to its own sync key. Only traded tasks are shared.
      </p>
    </div>

    <!-- Current active account info -->
    <div style="background: var(--color-surface-subtle); border-radius: 14px; padding: 12px 16px; margin-top: 14px; border: 1.5px solid var(--color-border-subtle);">
      <div style="font-size: 10px; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-text-tertiary); margin-bottom: 6px;">Active Account</div>
      <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.01em;">${state?.character?.name || (currentProfile === 'sister' ? 'Sister' : 'Ram')}</div>
      <div style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-secondary); margin-top: 2px;">${currentKey}</div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 14px;">
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label for="sync-key" class="section-label">Your Device Sync Key</label>
        <p style="font-size: 12px; color: var(--color-text-tertiary); margin-bottom: 2px;">
          Enter <strong style="font-family: var(--font-mono); color: var(--color-text-secondary);">OS2290</strong> on Ram's device, or <strong style="font-family: var(--font-mono); color: var(--color-text-secondary);">OS1837</strong> on Sister's device.
        </p>
        <input type="text" id="sync-key" class="add-task-input-v2"
               value="${currentKey}"
               placeholder="OS2290 / OS1837"
               style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 600; letter-spacing: 0.04em;" autocomplete="off">
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label for="sibling-sync-key" class="section-label">Linked Sibling Key (For Real-Time Trades)</label>
        <input type="text" id="sibling-sync-key" class="add-task-input-v2"
               value="${state?.siblingSyncKey || (currentProfile === 'sister' ? 'OS2290' : 'OS1837')}"
               placeholder="${currentProfile === 'sister' ? 'OS2290' : 'OS1837'}"
               style="text-transform: uppercase; font-family: var(--font-mono); font-weight: 600; letter-spacing: 0.04em;" autocomplete="off">
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 6px;">
        <button id="btn-start-sync" class="btn-primary" style="flex: 1; padding: 12px; font-size: 13.5px; font-weight: 600;">Save &amp; Link Device</button>
        <button id="btn-close" class="btn-secondary" style="padding: 12px 16px;">Close</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);

  const keyInput = modal.querySelector('#sync-key');
  const sibInput = modal.querySelector('#sibling-sync-key');

  keyInput.addEventListener('input', () => {
    const val = keyInput.value.trim().toUpperCase();
    if (val === 'OS1837') {
      sibInput.value = 'OS2290';
    } else if (val === 'OS2290') {
      sibInput.value = 'OS1837';
    }
  });

  modal.querySelector('#btn-start-sync').addEventListener('click', () => {
    const key = keyInput.value.trim().toUpperCase();
    const sibKey = sibInput.value.trim().toUpperCase();

    if (key.length < 4) {
      alert('Please enter a valid Sync Key (min 4 characters).');
      return;
    }

    haptics.impactMedium?.();

    // Auto-detect profile from the known sync keys
    let newProfile = null;
    if (key === 'OS2290') newProfile = 'ram';
    else if (key === 'OS1837') newProfile = 'sister';

    // If the profile changed, switch it first (loads separate state namespace)
    if (newProfile && newProfile !== currentProfile) {
      if (onSwitchProfile) onSwitchProfile(newProfile);
    }

    // Then apply sync keys and start cloud sync
    onSync(key, sibKey);
    onClose();
  });

  modal.querySelector('#btn-close').addEventListener('click', onClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose();
  });

  return backdrop;
}

export function renderSyncModal(onSync, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal-content';

  modal.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Cloud Sync</h2>
      <p style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.4;">
        Enter your Personal Sync Key to synchronize your progress across devices. 
        If you haven't set one up, choose a unique 6-character code.
      </p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 8px;">
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label for="sync-key" class="section-label">Sync Key</label>
        <input type="text" id="sync-key" class="add-task-input" placeholder="e.g. OS-8824" style="text-transform: uppercase;" autocomplete="off">
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button id="btn-start-sync" class="btn-primary" style="flex: 1;">Start Sync</button>
        <button id="btn-close" class="btn-secondary">Cancel</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);

  const input = modal.querySelector('#sync-key');
  
  modal.querySelector('#btn-start-sync').addEventListener('click', () => {
    const key = input.value.trim().toUpperCase();
    if (key.length >= 4) {
      onSync(key);
      onClose();
    } else {
      alert("Please enter a valid Sync Key (min 4 characters).");
    }
  });

  modal.querySelector('#btn-close').addEventListener('click', () => {
    onClose();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose();
  });

  return backdrop;
}

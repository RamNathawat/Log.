const INPUT_STYLE = `
  width: 76px;
  padding: 8px 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  background: var(--color-surface-card);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
`;

export function renderAccountabilityModal(evaluation, onClose) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';

  modal.innerHTML = `
    <div class="modal-content">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="telemetry" style="margin-bottom: 4px;">Daily Reflection</div>
          <div style="font-size: 19px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; color: var(--color-text-primary);">
            Today's Review
          </div>
        </div>
        <button id="modal-close" class="btn-ghost" style="font-size: 14px; padding: 6px 10px; border-radius: var(--radius-sm);">Close</button>
      </div>

      <!-- Message -->
      <div class="card-inset" style="border-left: 3px solid ${evaluation.isBadDay ? 'var(--color-danger)' : 'var(--color-text-primary)'};">
        <p style="font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin: 0; line-height: 1.5;">
          "${evaluation.message}"
        </p>
      </div>

      <!-- Stats -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
          <span style="font-size: 13px; color: var(--color-text-secondary);">Daily habits completed</span>
          <span style="font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--color-text-primary);">
            ${evaluation.completedCount} / ${evaluation.totalDue}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: var(--border-hairline);">
          <span style="font-size: 13px; color: var(--color-text-secondary);">Daily momentum</span>
          <span class="status-badge ${evaluation.isBadDay ? '' : 'status-badge-unlocked'}" style="${evaluation.isBadDay ? 'border-color: var(--color-danger); color: var(--color-danger);' : ''}">
            ${evaluation.isBadDay ? 'Rebuilding' : 'Maintained'}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-top: var(--border-hairline);">
          <span style="font-size: 13px; color: var(--color-text-secondary);">Character progression</span>
          <span class="telemetry-dark">Safely Saved</span>
        </div>
      </div>

      <button id="modal-ack" class="btn-primary" style="width: 100%; margin-top: 4px;">
        Acknowledge
      </button>
    </div>
  `;

  modal.querySelector('#modal-close').addEventListener('click', onClose);
  modal.querySelector('#modal-ack').addEventListener('click', onClose);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) onClose();
  });

  return modal;
}

export function renderCalibrationModal(baseline, onSave, onClose) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';

  const fields = [
    { name: 'pushups',      label: 'Max Push-ups',          val: baseline.pushups,      min: 1,  max: 200 },
    { name: 'pullups',      label: 'Max Pull-ups',           val: baseline.pullups,      min: 0,  max: 100 },
    { name: 'squats',       label: 'Max Squats',             val: baseline.squats,       min: 5,  max: 300 },
    { name: 'plankSeconds', label: 'Plank Hold (sec)',       val: baseline.plankSeconds, min: 10, max: 600 },
    { name: 'readingPages', label: 'Reading (pages/day)',    val: baseline.readingPages, min: 1,  max: 200 }
  ];

  modal.innerHTML = `
    <div class="modal-content">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="telemetry" style="margin-bottom: 4px;">Setup</div>
          <div style="font-size: 19px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; color: var(--color-text-primary);">
            Baseline Calibration
          </div>
        </div>
        <button id="modal-close" class="btn-ghost" style="font-size: 14px; padding: 6px 10px; border-radius: var(--radius-sm);">Close</button>
      </div>

      <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.5;">
        Set your actual capability baseline. Directives scale dynamically against these values.
      </p>

      <form id="calibration-form" style="display: flex; flex-direction: column; gap: 8px;">
        ${fields.map(f => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--color-surface-subtle); border-radius: var(--radius-md); border: 1.5px solid var(--color-border);">
            <label style="font-size: 13px; color: var(--color-text-primary); font-weight: 500;">${f.label}</label>
            <input
              type="number"
              name="${f.name}"
              value="${f.val}"
              min="${f.min}"
              max="${f.max}"
              style="${INPUT_STYLE}"
            />
          </div>
        `).join('')}

        <button type="submit" class="btn-primary" style="margin-top: 8px; width: 100%;">
          Save Baseline
        </button>
      </form>
    </div>
  `;

  modal.querySelector('#modal-close').addEventListener('click', onClose);
  modal.querySelector('#calibration-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSave({
      pushups: parseInt(formData.get('pushups'), 10) || 20,
      pullups: parseInt(formData.get('pullups'), 10) || 5,
      squats: parseInt(formData.get('squats'), 10) || 25,
      plankSeconds: parseInt(formData.get('plankSeconds'), 10) || 60,
      readingPages: parseInt(formData.get('readingPages'), 10) || 10
    });
    onClose();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) onClose();
  });

  return modal;
}

export function renderRecreationState(state) {
  const rec = state.recreation;
  const isUnlocked = rec.isUnlocked;

  const element = document.createElement('section');
  element.className = 'system-section recreation-state';

  let sourceText = 'Complete all due responsibilities';
  if (rec.source === 'SIDE_QUEST_QUALIFIED') {
    sourceText = 'Qualifying directive fulfilled';
  } else if (rec.source === 'ALL_CORE_COMPLETE') {
    sourceText = 'All core responsibilities completed';
  }

  element.innerHTML = `
    <div class="card" style="padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; transition: all var(--transition-smooth);">
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <div class="telemetry" style="margin-bottom: 2px;">Recreation</div>
        <p style="font-size: 13px; color: ${isUnlocked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}; margin: 0; line-height: 1.4; font-weight: ${isUnlocked ? '500' : '400'};">
          ${isUnlocked
            ? sourceText
            : 'Fulfill all core responsibilities or a qualifying directive.'}
        </p>
      </div>
      <div style="flex-shrink: 0;">
        <span class="status-badge ${isUnlocked ? 'status-badge-unlocked' : 'status-badge-locked'}">
          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.7;"></span>
          ${isUnlocked ? 'Unlocked' : 'Locked'}
        </span>
      </div>
    </div>
  `;

  return element;
}

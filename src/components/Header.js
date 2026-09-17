import { audio } from '../services/audioService.js';
import { notifier } from '../services/notificationService.js';

export function renderHeader(state, onAction) {
  const dateObj = state.date ? new Date(state.date + 'T12:00:00') : new Date();
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const streak = state.stats?.currentStreak || 0;

  const element = document.createElement('header');
  element.className = 'system-section';

  element.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 2px 6px;">
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <div style="font-size: 20px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.03em; line-height: 1.1;">
          ${dateStr}
        </div>
        <div class="telemetry" style="margin-top: 2px;">
          ${streak > 0 ? `${streak} day streak` : 'No active streak'}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; padding-top: 4px;">
        <button id="btn-sync" class="btn-ghost" title="Cloud Sync">Sync</button>
        <button id="btn-calibrate" class="btn-ghost" title="Personal Baseline Targets">Baseline</button>
        <button id="btn-eval" class="btn-ghost" title="Review Today's Execution">Review</button>
      </div>
    </div>
  `;

  element.querySelector('#btn-sync').addEventListener('click', () => {
    onAction('OPEN_SYNC');
  });

  element.querySelector('#btn-calibrate').addEventListener('click', () => {
    onAction('OPEN_CALIBRATE');
  });

  element.querySelector('#btn-eval').addEventListener('click', () => {
    onAction('OPEN_EVAL');
  });

  return element;
}

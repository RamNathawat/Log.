import { ChallengeEngine } from '../engine/challengeEngine.js';
import { store } from '../state/store.js';
import { haptics } from '../services/hapticsService.js';

export function renderSideQuestDirective(state, onAction) {
  const currentPeriod = store.getCurrentPeriod();
  const isPending = currentPeriod.includes('-PENDING');
  const quest = isPending ? null : ChallengeEngine.generatePeriodQuest(currentPeriod, state.baseline);
  const questStatus = state.sideQuestState?.status || 'AVAILABLE';

  const element = document.createElement('section');
  element.className = 'system-section section-gap-top';

  if (isPending || !quest) {
    element.innerHTML = `
      <div class="challenge-card card">
        <div class="challenge-meta-row">
          <span class="section-label">Daily Challenge</span>
          <span class="telemetry">Standby</span>
        </div>
        <div class="challenge-empty">
          <div class="challenge-empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="challenge-empty-title">No Active Challenge</div>
          <p class="challenge-empty-sub">Issued at random between 06:00 – 00:00. Stay ready.</p>
        </div>
      </div>
    `;
    return element;
  }

  // ── Action area ──────────────────────────────────────────────────────────
  let actionHtml = '';

  if (questStatus === 'AVAILABLE') {
    actionHtml = `
      <div class="challenge-actions">
        <button id="btn-accept-quest" class="btn-primary" style="flex: 1;">Accept Challenge</button>
        <button id="btn-decline-quest" class="challenge-pass-btn">Pass</button>
      </div>
      <p class="challenge-micro-note">A commitment to yourself — passing is neutral.</p>
    `;
  } else if (questStatus === 'ACCEPTED') {
    actionHtml = `
      <div class="challenge-commitment-bar">
        <div class="challenge-commitment-dot"></div>
        <span>Commitment active — self-promise in effect</span>
      </div>
      <div class="challenge-actions" style="margin-top: 10px;">
        <button id="btn-complete-quest" class="btn-primary" style="flex: 1;">Mark Complete</button>
        <button id="btn-fail-quest" class="challenge-pass-btn">Didn't Finish</button>
      </div>
    `;
  } else if (questStatus === 'COMPLETED') {
    actionHtml = `
      <div class="challenge-result challenge-result--success">
        <div class="challenge-result-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="challenge-result-text">
          <div class="challenge-result-title">Challenge Completed</div>
          <div class="challenge-result-sub">Promise kept. Personal discipline reinforced.</div>
        </div>
      </div>
    `;
  } else if (questStatus === 'FAILED') {
    actionHtml = `
      <div class="challenge-result challenge-result--fail">
        <div class="challenge-result-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <div class="challenge-result-text">
          <div class="challenge-result-title">Not Completed</div>
          <div class="challenge-result-sub">Tomorrow brings a fresh challenge and a clean start.</div>
        </div>
      </div>
    `;
  } else if (questStatus === 'DECLINED') {
    actionHtml = `
      <div class="challenge-result">
        <div class="challenge-result-icon" style="opacity: 0.45;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
        <div class="challenge-result-text">
          <div class="challenge-result-title">Passed</div>
          <div class="challenge-result-sub">Zero penalty. Focus on your daily habits today.</div>
        </div>
      </div>
    `;
  }

  const periodLabel = quest.period && quest.period.endsWith('CHALLENGE_1') ? 'Challenge 1' : 'Challenge 2';

  element.innerHTML = `
    <div class="challenge-card card">
      <!-- Top meta row -->
      <div class="challenge-meta-row">
        <span class="section-label">Daily Challenge</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="challenge-period-badge">${periodLabel}</span>
        </div>
      </div>

      <!-- Reward badges -->
      <div class="challenge-badges">
        <span class="challenge-badge">+${quest.attribute}</span>
        <span class="challenge-badge">${quest.rewardLabel}</span>
      </div>

      <!-- Quest title + description -->
      <div class="challenge-title">${quest.title}</div>
      <p class="challenge-description">${quest.description}</p>

      <!-- Divider -->
      <div style="height: 1px; background: var(--color-border-subtle); margin: 18px 0;"></div>

      ${actionHtml}
    </div>
  `;

  element.querySelector('#btn-accept-quest')?.addEventListener('click', () => {
    haptics.impactMedium();
    onAction('ACCEPT_QUEST');
  });
  element.querySelector('#btn-decline-quest')?.addEventListener('click', () => {
    haptics.impactLight();
    onAction('DECLINE_QUEST');
  });
  element.querySelector('#btn-complete-quest')?.addEventListener('click', () => {
    haptics.notificationSuccess();
    onAction('COMPLETE_QUEST');
  });
  element.querySelector('#btn-fail-quest')?.addEventListener('click', () => {
    haptics.notificationWarning();
    onAction('FAIL_QUEST');
  });

  return element;
}

import { ChallengeEngine } from '../engine/challengeEngine.js';
import { store } from '../state/store.js';

export function renderSideQuestDirective(state, onAction) {
  const currentPeriod = store.getCurrentPeriod();
  const isPending = currentPeriod.includes('-PENDING');
  const quest = isPending ? null : ChallengeEngine.generatePeriodQuest(currentPeriod, state.baseline);
  const questStatus = state.sideQuestState?.status || 'AVAILABLE';

  const element = document.createElement('section');
  element.className = 'system-section section-gap-top';

  if (isPending || !quest) {
    element.innerHTML = `
      <div class="section-label" style="margin-bottom: 8px;">Daily Challenge</div>
      <div class="card" style="padding: 20px 22px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <span class="telemetry">Monitoring for Signals</span>
          <span class="telemetry">Standby</span>
        </div>
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 18px; font-weight: 700; color: var(--color-text-secondary); margin-bottom: 8px;">No Active Directives</div>
          <p style="font-size: 13.5px; color: var(--color-text-tertiary); margin: 0; line-height: 1.55;">
            Challenges are issued at random intervals between 06:00 and 00:00. Maintain readiness.
          </p>
        </div>
      </div>
    `;
    return element;
  }

  // Action area
  let actionHtml = '';

  if (questStatus === 'AVAILABLE') {
    actionHtml = `
      <div style="display: flex; gap: 8px; margin-top: 18px;">
        <button id="btn-accept-quest" class="btn-primary" style="flex: 1;">Accept Challenge</button>
        <button id="btn-decline-quest" class="btn-secondary" style="padding: 12px 18px;">Pass</button>
      </div>
      <p class="telemetry" style="margin-top: 10px; text-align: center;">Accepting is a commitment to yourself. Passing is neutral.</p>
    `;
  } else if (questStatus === 'ACCEPTED') {
    actionHtml = `
      <div class="commitment-bar" style="margin-top: 16px;">
        <span class="telemetry-dark">Commitment Active — Self-promise in effect</span>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 10px;">
        <button id="btn-complete-quest" class="btn-primary" style="flex: 1;">Mark Completed</button>
        <button id="btn-fail-quest" class="btn-secondary" style="padding: 12px 18px;">Did Not Finish</button>
      </div>
    `;
  } else if (questStatus === 'COMPLETED') {
    actionHtml = `
      <div class="card-inset" style="margin-top: 16px; border-left: 3px solid var(--color-text-primary);">
        <div class="telemetry-dark" style="margin-bottom: 4px; font-weight: 700;">Challenge Completed</div>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.5;">
          Promise kept. Personal discipline reinforced.
        </p>
      </div>
    `;
  } else if (questStatus === 'FAILED') {
    actionHtml = `
      <div class="card-inset" style="margin-top: 16px; border-left: 3px solid var(--color-danger);">
        <div class="telemetry" style="color: var(--color-danger); margin-bottom: 4px; font-weight: 700;">Challenge Incomplete</div>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.5;">
          Tomorrow brings a fresh challenge and a clean start.
        </p>
      </div>
    `;
  } else if (questStatus === 'DECLINED') {
    actionHtml = `
      <div class="card-inset" style="margin-top: 16px;">
        <div class="telemetry" style="margin-bottom: 4px; font-weight: 700;">Challenge Passed</div>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.5;">
          Zero penalty. Focus on honoring your daily habits today.
        </p>
      </div>
    `;
  }

  // Top row of card
  const periodLabel = quest.period && quest.period.endsWith('CHALLENGE_1') ? 'First Challenge' : 'Second Challenge';
  const topRowHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
      <span class="telemetry">${periodLabel}</span>
      <span class="telemetry">Randomly Intercepted</span>
    </div>
  `;

  element.innerHTML = `
    <div class="section-label" style="margin-bottom: 8px;">Daily Challenge</div>
    <div class="card" style="padding: 20px 22px;">
      ${topRowHtml}

      <!-- Attribute + reward tags -->
      <div style="display: flex; gap: 6px; margin-bottom: 12px;">
        <span class="status-badge status-badge-locked">+${quest.attribute}</span>
        <span class="status-badge status-badge-locked">${quest.rewardLabel}</span>
      </div>

      <!-- Quest title -->
      <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.15; color: var(--color-text-primary); margin-bottom: 8px;">
        ${quest.title}
      </div>
      <p style="font-size: 13.5px; color: var(--color-text-secondary); margin: 0; line-height: 1.55;">
        ${quest.description}
      </p>

      ${actionHtml}
    </div>
  `;

  element.querySelector('#btn-accept-quest')?.addEventListener('click', () => onAction('ACCEPT_QUEST'));
  element.querySelector('#btn-decline-quest')?.addEventListener('click', () => onAction('DECLINE_QUEST'));
  element.querySelector('#btn-complete-quest')?.addEventListener('click', () => onAction('COMPLETE_QUEST'));
  element.querySelector('#btn-fail-quest')?.addEventListener('click', () => onAction('FAIL_QUEST'));

  return element;
}

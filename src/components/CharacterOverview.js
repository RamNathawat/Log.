import { ProgressionEngine } from '../engine/progressionEngine.js';

export function renderCharacterOverview(state) {
  const char = state.character;
  const xpNeeded = ProgressionEngine.getXpRequiredForLevel(char.level);
  const xpPercent = Math.min(100, Math.round((char.xp / xpNeeded) * 100));
  const xpRemaining = xpNeeded - char.xp;

  const streak = state.stats?.currentStreak || 0;
  const daysLogged = state.stats?.totalDaysTracked || 0;
  const longestStreak = state.stats?.longestStreak || 0;

  const element = document.createElement('section');
  element.className = 'system-section';

  element.innerHTML = `
    <!-- Hero: Character Level + XP Progress (Apple Squircle Card) -->
    <div class="card hero-level-card">
      <div class="hero-level-row">
        <div>
          <div class="section-label" style="margin-bottom: 8px;">Character Level</div>
          <div class="hero-level-number">${String(char.level).padStart(2, '0')}</div>
        </div>
        <div class="hero-level-meta">
          <div class="hero-xp-display">
            ${char.xp.toLocaleString()}<span style="font-size: 13px; font-weight: 400; color: var(--color-text-tertiary); letter-spacing: -0.01em;"> / ${xpNeeded.toLocaleString()}</span>
          </div>
          <div class="hero-xp-sub">
            XP &middot; ${xpRemaining.toLocaleString()} to next level
          </div>
        </div>
      </div>

      <!-- XP progress bar -->
      <div>
        <div class="system-progress-track">
          <div class="system-progress-fill" style="width: ${xpPercent}%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span class="telemetry">Progress to Level ${char.level + 1}</span>
          <span class="telemetry-dark">${xpPercent}%</span>
        </div>
      </div>

      <!-- Clean editorial telemetry line (Replaces clunky stat boxes) -->
      <div class="hero-telemetry-ribbon">
        <span class="hero-ribbon-item">Streak <span class="hero-ribbon-val">${streak}d</span></span>
        <span class="hero-ribbon-sep">&middot;</span>
        <span class="hero-ribbon-item">Logged <span class="hero-ribbon-val">${daysLogged}d</span></span>
        <span class="hero-ribbon-sep">&middot;</span>
        <span class="hero-ribbon-item">Best <span class="hero-ribbon-val">${longestStreak}d</span></span>
      </div>
    </div>
  `;

  return element;
}

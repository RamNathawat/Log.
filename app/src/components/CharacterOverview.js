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
    <div class="card hero-level-card">
      <div class="hero-level-row">
        <div>
          <div class="section-label" style="margin-bottom: 10px;">Level</div>
          <div class="hero-level-number">${String(char.level).padStart(2, '0')}</div>
        </div>
        <div class="hero-level-meta">
          <div class="hero-xp-display">
            ${char.xp.toLocaleString()}<span class="hero-xp-denom"> / ${xpNeeded.toLocaleString()}</span>
          </div>
          <div class="hero-xp-sub">XP to next level</div>
        </div>
      </div>

      <!-- XP progress bar -->
      <div class="hero-progress-wrap">
        <div class="system-progress-track">
          <div class="system-progress-fill" style="width: ${xpPercent}%;"></div>
        </div>
        <div class="hero-progress-pct">${xpPercent}%</div>
      </div>

      <!-- 3-column stat grid -->
      <div class="hero-stat-grid">
        <div class="hero-stat-col">
          <div class="hero-stat-label">Streak</div>
          <div class="hero-stat-value">${streak}d</div>
        </div>
        <div class="hero-stat-col hero-stat-col--center">
          <div class="hero-stat-label">Logged</div>
          <div class="hero-stat-value">${daysLogged}d</div>
        </div>
        <div class="hero-stat-col">
          <div class="hero-stat-label">Best</div>
          <div class="hero-stat-value">${longestStreak}d</div>
        </div>
      </div>
    </div>
  `;

  return element;
}

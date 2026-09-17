/**
 * StatsSection — Tracking, Streaks & Activity History
 * Shows streak counters, a 7-day completion heatmap, and recent history log.
 */
export function renderStatsSection(state) {
  const stats = state.stats || {};
  const currentStreak = stats.currentStreak || 0;
  const longestStreak = stats.longestStreak || 0;
  const totalDays = stats.totalDaysTracked || 0;
  const dailyLogs = stats.dailyLogs || {};

  // Build last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = dailyLogs[key];
    const isToday = i === 0;
    days.push({ key, log, isToday, dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() });
  }

  const heatmapHtml = days.map(({ key, log, isToday, dayLabel }) => {
    let rate = '0';
    let title = isToday ? 'Today' : key;

    if (log) {
      if (log.completionRate >= 100) rate = 'high';
      else if (log.completionRate >= 50) rate = 'mid';
      else if (log.completionRate > 0) rate = 'low';
      title = `${key}: ${log.completed}/${log.totalDue} (${log.completionRate}%)`;
    }

    const todayBorder = isToday ? 'border: 1.5px solid var(--color-text-primary);' : '';

    return `
      <div style="display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px;">
        <div class="heatmap-cell" data-rate="${rate}" title="${title}" style="${todayBorder} aspect-ratio: 1; width: 100%;"></div>
        <span class="heatmap-day-label">${dayLabel.slice(0, 2)}</span>
      </div>
    `;
  }).join('');

  // Recent history log — last 12 entries
  const recentHistory = (state.history || []).slice(0, 12);
  const historyHtml = recentHistory.map(entry => {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const dateStr = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    });
    return `
      <div class="history-entry">
        <span class="history-time">${dateStr}<br>${time}</span>
        <span class="history-text">${entry.text}</span>
      </div>
    `;
  }).join('');

  // Calculate today's completion rate
  const todayLog = dailyLogs[new Date().toISOString().slice(0, 10)];
  const todayRateText = todayLog
    ? `${todayLog.completionRate}% today`
    : 'No data yet';

  const element = document.createElement('section');
  element.className = 'system-section section-with-label section-gap-top';

  element.innerHTML = `
    <div class="section-label">Activity & Stats</div>
    <details class="card" style="padding: 0; cursor: default;">
      <summary style="padding: 18px 20px; cursor: pointer; outline: none; user-select: none; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 14px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em;">Progress Tracking</span>
        <span class="telemetry" id="stats-summary-toggle">View ↓</span>
      </summary>

      <div style="padding: 0 20px 20px; border-top: var(--border-hairline);">
        <!-- Stat cells -->
        <div class="stats-grid" style="margin-top: 16px;">
          <div class="stat-cell">
            <div class="stat-value">${currentStreak}</div>
            <div class="stat-label">Current Streak</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">${longestStreak}</div>
            <div class="stat-label">Best Streak</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value">${totalDays}</div>
            <div class="stat-label">Days Tracked</div>
          </div>
          <div class="stat-cell">
            <div class="stat-value" style="font-size: 16px; margin-top: 4px;">${todayRateText}</div>
            <div class="stat-label">Completion</div>
          </div>
        </div>

        <!-- 7-day heatmap -->
        <div style="margin-top: 20px;">
          <div class="telemetry" style="margin-bottom: 10px;">Last 7 Days</div>
          <div class="heatmap-row">
            ${heatmapHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
            <span class="telemetry">Less</span>
            <div class="heatmap-cell" data-rate="0" style="width: 14px; height: 14px; flex-shrink: 0; aspect-ratio: 1;"></div>
            <div class="heatmap-cell" data-rate="low" style="width: 14px; height: 14px; flex-shrink: 0; aspect-ratio: 1;"></div>
            <div class="heatmap-cell" data-rate="mid" style="width: 14px; height: 14px; flex-shrink: 0; aspect-ratio: 1;"></div>
            <div class="heatmap-cell" data-rate="high" style="width: 14px; height: 14px; flex-shrink: 0; aspect-ratio: 1;"></div>
            <span class="telemetry">More</span>
          </div>
        </div>

        <!-- History log -->
        <div style="margin-top: 20px;">
          <div class="telemetry" style="margin-bottom: 10px;">Recent Activity</div>
          <div class="history-list">
            ${historyHtml || '<div class="history-entry"><span class="history-text" style="color: var(--color-text-tertiary);">No activity yet.</span></div>'}
          </div>
        </div>
      </div>
    </details>
  `;

  // Update toggle label on open/close
  const details = element.querySelector('details');
  const toggleLabel = element.querySelector('#stats-summary-toggle');
  details.addEventListener('toggle', () => {
    toggleLabel.textContent = details.open ? 'Hide ↑' : 'View ↓';
  });

  return element;
}

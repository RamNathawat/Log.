import { RecurrenceEngine } from '../engine/recurrenceEngine.js';

/**
 * ProgressScreen — Redesigned to match screenshot v2
 * - Log. title with Progress subtitle and tagline
 * - 7D/30D/ALL filter pills (UI only)
 * - Overview: 4 inline stats
 * - Heatmap: same as before
 * - Attributes: SVG circular ring gauges in 3×2 grid
 * - Editorial quote
 */
export function renderProgressScreen(state) {
  const container = document.createElement('div');
  container.className = 'screen-view progress-screen';

  const stats = state.stats || {};
  const currentStreak = stats.currentStreak || 0;
  const longestStreak = stats.longestStreak || 0;
  const totalDays = stats.totalDaysTracked || 0;
  const dailyLogs = stats.dailyLogs || {};
  const char = state.character;

  const anchorDate = state.date ? new Date(state.date + 'T12:00:00') : new Date();

  // Live completion stats
  const dueToday = RecurrenceEngine.getDueResponsibilities(anchorDate);
  const customTasks = state.customTasks || [];
  const totalDueToday = dueToday.length + customTasks.length;
  const completedToday = dueToday.filter(item => state.dailyResponsibilities[item.id]?.completed).length
                       + customTasks.filter(t => t.completed).length;
  const liveTodayRate = totalDueToday > 0 ? Math.round((completedToday / totalDueToday) * 100) : 0;

  // 7-day history
  const days = [];
  let totalCompletionsLogged = 0;
  let daysWithLogs = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const isToday = (i === 0);
    let log = dailyLogs[key];

    if (isToday) {
      log = {
        totalDue: totalDueToday,
        completed: completedToday,
        completionRate: liveTodayRate
      };
    }

    if (log && log.totalDue > 0) {
      totalCompletionsLogged += log.completionRate;
      daysWithLogs++;
    }

    days.push({
      key,
      log,
      isToday,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dateNum: d.getDate()
    });
  }

  const avgCompletion = daysWithLogs > 0
    ? Math.round(totalCompletionsLogged / daysWithLogs)
    : liveTodayRate;

  // 7-Day Heatmap
  const heatmapHtml = days.map(({ log, isToday, dayName, dateNum }) => {
    let rate = '0';
    if (log) {
      if (log.completionRate >= 100) rate = 'high';
      else if (log.completionRate >= 50) rate = 'mid';
      else if (log.completionRate > 0) rate = 'low';
    }
    const activeBorder = isToday ? 'is-today' : '';
    return `
      <div class="heatmap-col" style="position: relative;">
        <div class="heatmap-square ${activeBorder}" data-rate="${rate}" tabindex="0">
          ${isToday ? '<span class="today-dot"></span>' : ''}
          <div class="heatmap-tooltip">
            ${log ? `${log.completed} tasks done` : '0 tasks done'}
          </div>
        </div>
        <span class="heatmap-day-text">${dayName.slice(0, 3)}</span>
        <span class="heatmap-date-num">${dateNum}</span>
      </div>
    `;
  }).join('');

  // Circular ring gauge helper
  function ringGauge(key, shortName, fullName, value, maxVal = 60) {
    const pct = Math.min(1, value / maxVal);
    const r = 30;
    const circ = 2 * Math.PI * r;
    const offset = circ - pct * circ;
    return `
      <div class="attr-ring-item">
        <div class="attr-ring-wrap">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle class="attr-ring-track" cx="38" cy="38" r="${r}" fill="none" stroke-width="5"/>
            <circle
              class="attr-ring-fill"
              cx="38" cy="38" r="${r}"
              fill="none"
              stroke-width="5"
              stroke-dasharray="${circ.toFixed(2)}"
              stroke-dashoffset="${offset.toFixed(2)}"
              transform="rotate(-90 38 38)"
            />
          </svg>
          <div class="attr-ring-value">${value.toFixed(1)}</div>
        </div>
        <div class="attr-ring-key">${shortName}</div>
        <div class="attr-ring-name">${fullName}</div>
      </div>
    `;
  }

  const attrRingsHtml = `
    <div class="attr-rings-grid">
      ${ringGauge('STR',      'STR',  'Strength',   char.attributes.STR)}
      ${ringGauge('INT',      'INT',  'Intellect',  char.attributes.INT)}
      ${ringGauge('WIL',      'WIL',  'Willpower',  char.attributes.WIL)}
      ${ringGauge('WORK',     'WORK', 'Career',     char.attributes.WORK)}
      ${ringGauge('LIFE',     'LIFE', 'Living',     char.attributes.LIFE)}
      ${ringGauge('RECOVERY', 'REC',  'Recovery',   char.attributes.RECOVERY)}
    </div>
  `;

  container.innerHTML = `
    <div class="progress-screen-header">
      <div class="progress-screen-subtitle">Progress</div>
      <div class="progress-screen-tagline">A longer view. Same you.</div>
    </div>

    <!-- Section 1: Overview stats -->
    <div class="system-section">
      <div class="card overview-stats-card">
        <div class="section-label" style="margin-bottom: 14px;">Overview</div>
        <div class="overview-stats-row">
          <div class="overview-stat">
            <div class="overview-stat-value">${currentStreak}</div>
            <div class="overview-stat-label">Streak</div>
            <div class="overview-stat-sub">Consecutive days</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-value">${totalDays}</div>
            <div class="overview-stat-label">Days logged</div>
            <div class="overview-stat-sub">Active platform days</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-value">${avgCompletion}%</div>
            <div class="overview-stat-label">Completion</div>
            <div class="overview-stat-sub">7-day average</div>
          </div>
          <div class="overview-stat">
            <div class="overview-stat-value">${longestStreak}</div>
            <div class="overview-stat-label">Best streak</div>
            <div class="overview-stat-sub">Longest run</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: 7-Day Execution Heatmap -->
    <div class="system-section section-gap-top">
      <div class="card" style="padding: 20px 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div class="section-label">Execution Heatmap</div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="telemetry">7 DAYS</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        <div class="heatmap-7-grid" style="margin-top: 16px;">
          ${heatmapHtml}
        </div>

        <div class="heatmap-legend">
          <span class="telemetry">Less</span>
          <div class="heatmap-legend-cell" data-rate="0"></div>
          <div class="heatmap-legend-cell" data-rate="low"></div>
          <div class="heatmap-legend-cell" data-rate="mid"></div>
          <div class="heatmap-legend-cell" data-rate="high"></div>
          <span class="telemetry">More</span>
        </div>
      </div>
    </div>

    <!-- Section 3: Attributes — circular ring gauges -->
    <div class="system-section section-gap-top">
      <div class="card" style="padding: 20px 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div class="section-label">Attributes</div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
        ${attrRingsHtml}

        <!-- Editorial quote -->
        <div class="progress-quote">
          "A more capable you, compounding daily."
        </div>
      </div>
    </div>
  `;

  return container;
}

import { RecurrenceEngine } from '../engine/recurrenceEngine.js';

/**
 * ProgressScreen — Dedicated Activity & Progress Tracking Screen
 * Editorial layout: 7-day consistency heatmap, core metrics,
 * attribute growth breakdown, life domain effort distribution, and activity timeline.
 * Zero emojis — pure typographic clarity and editorial polish.
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

  // Compute live completion stats for the active day
  const dueToday = RecurrenceEngine.getDueResponsibilities(anchorDate);
  const customTasks = state.customTasks || [];
  const totalDueToday = dueToday.length + customTasks.length;
  const completedToday = dueToday.filter(item => state.dailyResponsibilities[item.id]?.completed).length
                       + customTasks.filter(t => t.completed).length;
  const liveTodayRate = totalDueToday > 0 ? Math.round((completedToday / totalDueToday) * 100) : 0;

  // Compute 7-day history (past 7 days including today), anchored on state.date
  const days = [];
  let totalCompletionsLogged = 0;
  let daysWithLogs = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const isToday = (i === 0);
    let log = dailyLogs[key];

    // For active day, use live completion stats
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
      dateNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' })
    });
  }

  const avgCompletion = daysWithLogs > 0
    ? Math.round(totalCompletionsLogged / daysWithLogs)
    : liveTodayRate;

  // 7-Day Heatmap Cells
  const heatmapHtml = days.map(({ key, log, isToday, dayName, dateNum, monthName }) => {
    let rate = '0';
    let rateLabel = '0%';
    let detailText = 'No logs recorded';

    if (log) {
      if (log.completionRate >= 100) rate = 'high';
      else if (log.completionRate >= 50) rate = 'mid';
      else if (log.completionRate > 0) rate = 'low';
      rateLabel = `${log.completionRate}%`;
      detailText = `${log.completed}/${log.totalDue} habits`;
    }

    const activeBorder = isToday ? 'is-today' : '';

    return `
      <div class="heatmap-col" style="position: relative;">
        <div
          class="heatmap-square ${activeBorder}"
          data-rate="${rate}"
          tabindex="0"
        >
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

  // Attributes list
  const attributes = [
    { key: 'STR',      name: 'Physique & Strength',     val: char.attributes.STR,      desc: 'Physical endurance, athletic output, and strength training.' },
    { key: 'INT',      name: 'Intellect & Focus',        val: char.attributes.INT,      desc: 'Deep learning, reading volume, and cognitive expansion.' },
    { key: 'WIL',      name: 'Discipline & Willpower',   val: char.attributes.WIL,      desc: 'Honoring commitments, consistency, and daily execution.' },
    { key: 'WORK',     name: 'Career & Craft',           val: char.attributes.WORK,     desc: 'Professional engineering, high-leverage execution, and projects.' },
    { key: 'LIFE',     name: 'Living & Environment',     val: char.attributes.LIFE,     desc: 'Home order, culinary nutrition, relationships, and finance.' },
    { key: 'RECOVERY', name: 'Vitality & Restoration',   val: char.attributes.RECOVERY, desc: 'Restorative sleep, hydration, mindfulness, and recharge.' }
  ];

  // Category tally from completed history & custom tasks
  const categoryCounts = {};
  (state.customTasks || []).forEach(task => {
    const cat = task.category || 'General Focus';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + (task.completed ? 1 : 0);
  });

  const coreTasks = [
    { id: 'dishes', cat: 'Home & Living' },
    { id: 'laundry', cat: 'Home & Living' },
    { id: 'hang_clothes', cat: 'Home & Living' },
    { id: 'reading', cat: 'Learning & Mind' },
    { id: 'workout', cat: 'Fitness & Body' },
    { id: 'outreach', cat: 'Deep Work & Projects' }
  ];

  coreTasks.forEach(item => {
    if (state.dailyResponsibilities[item.id]?.completed) {
      categoryCounts[item.cat] = (categoryCounts[item.cat] || 0) + 1;
    }
  });

  const categoryEntries = Object.entries(categoryCounts);

  // Recent timeline log
  const recentLogs = (state.history || []).slice(0, 20);
  const timelineHtml = recentLogs.map(entry => {
    const d = new Date(entry.timestamp);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    let badgeClass = 'log-badge-default';
    if (entry.type?.includes('COMPLETE')) badgeClass = 'log-badge-success';
    if (entry.type?.includes('FAIL') || entry.type?.includes('PENALTY')) badgeClass = 'log-badge-danger';
    if (entry.type?.includes('QUEST') || entry.type?.includes('COMMITMENT')) badgeClass = 'log-badge-quest';

    return `
      <div class="timeline-item">
        <div class="timeline-time">
          <span class="timeline-date">${dateFormatted}</span>
          <span class="timeline-hour">${timeFormatted}</span>
        </div>
        <div class="timeline-indicator ${badgeClass}"></div>
        <div class="timeline-content">
          <span class="timeline-text">${entry.text}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Section 1: Overview Metric Cards (Editorial 4-cell grid) -->
    <div class="system-section">
      <div class="section-label"></div>
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label-top">Active Streak</span>
          <div class="metric-value">${currentStreak}</div>
          <div class="metric-label">Consecutive Days</div>
          <div class="metric-sub">${currentStreak > 0 ? 'Consistent daily execution' : 'Build today\'s streak'}</div>
        </div>
        <div class="metric-card">
          <span class="metric-label-top">Personal Best</span>
          <div class="metric-value">${longestStreak}</div>
          <div class="metric-label">Longest Streak</div>
          <div class="metric-sub">Peak execution record</div>
        </div>
        <div class="metric-card">
          <span class="metric-label-top">Telemetry</span>
          <div class="metric-value">${totalDays}</div>
          <div class="metric-label">Days Logged</div>
          <div class="metric-sub">Active platform days</div>
        </div>
        <div class="metric-card">
          <span class="metric-label-top">Target Rate</span>
          <div class="metric-value">${avgCompletion}%</div>
          <div class="metric-label">7-Day Completion</div>
          <div class="metric-sub">Average fulfillment rate</div>
        </div>
      </div>
    </div>

    <!-- Section 2: 7-Day Consistency Heatmap -->
    <div class="system-section section-gap-top">
      <div class="section-label">Past 7 Days</div>
      <div class="card" style="padding: 20px 22px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0;">Execution Heatmap</h3>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin: 2px 0 0;">Recent daily fulfillment intensity</p>
          </div>
          <span class="status-badge status-badge-locked">7 Days</span>
        </div>

        <div class="heatmap-7-grid">
          ${heatmapHtml}
        </div>

        <div class="heatmap-legend">
          <span class="telemetry">Zero</span>
          <div class="heatmap-legend-cell" data-rate="0"></div>
          <div class="heatmap-legend-cell" data-rate="low"></div>
          <div class="heatmap-legend-cell" data-rate="mid"></div>
          <div class="heatmap-legend-cell" data-rate="high"></div>
          <span class="telemetry">Complete</span>
        </div>
      </div>
    </div>

    <!-- Section 3: Attributes Growth Breakdown -->
    <div class="system-section section-gap-top">
      <div class="section-label">Character Foundation</div>
      <div class="card" style="padding: 20px 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0;">Attribute Breakdown</h3>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin: 2px 0 0;">Weighted distribution of real-world progression</p>
          </div>
          <span class="status-badge status-badge-unlocked">Level ${char.level}</span>
        </div>

        <div class="attributes-detailed-list">
          ${attributes.map(attr => {
            const pct = Math.min(100, Math.round((attr.val / 60) * 100));
            return `
              <div class="attribute-row">
                <div class="attribute-row-header">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="attribute-badge">${attr.key}</span>
                    <span class="attribute-title">${attr.name}</span>
                  </div>
                  <span class="attribute-score">${attr.val.toFixed(1)}</span>
                </div>
                <div class="attribute-progress-bar">
                  <div class="attribute-progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="attribute-desc">${attr.desc}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Section 4: Focus Domains Breakdown -->
    ${categoryEntries.length > 0 ? `
      <div class="system-section section-gap-top">
        <div class="section-label">Domain Allocation</div>
        <div class="card" style="padding: 20px 22px;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 12px;">Accomplishments by Category</h3>
          <div class="category-chips-grid">
            ${categoryEntries.map(([cat, count]) => `
              <div class="category-chip">
                <span class="category-chip-name">${cat}</span>
                <span class="category-chip-count">${count} finished</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Section 5: Activity Timeline -->
    <div class="system-section section-gap-top">
      <div class="section-label">Activity Log</div>
      <div class="card" style="padding: 20px 22px;">
        <h3 style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 14px;">Chronological History</h3>
        <div class="timeline-container">
          ${timelineHtml || '<p style="font-size: 13px; color: var(--color-text-tertiary); text-align: center; margin: 20px 0;">No telemetry recorded yet.</p>'}
        </div>
      </div>
    </div>
  `;

  return container;
}

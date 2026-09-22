import { RecurrenceEngine } from '../engine/recurrenceEngine.js';
import { CORE_RESPONSIBILITIES_CONFIG } from '../config/responsibilities.js';

// Build a lookup map: id -> { name, category }
const CORE_TASK_META = Object.fromEntries(
  CORE_RESPONSIBILITIES_CONFIG.map(r => [r.id, { name: r.name, category: r.category }])
);

/**
 * ProgressScreen — Review tab
 * - Overview stats
 * - 7-day heatmap
 * - Combined Attributes ↔ Accountability card (swipe or tap to switch)
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

  // ─── Live completion stats for today ─────────────────────────────────────
  const profile = state.profile || 'ram';
  const dueToday = RecurrenceEngine.getDueResponsibilities(anchorDate, profile);
  const customTasks = state.customTasks || [];
  const postponedCore = state.postponedCoreTasks || {};
  const exemptions = state.taskExemptions || {};
  const delegated = state.delegatedTasks || {};

  const activeDueToday = dueToday.filter(item => !postponedCore[item.id] && !exemptions[item.id] && !delegated[item.id]);
  const activeCustomToday = customTasks.filter(t => !t.postponed && !exemptions[t.id] && !delegated[t.id]);
  const totalDueToday = activeDueToday.length + activeCustomToday.length;
  const completedToday =
    activeDueToday.filter(item => state.dailyResponsibilities[item.id]?.completed).length
    + activeCustomToday.filter(t => t.completed).length;
  const liveTodayRate = totalDueToday > 0 ? Math.min(100, Math.round((completedToday / totalDueToday) * 100)) : 0;

  // ─── 7-day history ────────────────────────────────────────────────────────
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
      log = { totalDue: totalDueToday, completed: completedToday, completionRate: liveTodayRate };
    }

    if (log && log.totalDue > 0) {
      totalCompletionsLogged += log.completionRate;
      daysWithLogs++;
    }

    days.push({
      key, log, isToday,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dateNum: d.getDate()
    });
  }

  const avgCompletion = daysWithLogs > 0
    ? Math.round(totalCompletionsLogged / daysWithLogs)
    : liveTodayRate;

  // ─── NEGLECT ANALYSIS ─────────────────────────────────────────────────────
  const LOOKBACK_DAYS = 14;
  const missCount = {};

  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = dailyLogs[key];
    if (!log) continue;

    // Track total due days for each configured core habit
    CORE_RESPONSIBILITIES_CONFIG.forEach(task => {
      if (RecurrenceEngine.isDue(task, d)) {
        if (!missCount[task.id]) missCount[task.id] = { missed: 0, skipped: 0, due: 0 };
        missCount[task.id].due++;
      }
    });

    const missed = log.missedCoreIds || [];
    const skipped = log.skippedCoreIds || [];

    missed.forEach(id => {
      if (!missCount[id]) missCount[id] = { missed: 0, skipped: 0, due: 1 };
      missCount[id].missed++;
    });
    skipped.forEach(id => {
      if (!missCount[id]) missCount[id] = { missed: 0, skipped: 0, due: 1 };
      missCount[id].skipped++;
    });
  }

  const offenders = Object.entries(missCount)
    .filter(([, v]) => v.missed >= 2 && v.due > 0)
    .map(([id, v]) => {
      const completed = Math.max(0, v.due - v.missed);
      const completionPct = Math.round((completed / v.due) * 100);
      const missRate = Math.round((v.missed / v.due) * 100);
      return {
        id,
        name: CORE_TASK_META[id]?.name || id,
        category: CORE_TASK_META[id]?.category || 'Habit',
        missed: v.missed,
        skipped: v.skipped,
        due: v.due,
        completed,
        completionPct,
        missRate
      };
    })
    .sort((a, b) => b.missed - a.missed || b.missRate - a.missRate);

  function getSeverity(missed, missRate) {
    if (missed >= 5 || missRate >= 50) return 'critical';
    if (missed >= 3 || missRate >= 30) return 'warning';
    return 'info';
  }

  function getSeverityLabel(severity) {
    if (severity === 'critical') return 'CRITICAL';
    if (severity === 'warning') return 'FLAGGED';
    return 'WATCH';
  }

  function getNeglectMessage(taskName, missed, skipped, missRate) {
    if (missed >= 7) return `You haven't done this in over a week. That's a pattern.`;
    if (missed >= 5) return `Skipped ${missed} times recently. Your discipline here is slipping.`;
    if (skipped >= 3) return `Postponed ${skipped} times. Each skip cost you WIL and LIFE.`;
    if (missRate >= 70) return `Only done ${100 - missRate}% of the time. Well below standard.`;
    if (missed >= 3) return `Slipped ${missed} times in 14 days. Time to fix this.`;
    return `Inconsistently executed — ${missed} misses in 14 days.`;
  }

  const criticalCount = offenders.filter(o => getSeverity(o.missed, o.missRate) === 'critical').length;

  // Accountability panel heading status
  let acctStatusLabel, acctStatusLevel;
  if (offenders.length === 0) {
    acctStatusLabel = 'All Clear';
    acctStatusLevel = 'clean';
  } else if (criticalCount > 0) {
    acctStatusLabel = `${criticalCount} Critical`;
    acctStatusLevel = 'critical';
  } else {
    acctStatusLabel = `${offenders.length} Flagged`;
    acctStatusLevel = 'warning';
  }

  // ─── 7-Day Heatmap HTML ───────────────────────────────────────────────────
  const heatmapHtml = days.map(({ log, isToday, dayName, dateNum }) => {
    let rate = '0';
    if (log) {
      if (log.completionRate >= 100) rate = 'high';
      else if (log.completionRate >= 50) rate = 'mid';
      else if (log.completionRate > 0) rate = 'low';
    }
    return `
      <div class="heatmap-col">
        <div class="heatmap-square ${isToday ? 'is-today' : ''}" data-rate="${rate}" tabindex="0">
          ${isToday ? '<span class="today-dot"></span>' : ''}
          <div class="heatmap-tooltip">${log ? `${log.completed} tasks done` : '0 tasks done'}</div>
        </div>
        <span class="heatmap-day-text">${dayName.slice(0, 3)}</span>
        <span class="heatmap-date-num">${dateNum}</span>
      </div>
    `;
  }).join('');

  // ─── Offender rows (clean flat list) ────────────────────────────────────
  const offenderRowsHtml = offenders.length === 0 ? `
    <div class="acct-clean">
      <div class="acct-clean-check">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <div class="acct-clean-title">No habitual misses</div>
        <div class="acct-clean-sub">Clean execution over the last 14 days.</div>
      </div>
    </div>
  ` : offenders.map((o, idx) => {
    const severity = getSeverity(o.missed, o.missRate);
    const message = getNeglectMessage(o.name, o.missed, o.skipped, o.missRate);
    const isLast = idx === offenders.length - 1;

    // Calculate Growth / Stat impact
    const taskConfig = CORE_RESPONSIBILITIES_CONFIG.find(t => t.id === o.id);
    const attrImpacts = [];
    if (taskConfig?.attributes) {
      for (const [attr, weight] of Object.entries(taskConfig.attributes)) {
        const lostVal = (o.missed * weight).toFixed(1);
        attrImpacts.push(`-${lostVal} ${attr}`);
      }
    }
    const xpLost = o.missed * (taskConfig?.xp || 15);
    attrImpacts.push(`-${xpLost} XP`);
    const impactText = attrImpacts.join(' · ');

    // Calculate current consecutive recovery hits (moving backward from yesterday)
    let consecutiveHits = 0;
    for (let i = 1; i <= LOOKBACK_DAYS; i++) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const log = dailyLogs[key];
      if (!log) continue;

      const isDue = taskConfig ? RecurrenceEngine.isDue(taskConfig, d) : true;
      if (!isDue) continue; // skip non-due days

      const missed = (log.missedCoreIds || []).includes(o.id);
      if (missed) {
        break; // Streak broken
      } else {
        consecutiveHits++;
      }
    }

    const recoveryTarget = severity === 'critical' ? 5 : (severity === 'warning' ? 3 : 2);

    // Helper for circular recovery gauge
    function recoveryGauge(current, target) {
      const pct = Math.min(1, current / target);
      const r = 18;
      const circ = 2 * Math.PI * r;
      const offset = circ - pct * circ;
      const isComplete = current >= target;

      return `
        <div class="acct-recovery-gauge">
          <div class="acct-recovery-ring-wrap">
            <svg width="46" height="46" viewBox="0 0 46 46">
              <circle class="attr-ring-track" cx="23" cy="23" r="${r}" fill="none" stroke-width="3.5"/>
              <circle class="attr-ring-fill ${isComplete ? 'acct-ring-fill--complete' : ''}" cx="23" cy="23" r="${r}"
                fill="none" stroke-width="3.5"
                stroke-dasharray="${circ.toFixed(2)}"
                stroke-dashoffset="${offset.toFixed(2)}"
                transform="rotate(-90 23 23)"
              />
            </svg>
            <div class="acct-recovery-val">
              ${isComplete
                ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                : `${current}/${target}`}
            </div>
          </div>
          <div class="acct-recovery-lbl">${isComplete ? 'Cleared' : 'Recovery'}</div>
        </div>
      `;
    }

    return `
      <div class="acct-item${isLast ? '' : ' acct-item--divider'}">
        <div class="acct-item-accent acct-item-accent--${severity}"></div>
        <div class="acct-item-content">
          <!-- Left: Problem / Diagnosis -->
          <div class="acct-item-left">
            <div class="acct-item-title-group">
              <span class="acct-item-name">${o.name}</span>
              <span class="acct-item-meta">${o.category}</span>
            </div>
            <div class="acct-item-miss-stat">${o.missed} of ${o.due} missed in 14 days</div>
            <div class="acct-item-msg">${message}</div>
            
            ${consecutiveHits >= recoveryTarget
              ? `<div style="font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 5px; font-weight: 500;">✓ Flag cleared — keep it up.</div>`
              : `<div style="font-size: 11.5px; color: var(--color-text-tertiary); margin-top: 5px;">${recoveryTarget - consecutiveHits} more day${recoveryTarget - consecutiveHits !== 1 ? 's' : ''} in a row to clear this flag.</div>`
            }
            
            <button class="acct-impact-toggle" type="button" data-id="${o.id}">
              <span class="acct-impact-toggle-text">Impacted stats</span>
              <svg class="acct-toggle-chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="acct-impact-drawer" id="impact-drawer-${o.id}">
              <span class="acct-impact-chip-loss">${impactText}</span>
            </div>
          </div>

          <!-- Right: Solution / Recovery Ring Gauge -->
          <div class="acct-item-right">
            ${recoveryGauge(consecutiveHits, recoveryTarget)}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // ─── Circular ring gauge helper ────────────────────────────────────────────
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
            <circle class="attr-ring-fill" cx="38" cy="38" r="${r}"
              fill="none" stroke-width="5"
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

  // ─── Render ────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="progress-screen-header">
      <div class="progress-screen-subtitle">Review</div>
      <div class="progress-screen-tagline">Where you're at. Honestly.</div>
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
          <span class="telemetry">7 DAYS</span>
        </div>
        <div class="heatmap-7-grid" style="margin-top: 16px;">${heatmapHtml}</div>
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

    <!-- Section 3: Combined Attributes + Accountability (swipeable) -->
    <div class="system-section section-gap-top">
      <div class="card combined-card" id="combined-card" style="padding: 20px 22px 22px;">

        <!-- Tab bar -->
        <div class="combined-tabs" id="combined-tabs">
          <button class="combined-tab combined-tab--active" id="tab-attr" data-panel="0">Attributes</button>
          <button class="combined-tab" id="tab-acct" data-panel="1">
            Accountability
            ${offenders.length > 0 ? `<span class="acct-tab-dot acct-tab-dot--${acctStatusLevel}"></span>` : ''}
          </button>
          <!-- Sliding indicator -->
          <div class="combined-tab-indicator" id="tab-indicator"></div>
        </div>

        <!-- Sliding panel track -->
        <div class="combined-panels-clip" id="panels-clip">
          <div class="combined-panels-track" id="panels-track">

            <!-- Panel 0: Attributes -->
            <div class="combined-panel">
              ${attrRingsHtml}
              <div class="progress-quote">"A more capable you, compounding daily."</div>
            </div>

            <!-- Panel 1: Accountability -->
            <div class="combined-panel">
              <div class="acct-panel-header">
                <div class="acct-window-label">Past ${LOOKBACK_DAYS} days · Core habits</div>
                <span class="acct-status-chip acct-status--${acctStatusLevel}">${acctStatusLabel}</span>
              </div>
              <div class="acct-list">
                ${offenderRowsHtml}
              </div>
            </div>


          </div>
        </div>

        <!-- Pager dots -->
        <div class="combined-pager">
          <span class="pager-dot pager-dot--active" data-panel="0"></span>
          <span class="pager-dot" data-panel="1"></span>
        </div>
      </div>
    </div>
  `;

  // ─── Tab / Swipe interaction ──────────────────────────────────────────────
  const track    = container.querySelector('#panels-track');
  const tabs     = container.querySelectorAll('.combined-tab');
  const dots     = container.querySelectorAll('.pager-dot');
  const indicator = container.querySelector('#tab-indicator');
  const clip     = container.querySelector('#panels-clip');
  let activePanel = 0;

  function positionIndicator(tabEl) {
    const tabBar = container.querySelector('#combined-tabs');
    const barRect  = tabBar.getBoundingClientRect();
    const tabRect  = tabEl.getBoundingClientRect();
    indicator.style.width  = `${tabRect.width}px`;
    indicator.style.transform = `translateX(${tabRect.left - barRect.left}px)`;
  }

  function switchPanel(idx, animate = true) {
    activePanel = idx;
    track.style.transition = animate
      ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none';
    track.style.transform = `translateX(${-idx * 100}%)`;

    tabs.forEach((t, i) => t.classList.toggle('combined-tab--active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('pager-dot--active', i === idx));
    positionIndicator(tabs[idx]);
  }

  // Initial indicator position (after layout)
  requestAnimationFrame(() => positionIndicator(tabs[0]));

  // Tab clicks
  tabs.forEach((tab, i) => tab.addEventListener('click', () => switchPanel(i)));

  // Dot clicks
  dots.forEach((dot, i) => dot.addEventListener('click', () => switchPanel(i)));

  // Impact toggle clicks
  const impactToggles = container.querySelectorAll('.acct-impact-toggle');
  impactToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const drawer = container.querySelector(`#impact-drawer-${id}`);
      if (drawer) {
        const isOpen = drawer.classList.toggle('acct-impact-drawer--open');
        btn.classList.toggle('acct-impact-toggle--open', isOpen);
      }
    });
  });

  // ── Gestures: Touch & Pointer drag swipe ──────────────────────────────────
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let intentLocked = null; // 'h' | 'v' | null
  const PANELS = 2;

  // Window resize updates indicator width/position
  window.addEventListener('resize', () => {
    if (tabs[activePanel]) positionIndicator(tabs[activePanel]);
  });

  clip.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    intentLocked = null;
    track.style.transition = 'none';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!intentLocked) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        intentLocked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }

    if (intentLocked !== 'h') return;

    // We are swiping horizontally
    const clipWidth = clip.offsetWidth;
    let dampedDx = dx;
    if ((activePanel === 0 && dx > 0) || (activePanel === PANELS - 1 && dx < 0)) {
      dampedDx = dx * 0.22; // Rubber band resistance
    }

    const baseOffset = -activePanel * clipWidth;
    track.style.transform = `translateX(${baseOffset + dampedDx}px)`;
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;

    if (intentLocked !== 'h') {
      switchPanel(activePanel);
      return;
    }

    const dx = e.clientX - startX;
    const THRESHOLD = clip.offsetWidth * 0.22;

    if (dx < -THRESHOLD && activePanel < PANELS - 1) {
      switchPanel(activePanel + 1);
    } else if (dx > THRESHOLD && activePanel > 0) {
      switchPanel(activePanel - 1);
    } else {
      switchPanel(activePanel);
    }
  });

  return container;
}

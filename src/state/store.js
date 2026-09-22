import { CONFIG } from '../config/constants.js';
import { StorageService } from './StorageService.js';
import { getInitialState } from './initialData.js';
import { dbSync } from './DatabaseSyncService.js';
import { RecurrenceEngine } from '../engine/recurrenceEngine.js';
import { ChallengeEngine } from '../engine/challengeEngine.js';
import { ProgressionEngine } from '../engine/progressionEngine.js';
import { inferTaskWeight } from '../config/responsibilities.js';
import { audio } from '../services/audioService.js';
import { notifier } from '../services/notificationService.js';
import { haptics } from '../services/hapticsService.js';

class Store {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadState();

    // Migrate state shape for older saved states
    this.migrateState();

    this.ensureDateSync();
    setInterval(() => this.ensureDateSync(), 60000); // Check every minute for rollovers
  }

  loadState() {
    // Determine which profile is active (lightweight pointer key)
    const activeProfile = StorageService.getActiveProfile();
    const saved = StorageService.load(activeProfile);
    if (saved) return saved;
    // No saved state for this profile — create fresh
    const initial = getInitialState(activeProfile);
    StorageService.save(initial, activeProfile);
    StorageService.setActiveProfile(activeProfile);
    return initial;
  }

  /**
   * Migrate older saved state shapes to include new fields without data loss.
   */
  migrateState() {
    let dirty = false;

    if (!this.state.profile) {
      this.state.profile = 'ram';
      dirty = true;
    }
    if (!this.state.syncKey) {
      this.state.syncKey = this.state.profile === 'sister' ? 'OS1837' : 'OS2290';
      dirty = true;
    }
    if (!this.state.siblingSyncKey) {
      this.state.siblingSyncKey = this.state.profile === 'sister' ? 'OS2290' : 'OS1837';
      dirty = true;
    }
    if (!this.state.taskExemptions) {
      this.state.taskExemptions = {};
      dirty = true;
    }
    if (!this.state.trades) {
      this.state.trades = [];
      dirty = true;
    }
    if (!this.state.delegatedTasks) {
      this.state.delegatedTasks = {};
      dirty = true;
    }
    if (!this.state.customTasks) {
      this.state.customTasks = [];
      dirty = true;
    } else {
      // Ensure all existing custom tasks have postpone fields
      const migrated = this.state.customTasks.map(t => {
        if (t.postponedDays === undefined || t.postponed === undefined) {
          dirty = true;
          return { ...t, postponed: false, postponedDays: 0 };
        }
        return t;
      });
      if (dirty) this.state.customTasks = migrated;
    }
    if (!this.state.postponedCoreTasks) {
      this.state.postponedCoreTasks = {};
      dirty = true;
    }
    if (!this.state.stats) {
      this.state.stats = {
        currentStreak: 0,
        longestStreak: 0,
        totalDaysTracked: 0,
        dailyLogs: {}
      };
      dirty = true;
    }
    if (!this.state.stats.dailyLogs) {
      this.state.stats.dailyLogs = {};
      dirty = true;
    }

    if (dirty) {
      StorageService.save(this.state, this.state.profile);
      StorageService.setActiveProfile(this.state.profile);
    }

    this._syncAcceptedTradesToState();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    StorageService.save(this.state, this.state.profile);
    StorageService.setActiveProfile(this.state.profile);
    dbSync.pushState(this.state);
    for (const listener of this.listeners) {
      listener(this.state);
    }
    // Debounce task snapshot push so sibling always has current data
    // without hammering Firestore on every render cycle.
    clearTimeout(this._snapshotPushTimer);
    this._snapshotPushTimer = setTimeout(() => this._pushMyTaskSnapshot(), 2000);
  }

  setUserProfile(profile) {
    const targetProfile = profile === 'sister' ? 'sister' : 'ram';

    // 1. Save the CURRENT profile's state before switching
    StorageService.save(this.state, this.state.profile);

    // 2. Load the target profile's existing state, or create fresh
    const existingState = StorageService.load(targetProfile);
    if (existingState) {
      this.state = existingState;
    } else {
      this.state = getInitialState(targetProfile);
    }

    // 3. Ensure profile meta is correct
    this.state.profile = targetProfile;
    this.state.syncKey = targetProfile === 'sister' ? 'OS1837' : 'OS2290';
    this.state.siblingSyncKey = targetProfile === 'sister' ? 'OS2290' : 'OS1837';

    // 4. Persist and notify
    StorageService.setActiveProfile(targetProfile);
    this.migrateState();
    this.ensureDateSync();
    this.addLog('PROFILE_ACTIVE', `Account loaded: ${this.state.character?.name || targetProfile} (${this.state.syncKey})`);
    this.notify();
    this.startCloudSync(this.state.syncKey, this.state.siblingSyncKey);
  }

  setSyncKeys(myKey, siblingKey) {
    if (myKey) this.state.syncKey = myKey.toUpperCase();
    if (siblingKey) this.state.siblingSyncKey = siblingKey.toUpperCase();
    this.notify();
    this.startCloudSync(this.state.syncKey, this.state.siblingSyncKey);
  }

  startCloudSync(syncKey, siblingKey = this.state.siblingSyncKey) {
    const myKey = syncKey || this.state.syncKey;
    const sibKey = siblingKey || this.state.siblingSyncKey;

    dbSync.startSync(
      myKey,
      sibKey,
      (remoteState) => {
        // Only merge remote state if it belongs to the current active profile
        // (prevents sibling's Firestore doc from contaminating this device)
        if (remoteState.profile && remoteState.profile !== this.state.profile) {
          console.info('[Store] Ignored remote state for different profile:', remoteState.profile);
          return;
        }
        this.state = { ...this.state, ...remoteState };
        StorageService.save(this.state, this.state.profile);
        StorageService.setActiveProfile(this.state.profile);
        for (const listener of this.listeners) {
          listener(this.state);
        }
      },
      (tradeChannelData) => {
        // Trade channel is the ONLY cross-profile shared data
        if (!tradeChannelData) return;
        const channelTrades = tradeChannelData.trades || [];
        this.state.trades = channelTrades;
        this._syncAcceptedTradesToState();
        StorageService.save(this.state, this.state.profile);
        for (const listener of this.listeners) {
          listener(this.state);
        }
      }
    );
    // Push a fresh task snapshot so sibling can see our tasks immediately
    setTimeout(() => this._pushMyTaskSnapshot(), 1500);
  }

  getCurrentPeriod() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const times = ChallengeEngine.getDailyChallengeTimes(todayStr);

    if (now < times[0]) return `${todayStr}-PENDING_1`;
    if (now >= times[0] && now < times[1]) return `${todayStr}-CHALLENGE_1`;
    return `${todayStr}-CHALLENGE_2`;
  }

  ensureDateSync() {
    const todayStr = new Date().toISOString().slice(0, 10);
    let changed = false;

    if (this.state.date !== todayStr) {
      this.rolloverToDate(todayStr);
      changed = true;
    }

    const currentPeriod = this.getCurrentPeriod();
    if (this.state.sideQuestState?.date !== currentPeriod) {
      this.rolloverToPeriod(currentPeriod);
      changed = true;
    }

    if (changed) {
      this.notify();
    }
  }

  rolloverToPeriod(targetPeriod) {
    const isPending = targetPeriod.includes('-PENDING');

    this.state.sideQuestState = {
      date: targetPeriod,
      status: isPending ? 'PENDING' : 'AVAILABLE',
      acceptedAt: null,
      resolvedAt: null
    };

    if (!isPending) {
      const newQuest = ChallengeEngine.generatePeriodQuest(targetPeriod, this.state.baseline);
      if (newQuest) {
        notifier.send('New Challenge', {
          body: newQuest.title
        });
        this.addLog('SYSTEM', `New Challenge issued: ${newQuest.title}`);
      }
    }
  }

  /**
   * Records stats for the specified date before rolling over to the next day.
   * Also tracks which specific core task IDs were missed for neglect analysis.
   */
  _recordDayStats(dateStr) {
    if (!this.state.stats) {
      this.state.stats = { currentStreak: 0, longestStreak: 0, totalDaysTracked: 0, dailyLogs: {} };
    }
    if (!this.state.stats.dailyLogs) {
      this.state.stats.dailyLogs = {};
    }

    const targetDate = new Date(dateStr + 'T12:00:00');
    const profile = this.state.profile || 'ram';
    const dueList = RecurrenceEngine.getDueResponsibilities(targetDate, profile);
    const customTasks = this.state.customTasks || [];
    const totalDue = dueList.length + customTasks.length;

    const completedCore = dueList.filter(item => this.state.dailyResponsibilities[item.id]?.completed).length;
    const completedCustom = customTasks.filter(t => t.completed).length;
    const totalCompleted = completedCore + completedCustom;

    const completionRate = totalDue > 0 ? Math.round((totalCompleted / totalDue) * 100) : 0;
    const questStatus = this.state.sideQuestState?.status || 'AVAILABLE';

    // Track which specific core task IDs were due but NOT completed
    const missedCoreIds = dueList
      .filter(item => !this.state.dailyResponsibilities[item.id]?.completed)
      .map(item => item.id);

    // Track which core task IDs were explicitly postponed (skipped)
    const skippedCoreIds = Object.keys(this.state.postponedCoreTasks || {});

    this.state.stats.dailyLogs[dateStr] = {
      totalDue,
      completed: totalCompleted,
      completionRate,
      questStatus,
      missedCoreIds,     // due but not done (missed + skipped combined)
      skippedCoreIds     // explicitly postponed
    };

    this.state.stats.totalDaysTracked = Object.keys(this.state.stats.dailyLogs).length;

    // Streak calculation: count as streak day if completionRate >= 50% or at least 1 habit completed
    if (totalCompleted > 0) {
      this.state.stats.currentStreak = (this.state.stats.currentStreak || 0) + 1;
      if (this.state.stats.currentStreak > (this.state.stats.longestStreak || 0)) {
        this.state.stats.longestStreak = this.state.stats.currentStreak;
      }
    } else {
      this.state.stats.currentStreak = 0;
    }
  }

  /**
   * Rolls over state from this.state.date to targetDateStr.
   * Records stats for the prior date, fills in any inactive gap days,
   * unchecks daily habits and custom tasks for the new day,
   * and preserves all permanent character attributes, level, XP, and history.
   */
  rolloverToDate(targetDateStr) {
    const prevDate = this.state.date;

    // Record stats for the day that just concluded
    this._recordDayStats(prevDate);

    // Calculate gap days between prevDate and targetDateStr
    const prevTime = new Date(prevDate + 'T12:00:00').getTime();
    const targetTime = new Date(targetDateStr + 'T12:00:00').getTime();
    const dayMs = 86400000;
    const diffDays = Math.round((targetTime - prevTime) / dayMs);

    if (diffDays > 1) {
      // User was away for multiple days; log gap days as 0% completion and break streak
      for (let i = 1; i < diffDays; i++) {
        const gapDate = new Date(prevTime + i * dayMs).toISOString().slice(0, 10);
        this.state.stats.dailyLogs[gapDate] = {
          totalDue: 0,
          completed: 0,
          questStatus: 'UNOPENED',
          completionRate: 0
        };
        this.state.stats.totalDaysTracked += 1;
      }
      this.state.stats.currentStreak = 0;
    }

    // Rollover to new date
    this.state.date = targetDateStr;

    // Core tasks: increment postponedDays for any that weren't completed, clear completed ones
    const prevDailyResp = this.state.dailyResponsibilities || {};
    const updatedPostponedCore = {};
    for (const [id, info] of Object.entries(this.state.postponedCoreTasks || {})) {
      const wasCompleted = prevDailyResp[id]?.completed;
      if (!wasCompleted) {
        // Still unfinished — escalate urgency
        updatedPostponedCore[id] = { postponedDays: (info.postponedDays || 1) + 1 };
      }
      // If completed: drop it (urgency resets)
    }
    this.state.postponedCoreTasks = updatedPostponedCore;

    this.state.dailyResponsibilities = {};

    // Custom tasks: carry over postponed ones, drop everything else
    const carried = (this.state.customTasks || [])
      .filter(t => t.postponed && !t.completed)
      .map(t => ({
        ...t,
        completed: false,
        completedAt: null,
        postponedDays: (t.postponedDays || 1) + 1,
        postponed: false
      }));

    this.state.customTasks = carried;

    this.state.recreation = {
      isUnlocked: false,
      source: null,
      unlockedAt: null
    };

    this.addLog('DATE_ROLLOVER', `Date transitioned to ${targetDateStr}. ${carried.length} custom + ${Object.keys(updatedPostponedCore).length} core task(s) carried forward.`);
  }

  /**
   * Advances the calendar by 1 day for testing day-to-day persistence.
   */
  simulateNextDay() {
    const cur = new Date(this.state.date + 'T12:00:00');
    cur.setDate(cur.getDate() + 1);
    const nextDateStr = cur.toISOString().slice(0, 10);
    this.rolloverToDate(nextDateStr);
    this.notify();
  }

  addLog(type, text) {
    const entry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      text
    };
    this.state.history.unshift(entry);
    // Keep max 100 log entries
    if (this.state.history.length > 100) {
      this.state.history = this.state.history.slice(0, 100);
    }
  }

  // --- CORE RESPONSIBILITIES ---
  toggleResponsibility(id) {
    const current = this.state.dailyResponsibilities[id];
    const isCompleted = !current?.completed;

    const record = {
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      verified: false,
      verificationType: 'manual',
      evidence: null
    };

    this.state.dailyResponsibilities = {
      ...this.state.dailyResponsibilities,
      [id]: record
    };

    if (isCompleted) {
      // If task was previously skipped/postponed, completing it clears the skipped state
      if (this.state.postponedCoreTasks?.[id]) {
        const updated = { ...(this.state.postponedCoreTasks || {}) };
        delete updated[id];
        this.state.postponedCoreTasks = updated;
      }

      const xpGained = CONFIG.CORE_RESPONSIBILITY_XP;
      const progress = ProgressionEngine.addXp(this.state.character, xpGained);
      this.state.character = progress.character;

      const weights = CONFIG.RESPONSIBILITY_ATTRIBUTE_WEIGHTS[id] || { WIL: CONFIG.WIL_CORE_TASK_BOOST };
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        weights
      );

      this.addLog('RESPONSIBILITY_COMPLETED', `Completed: ${id.toUpperCase()} (+${xpGained} XP)`);
    } else {
      const xpGained = CONFIG.CORE_RESPONSIBILITY_XP;
      const result = ProgressionEngine.removeXp(this.state.character, xpGained);
      this.state.character = result.character;

      const weights = CONFIG.RESPONSIBILITY_ATTRIBUTE_WEIGHTS[id] || { WIL: CONFIG.WIL_CORE_TASK_BOOST };
      const reversed = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, -v]));
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        reversed
      );

      this.addLog('RESPONSIBILITY_UNCHECKED', `Unchecked: ${id.toUpperCase()} (-${xpGained} XP)`);
    }

    this.evaluateRecreationUnlock();
    this.computeAndApplyRecovery();
    this.notify();
  }

  /**
   * Scans the last 14 days of daily logs to compute consecutive recovery
   * completions for habitually missed tasks, then applies a cumulative
   * RECOVERY attribute delta. This makes the RECOVERY ring in Attributes
   * panel live and reactive as the user rebuilds their habits.
   */
  computeAndApplyRecovery() {
    const LOOKBACK = 14;
    const dailyLogs = this.state.stats?.dailyLogs || {};
    const anchorDate = this.state.date ? new Date(this.state.date + 'T12:00:00') : new Date();

    // Compute miss counts for each task over the lookback window
    const missCount = {};
    for (let i = 1; i <= LOOKBACK; i++) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const log = dailyLogs[key];
      if (!log) continue;
      (log.missedCoreIds || []).forEach(id => {
        missCount[id] = (missCount[id] || 0) + 1;
      });
    }

    // For each flagged task (missed ≥ 2), count consecutive clean hits backward from yesterday
    let totalRecoveryScore = 0;
    Object.entries(missCount).forEach(([id, missed]) => {
      if (missed < 2) return;
      let hits = 0;
      for (let i = 1; i <= LOOKBACK; i++) {
        const d = new Date(anchorDate);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const log = dailyLogs[key];
        if (!log) continue;
        if ((log.missedCoreIds || []).includes(id)) break; // streak broken
        hits++;
      }
      // +0.5 RECOVERY per consecutive clean day for each flagged habit
      totalRecoveryScore += hits * 0.5;
    });

    // Apply the score as a recovery attribute top-up (capped at 60 max by ringGauge)
    const currentRecovery = this.state.character?.attributes?.RECOVERY ?? 10;
    const targetRecovery = Math.min(60, Math.max(currentRecovery, totalRecoveryScore));
    if (Math.abs(targetRecovery - currentRecovery) > 0.01) {
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        { RECOVERY: targetRecovery - currentRecovery }
      );
    }
  }

  // --- CUSTOM TASKS ---
  addCustomTask(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const weight = inferTaskWeight(trimmed);
    const task = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      xp: weight.xp,
      attributes: weight.attributes,
      category: weight.category,
      tag: weight.tag || weight.category,
      color: weight.color || '#6B7280',
      bg: weight.bg || '#F3F4F6',
      completed: false,
      completedAt: null,
      addedAt: new Date().toISOString(),
      // Postpone tracking
      postponed: false,
      postponedDays: 0  // how many rollovers this task has been carried through
    };

    this.state.customTasks = [...(this.state.customTasks || []), task];
    this.addLog('TASK_ADDED', `Added: "${trimmed}" (${weight.category} · +${weight.xp} XP)`);
    this.notify();
  }

  postponeCustomTask(id) {
    const tasks = this.state.customTasks || [];
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;

    this.state.customTasks = tasks.map(t =>
      t.id === id ? { ...t, postponed: true } : t
    );

    // Consequence: deduct WIL and LIFE
    this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
      this.state.character.attributes,
      { WIL: CONFIG.WIL_POSTPONE_PENALTY, LIFE: CONFIG.LIFE_POSTPONE_PENALTY }
    );

    this.addLog('TASK_POSTPONED', `Postponed: "${task.name}" (${CONFIG.WIL_POSTPONE_PENALTY} WIL, ${CONFIG.LIFE_POSTPONE_PENALTY} LIFE)`);
    this.evaluateRecreationUnlock();
    this.notify();
  }

  toggleCustomTask(id) {
    const tasks = this.state.customTasks || [];
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isCompleted = !task.completed;
    this.state.customTasks = tasks.map(t =>
      t.id === id
        ? {
            ...t,
            completed: isCompleted,
            completedAt: isCompleted ? new Date().toISOString() : null,
            // If completed, clear postpone state permanently
            postponed: isCompleted ? false : t.postponed,
            postponedDays: isCompleted ? 0 : t.postponedDays
          }
        : t
    );

    if (isCompleted) {
      const progress = ProgressionEngine.addXp(this.state.character, task.xp);
      this.state.character = progress.character;
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        task.attributes
      );
      this.addLog('TASK_COMPLETED', `Completed: "${task.name}" (+${task.xp} XP)`);
    } else {
      const result = ProgressionEngine.removeXp(this.state.character, task.xp);
      this.state.character = result.character;
      const reversed = Object.fromEntries(Object.entries(task.attributes).map(([k, v]) => [k, -v]));
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        reversed
      );
      this.addLog('TASK_UNCHECKED', `Unchecked: "${task.name}" (-${task.xp} XP)`);
    }

    this.evaluateRecreationUnlock();
    this.notify();
  }

  removeCustomTask(id) {
    this.state.customTasks = (this.state.customTasks || []).filter(t => t.id !== id);
    this.evaluateRecreationUnlock();
    this.notify();
  }

  postponeCoreTask(id) {
    const existing = this.state.postponedCoreTasks?.[id];
    this.state.postponedCoreTasks = {
      ...(this.state.postponedCoreTasks || {}),
      [id]: { postponedDays: existing ? existing.postponedDays : 1 }
    };

    // Consequence: deduct WIL and LIFE
    this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
      this.state.character.attributes,
      { WIL: CONFIG.WIL_POSTPONE_PENALTY, LIFE: CONFIG.LIFE_POSTPONE_PENALTY }
    );

    this.addLog('CORE_TASK_POSTPONED', `Postponed core task: ${id} (${CONFIG.WIL_POSTPONE_PENALTY} WIL, ${CONFIG.LIFE_POSTPONE_PENALTY} LIFE)`);
    this.evaluateRecreationUnlock();
    this.notify();
  }

  unskipCoreTask(id) {
    const updated = { ...(this.state.postponedCoreTasks || {}) };
    delete updated[id];
    this.state.postponedCoreTasks = updated;

    // Restore deducted WIL and LIFE
    this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
      this.state.character.attributes,
      { WIL: -CONFIG.WIL_POSTPONE_PENALTY, LIFE: -CONFIG.LIFE_POSTPONE_PENALTY }
    );

    this.addLog('CORE_TASK_UNSKIPPED', `Unskipped core task: ${id} (+${-CONFIG.WIL_POSTPONE_PENALTY} WIL, +${-CONFIG.LIFE_POSTPONE_PENALTY} LIFE)`);
    this.evaluateRecreationUnlock();
    this.notify();
  }

  unskipCustomTask(id) {
    const tasks = this.state.customTasks || [];
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    this.state.customTasks = tasks.map(t =>
      t.id === id
        ? { ...t, postponed: false, postponedDays: 0 }
        : t
    );

    // Restore deducted WIL and LIFE
    this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
      this.state.character.attributes,
      { WIL: -CONFIG.WIL_POSTPONE_PENALTY, LIFE: -CONFIG.LIFE_POSTPONE_PENALTY }
    );

    this.addLog('TASK_UNSKIPPED', `Unskipped: "${task.name}" (+${-CONFIG.WIL_POSTPONE_PENALTY} WIL, +${-CONFIG.LIFE_POSTPONE_PENALTY} LIFE)`);
    this.evaluateRecreationUnlock();
    this.notify();
  }

  // --- JUSTIFIED TASK EXEMPTIONS (0 Penalty) ---
  exemptTask(taskId, type, { reason, category }) {
    if (!reason || !reason.trim()) return;
    const cleanReason = reason.trim();
    const cat = category || 'General';

    this.state.taskExemptions = {
      ...(this.state.taskExemptions || {}),
      [taskId]: {
        reason: cleanReason,
        category: cat,
        exemptedAt: new Date().toISOString(),
        status: 'EXEMPT'
      }
    };

    // If task was previously postponed with penalty, restore deducted points
    if (type === 'core' && this.state.postponedCoreTasks?.[taskId]) {
      const updated = { ...(this.state.postponedCoreTasks || {}) };
      delete updated[taskId];
      this.state.postponedCoreTasks = updated;
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        { WIL: -CONFIG.WIL_POSTPONE_PENALTY, LIFE: -CONFIG.LIFE_POSTPONE_PENALTY }
      );
    } else if (type === 'custom') {
      const task = (this.state.customTasks || []).find(t => t.id === taskId);
      if (task?.postponed) {
        this.state.customTasks = this.state.customTasks.map(t =>
          t.id === taskId ? { ...t, postponed: false, postponedDays: 0 } : t
        );
        this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
          this.state.character.attributes,
          { WIL: -CONFIG.WIL_POSTPONE_PENALTY, LIFE: -CONFIG.LIFE_POSTPONE_PENALTY }
        );
      }
    }

    this.addLog('TASK_EXEMPTED', `Justified exemption: ${taskId} (${cleanReason} · 0 penalty)`);
    this.evaluateRecreationUnlock();
    this.notify();
    this._syncTradeChannel();
  }

  unexemptTask(taskId) {
    if (this.state.taskExemptions?.[taskId]) {
      const updated = { ...this.state.taskExemptions };
      delete updated[taskId];
      this.state.taskExemptions = updated;
      this.addLog('TASK_EXEMPTION_REMOVED', `Exemption removed for: ${taskId}`);
      this.evaluateRecreationUnlock();
      this.notify();
      this._syncTradeChannel();
    }
  }

  // --- REAL-TIME TASK BARTER & SIBLING TRADE ---
  _syncTradeChannel() {
    if (!this.state.syncKey || !this.state.siblingSyncKey) return;
    dbSync.pushTradeData(this.state.syncKey, this.state.siblingSyncKey, {
      trades: this.state.trades || [],
      exemptions: this.state.taskExemptions || {},
      updatedAt: new Date().toISOString()
    });
    // Also keep sibling's snapshot of my tasks current
    this._pushMyTaskSnapshot();
  }

  /**
   * Pushes a lightweight snapshot of this user's current tradeable tasks
   * to the shared Firestore trade channel doc so the sibling device can
   * read them when building the "swap" dropdown in TradeModal.
   */
  _pushMyTaskSnapshot() {
    if (!this.state.syncKey || !this.state.siblingSyncKey) return;
    const profile = this.state.profile || 'ram';
    const dueList = RecurrenceEngine.getDueResponsibilities(undefined, profile);
    const delegated = this.state.delegatedTasks || {};
    const tradeableTasks = [
      ...dueList
        .filter(t => t.isTradeable !== false && t.id !== 'reading' && t.id !== 'workout' && !delegated[t.id])
        .map(t => ({ id: t.id, name: t.name, category: t.category || 'Core Habit' })),
      ...(this.state.customTasks || [])
        .filter(t => !t.completed && !t.postponed && !delegated[t.id])
        .map(t => ({ id: t.id, name: t.name, category: t.category || 'Custom Habit' }))
    ];
    dbSync.pushMyTaskSnapshot(this.state.syncKey, this.state.siblingSyncKey, tradeableTasks);
  }

  _syncAcceptedTradesToState() {
    if (!this.state.trades || !this.state.syncKey) return;
    let changed = false;

    for (const trade of this.state.trades) {
      if (trade.status === 'ACCEPTED') {
        // If current user is the recipient (toUser)
        if (trade.toUser === this.state.syncKey) {
          const alreadyAdopted = (this.state.customTasks || []).some(t => t.tradeId === trade.id);
          if (!alreadyAdopted) {
            const adopted = {
              id: `traded_${trade.taskId}_${Date.now()}`,
              name: trade.taskName,
              xp: 15,
              attributes: { LIFE: 0.8, WIL: 0.3 },
              category: 'Chore',
              tag: 'Traded',
              color: 'var(--color-text-primary)',
              bg: 'var(--color-surface-subtle)',
              completed: false,
              completedAt: null,
              addedAt: new Date().toISOString(),
              postponed: false,
              postponedDays: 0,
              isTraded: true,
              tradeId: trade.id
            };
            this.state.customTasks = [...(this.state.customTasks || []), adopted];
            changed = true;
          }

          if (trade.swapTaskId && !this.state.delegatedTasks?.[trade.swapTaskId]) {
            this.state.delegatedTasks = {
              ...(this.state.delegatedTasks || {}),
              [trade.swapTaskId]: { tradeId: trade.id, tradedTo: trade.fromUser }
            };
            changed = true;
          }
        }

        // If current user is the sender (fromUser)
        if (trade.fromUser === this.state.syncKey) {
          if (!this.state.delegatedTasks?.[trade.taskId]) {
            this.state.delegatedTasks = {
              ...(this.state.delegatedTasks || {}),
              [trade.taskId]: { tradeId: trade.id, tradedTo: trade.toUser }
            };
            changed = true;
          }

          if (trade.swapTaskId && trade.swapTaskName) {
            const alreadyAdopted = (this.state.customTasks || []).some(t => t.tradeId === trade.id);
            if (!alreadyAdopted) {
              const adopted = {
                id: `traded_${trade.swapTaskId}_${Date.now()}`,
                name: trade.swapTaskName,
                xp: 15,
                attributes: { LIFE: 0.8, WIL: 0.3 },
                category: 'Chore',
                tag: 'Traded',
                color: 'var(--color-text-primary)',
                bg: 'var(--color-surface-subtle)',
                completed: false,
                completedAt: null,
                addedAt: new Date().toISOString(),
                postponed: false,
                postponedDays: 0,
                isTraded: true,
                tradeId: trade.id
              };
              this.state.customTasks = [...(this.state.customTasks || []), adopted];
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      this.evaluateRecreationUnlock();
    }
  }

  sendTradeOffer({ taskId, taskName, type, note, swapTaskId, swapTaskName }) {
    const tradeId = `trade_${Date.now()}`;
    const newTrade = {
      id: tradeId,
      fromUser: this.state.syncKey,
      fromName: this.state.character.name,
      toUser: this.state.siblingSyncKey,
      taskId,
      taskName,
      taskType: type,
      note: (note || '').trim(),
      swapTaskId: swapTaskId || null,
      swapTaskName: swapTaskName || null,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.state.trades = [newTrade, ...(this.state.trades || [])];
    this.addLog('TRADE_PROPOSED', `Proposed trade for "${taskName}" to sibling.`);
    this.notify();
    this._syncTradeChannel();
    return newTrade;
  }

  cancelTradeOffer(tradeId) {
    const trade = (this.state.trades || []).find(t => t.id === tradeId);
    if (!trade) return;
    trade.status = 'CANCELLED';
    trade.resolvedAt = new Date().toISOString();
    this.addLog('TRADE_CANCELLED', `Cancelled trade offer for "${trade.taskName}".`);
    this.evaluateRecreationUnlock();
    this.notify();
    this._syncTradeChannel();
  }

  respondToTrade(tradeId, action, counterData = null) {
    const trade = (this.state.trades || []).find(t => t.id === tradeId);
    if (!trade) return;

    if (action === 'ACCEPT') {
      trade.status = 'ACCEPTED';
      trade.resolvedAt = new Date().toISOString();

      if (trade.toUser === this.state.syncKey) {
        // Recipient accepts the task from sibling
        const adopted = {
          id: `traded_${trade.taskId}_${Date.now()}`,
          name: trade.taskName,
          xp: 15,
          attributes: { LIFE: 0.8, WIL: 0.3 },
          category: 'Chore',
          tag: 'Traded',
          color: 'var(--color-text-primary)',
          bg: 'var(--color-surface-subtle)',
          completed: false,
          completedAt: null,
          addedAt: new Date().toISOString(),
          postponed: false,
          postponedDays: 0,
          isTraded: true,
          tradeId: trade.id
        };
        this.state.customTasks = [...(this.state.customTasks || []), adopted];

        if (trade.swapTaskId) {
          this.state.delegatedTasks = {
            ...(this.state.delegatedTasks || {}),
            [trade.swapTaskId]: { tradeId: trade.id, tradedTo: trade.fromUser }
          };
        }
      } else if (trade.fromUser === this.state.syncKey) {
        // Sender marked task as delegated
        this.state.delegatedTasks = {
          ...(this.state.delegatedTasks || {}),
          [trade.taskId]: { tradeId: trade.id, tradedTo: trade.toUser }
        };

        if (trade.swapTaskId && trade.swapTaskName) {
          const adopted = {
            id: `traded_${trade.swapTaskId}_${Date.now()}`,
            name: trade.swapTaskName,
            xp: 15,
            attributes: { LIFE: 0.8, WIL: 0.3 },
            category: 'Chore',
            tag: 'Traded',
            color: 'var(--color-text-primary)',
            bg: 'var(--color-surface-subtle)',
            completed: false,
            completedAt: null,
            addedAt: new Date().toISOString(),
            postponed: false,
            postponedDays: 0,
            isTraded: true,
            tradeId: trade.id
          };
          this.state.customTasks = [...(this.state.customTasks || []), adopted];
        }
      }

      this.addLog('TRADE_ACCEPTED', `Trade accepted: "${trade.taskName}".`);
      audio.playUnlock?.();
    } else if (action === 'DECLINE') {
      trade.status = 'DECLINED';
      trade.resolvedAt = new Date().toISOString();
      this.addLog('TRADE_DECLINED', `Trade declined for "${trade.taskName}".`);
    } else if (action === 'COUNTER') {
      trade.status = 'COUNTER_OFFER';
      trade.counterOffer = {
        fromUser: this.state.syncKey,
        fromName: this.state.character.name,
        note: (counterData?.note || '').trim(),
        swapTaskId: counterData?.swapTaskId || null,
        swapTaskName: counterData?.swapTaskName || null,
        at: new Date().toISOString()
      };
      this.addLog('TRADE_COUNTER_OFFER', `Counter-offer sent for "${trade.taskName}".`);
    }

    this.evaluateRecreationUnlock();
    this.notify();
    this._syncTradeChannel();
  }

  // --- SIDE QUEST DIRECTIVE ---
  getTodayQuest() {
    return ChallengeEngine.generatePeriodQuest(this.getCurrentPeriod(), this.state.baseline);
  }

  acceptSideQuest() {
    if (this.state.sideQuestState.status !== 'AVAILABLE') return;

    this.state.sideQuestState = {
      ...this.state.sideQuestState,
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString()
    };

    if (CONFIG.WIL_COMMITMENT_ACCEPT_BOOST !== 0) {
      this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
        this.state.character.attributes,
        { WIL: CONFIG.WIL_COMMITMENT_ACCEPT_BOOST }
      );
    }

    this.addLog('COMMITMENT_MADE', 'Directive accepted: Promise made to self.');
    audio.playAccept();
    this.notify();
  }

  declineSideQuest() {
    if (this.state.sideQuestState.status !== 'AVAILABLE') return;

    this.state.sideQuestState = {
      ...this.state.sideQuestState,
      status: 'DECLINED',
      resolvedAt: new Date().toISOString()
    };

    this.addLog('COMMITMENT_DECLINED', 'Directive declined cleanly. Zero discipline penalty.');
    this.notify();
  }

  completeSideQuest() {
    if (this.state.sideQuestState.status !== 'ACCEPTED') return;

    const quest = this.getTodayQuest();

    this.state.sideQuestState = {
      ...this.state.sideQuestState,
      status: 'COMPLETED',
      resolvedAt: new Date().toISOString()
    };

    this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
      this.state.character.attributes,
      {
        WIL: CONFIG.WIL_COMMITMENT_COMPLETE_BOOST,
        [quest.attribute]: 1.5
      }
    );

    if (quest.rewardXP > 0) {
      const progress = ProgressionEngine.addXp(this.state.character, quest.rewardXP);
      this.state.character = progress.character;
    }

    this.addLog('COMMITMENT_FULFILLED', `Directive completed: Kept promise to self (+${CONFIG.WIL_COMMITMENT_COMPLETE_BOOST} WIL).`);

    if (quest.rewardType === 'RECREATION') {
      this.state.recreation = {
        isUnlocked: true,
        source: 'SIDE_QUEST_QUALIFIED',
        unlockedAt: new Date().toISOString()
      };
      this.addLog('RECREATION_UNLOCKED', 'Recreation unlocked via qualifying side quest.');
      audio.playUnlock();
    } else {
      this.evaluateRecreationUnlock();
      audio.playComplete();
    }

    this.notify();
  }

  failSideQuest() {
    if (this.state.sideQuestState.status !== 'ACCEPTED') return;

    this.state.sideQuestState = {
      ...this.state.sideQuestState,
      status: 'FAILED',
      resolvedAt: new Date().toISOString()
    };

    this.state.character.attributes = ProgressionEngine.applyAttributeDeltas(
      this.state.character.attributes,
      { WIL: CONFIG.WIL_COMMITMENT_FAIL_PENALTY }
    );

    this.addLog('COMMITMENT_BROKEN', `Directive failed: Broken commitment to self (${CONFIG.WIL_COMMITMENT_FAIL_PENALTY} WIL).`);
    this.evaluateRecreationUnlock();
    audio.playFail();
    this.notify();
  }

  // --- RECREATION EVALUATION ---
  evaluateRecreationUnlock() {
    if (this.state.recreation.isUnlocked && this.state.recreation.source === 'SIDE_QUEST_QUALIFIED') {
      return;
    }

    const profile = this.state.profile || 'ram';
    const dueList = RecurrenceEngine.getDueResponsibilities(undefined, profile);
    const postponedCore = this.state.postponedCoreTasks || {};
    const exemptions = this.state.taskExemptions || {};
    const delegated = this.state.delegatedTasks || {};

    const activeDueList = dueList.filter(item => !postponedCore[item.id] && !exemptions[item.id] && !delegated[item.id]);

    if (activeDueList.length === 0) return;

    const allDueDone = activeDueList.every((item) => {
      const rec = this.state.dailyResponsibilities[item.id];
      return rec && rec.completed === true;
    });

    if (allDueDone) {
      this.state.recreation = {
        isUnlocked: true,
        source: 'ALL_CORE_COMPLETE',
        unlockedAt: new Date().toISOString()
      };
      this.addLog('RECREATION_UNLOCKED', 'Recreation unlocked: All due core responsibilities completed.');
      audio.playUnlock();
    } else {
      this.state.recreation = {
        isUnlocked: false,
        source: null,
        unlockedAt: null
      };
    }
  }

  // --- BASELINE CALIBRATION ---
  updateBaseline(measurements) {
    this.state.baseline = {
      ...this.state.baseline,
      ...measurements,
      isCalibrated: true
    };
    this.addLog('BASELINE_UPDATED', 'Physical baseline calibrated. Future challenge targets scaled.');
    this.notify();
  }

  // --- DAY ACCOUNTABILITY / EVALUATION ---
  evaluateDayStatus() {
    const profile = this.state.profile || 'ram';
    const dueList = RecurrenceEngine.getDueResponsibilities(undefined, profile);
    const completedCount = dueList.filter((i) => this.state.dailyResponsibilities[i.id]?.completed).length;
    const isFlawless = completedCount === dueList.length;
    const questStatus = this.state.sideQuestState.status;

    let message = '';
    let isBadDay = false;

    if (completedCount === 0 || questStatus === 'FAILED') {
      isBadDay = true;
      message = 'Today was challenging, but discipline is built on persistence. Rest well and bounce back tomorrow.';
    } else if (isFlawless && (questStatus === 'COMPLETED' || questStatus === 'DECLINED')) {
      message = 'Outstanding execution today! Every daily ritual completed and personal momentum reinforced.';
    } else {
      message = `${completedCount} of ${dueList.length} daily habits completed. Solid effort — keep stacking positive days.`;
    }

    return {
      completedCount,
      totalDue: dueList.length,
      isFlawless,
      isBadDay,
      message
    };
  }

  resetAll() {
    StorageService.clear();
    this.state = getInitialState();
    StorageService.save(this.state);
    this.notify();
  }
}

export const store = new Store();

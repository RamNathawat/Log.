import './styles/main.css';
import { store } from './state/store.js';
import { renderHeader } from './components/Header.js';
import { renderNavigation } from './components/Navigation.js';
import { renderCharacterOverview } from './components/CharacterOverview.js';
import { renderDueResponsibilities } from './components/DueResponsibilities.js';
import { renderSideQuestDirective } from './components/SideQuestDirective.js';
import { renderProgressScreen } from './components/ProgressScreen.js';
import { renderLongTermPillars } from './components/LongTermPillars.js';
import { renderAccountabilityModal, renderCalibrationModal } from './components/AccountabilityModal.js';
import { renderSyncModal } from './components/SyncModal.js';
import { notifier } from './services/notificationService.js';

let activeModal = null;
let currentScreen = 'today'; // 'today' | 'progress' | 'pillars'

function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  const state = store.getState();

  const currentScrollY = window.scrollY;
  const scrollContainer = document.querySelector('.responsibilities-scroll');
  const respScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  root.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'system-container';

  // 1. Header (Date, Audio, Baseline, Review, Level badge)
  const header = renderHeader(state, (action) => {
    if (action === 'OPEN_CALIBRATE') {
      openModal(renderCalibrationModal(state.baseline, (data) => store.updateBaseline(data), closeModal));
    } else if (action === 'OPEN_SYNC') {
      openModal(renderSyncModal((key) => store.startCloudSync(key), closeModal));
    } else if (action === 'OPEN_EVAL') {
      const evalReport = store.evaluateDayStatus();
      openModal(renderAccountabilityModal(evalReport, closeModal));
    } else if (action === 'FORCE_RENDER') {
      renderApp();
    }
  });

  // 2. Navigation bar (Today | Progress & Activity | Life Vision)
  const navigation = renderNavigation(currentScreen, (newScreen) => {
    currentScreen = newScreen;
    renderApp();
  });

  container.appendChild(header);

  // 2. Screen Views
  if (currentScreen === 'today') {
    // Character Overview (Level + XP + attributes in one elegant card)
    const characterOverview = renderCharacterOverview(state);

    // Daily Habits & Tasks (includes Recreation status + scrollable list + quick add)
    const dueDuties = renderDueResponsibilities(
      state,
      (taskId) => store.toggleResponsibility(taskId),
      (name)   => store.addCustomTask(name),
      (id)     => store.removeCustomTask(id),
      (id)     => store.toggleCustomTask(id),
      (id)     => store.postponeCustomTask(id),
      (id)     => store.postponeCoreTask(id),
      (id)     => store.unskipCustomTask(id),
      (id)     => store.unskipCoreTask(id)
    );

    // Daily Challenge
    const sideQuest = renderSideQuestDirective(state, (action) => {
      if (action === 'ACCEPT_QUEST')        store.acceptSideQuest();
      else if (action === 'DECLINE_QUEST')  store.declineSideQuest();
      else if (action === 'COMPLETE_QUEST') store.completeSideQuest();
      else if (action === 'FAIL_QUEST')     store.failSideQuest();
    });

    container.appendChild(characterOverview);
    container.appendChild(dueDuties);
    container.appendChild(sideQuest);
  } else if (currentScreen === 'progress') {
    // Dedicated Progress & Activity Tracking Screen
    const progressScreen = renderProgressScreen(state);
    container.appendChild(progressScreen);
  } else if (currentScreen === 'pillars') {
    // Long-Term Life Vision & Pillars
    const pillarsScreen = renderLongTermPillars(state);
    container.appendChild(pillarsScreen);
  }

  container.appendChild(navigation);

  root.appendChild(container);

  window.scrollTo(0, currentScrollY);
  const newRespScroll = document.querySelector('.responsibilities-scroll');
  if (newRespScroll) {
    newRespScroll.scrollTop = respScrollTop;
  }
}

function openModal(modalElement) {
  closeModal();
  activeModal = modalElement;
  document.body.appendChild(activeModal);
}

function closeModal() {
  if (activeModal && activeModal.parentNode) {
    activeModal.parentNode.removeChild(activeModal);
    activeModal = null;
  }
}

store.subscribe(() => renderApp());
renderApp();

// Dev test helpers accessible from browser console
window.store = store;
window.testRedVersion = () => {
  const sampleCoreId = 'core_deep_work';
  store.state.postponedCoreTasks = {
    ...(store.state.postponedCoreTasks || {}),
    [sampleCoreId]: { postponedDays: 3 }
  };
  if (!store.state.customTasks || store.state.customTasks.length === 0) {
    store.addCustomTask('High Priority Task');
  }
  if (store.state.customTasks && store.state.customTasks.length > 0) {
    store.state.customTasks[0].postponed = true;
    store.state.customTasks[0].postponedDays = 3;
  }
  store.notify();
  console.log('✅ Red urgency version applied (skipped 3×)!');
};
window.resetTest = () => {
  store.state.postponedCoreTasks = {};
  if (store.state.customTasks) {
    store.state.customTasks.forEach(t => {
      t.postponed = false;
      t.postponedDays = 0;
    });
  }
  store.notify();
  console.log('🔄 Tasks reset to normal.');
};
window.simulateNextDay = () => {
  store.simulateNextDay();
  console.log('📅 Advanced date by 1 day! Custom tasks cleared unless postponed.');
};

/**
 * Seed realistic, randomized habit history over the last N days.
 * Simulates genuine human variance: some days the user is dialed in,
 * some days specific habits slip or get postponed.
 * @param {Object} [options]
 * @param {number} [options.days=14] - lookback window
 * @param {Object} [options.probabilities] - miss probability per task ID (0.0 to 1.0)
 */
window.simulateNeglect = (options = {}) => {
  const {
    days = 14,
    probabilities = {
      workout: 0.65,    // frequently missed (~9/14 days) -> Critical
      reading: 0.40,    // moderately missed (~5-6/14 days) -> Flagged/Warning
      outreach: 0.25,   // occasionally missed (~3-4/14 days) -> Watch
      dishes: 0.10      // rarely missed (~1/14 days)
    },
    recentHits = { workout: 2, reading: 1 } // simulate that user completed the last N sessions
  } = options;

  const state = store.state;
  if (!state.stats) state.stats = { currentStreak: 0, longestStreak: 0, totalDaysTracked: 0, dailyLogs: {} };
  if (!state.stats.dailyLogs) state.stats.dailyLogs = {};

  const anchorDate = state.date ? new Date(state.date + 'T12:00:00') : new Date();
  const summary = {};

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  for (let i = days; i >= 1; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    const totalDue = 5;
    const missedToday = [];
    const postponedToday = [];

    // Evaluate each habit against its probability
    Object.entries(probabilities).forEach(([taskId, prob]) => {
      const isProtectedRecentHit = recentHits[taskId] && i <= recentHits[taskId];
      if (!isProtectedRecentHit && Math.random() < prob) {
        missedToday.push(taskId);
        if (!summary[taskId]) summary[taskId] = { missed: 0, skipped: 0 };
        summary[taskId].missed++;

        // 35% chance the user actively postponed/skipped instead of forgetting
        if (Math.random() < 0.35) {
          postponedToday.push(taskId);
          summary[taskId].skipped++;
        }
      }
    });

    const completed = Math.max(0, totalDue - missedToday.length);
    const completionRate = Math.round((completed / totalDue) * 100);

    // Track streaks
    if (completionRate >= 80) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }

    state.stats.dailyLogs[key] = {
      totalDue,
      completed,
      completionRate,
      questStatus: completionRate >= 80 ? 'COMPLETED' : 'FAILED',
      missedCoreIds: missedToday,
      skippedCoreIds: postponedToday
    };
  }

  currentStreak = tempStreak;
  state.stats.totalDaysTracked = Object.keys(state.stats.dailyLogs).length;
  state.stats.currentStreak = currentStreak;
  state.stats.longestStreak = Math.max(maxStreak, currentStreak);

  store.notify();

  console.log(`🎲 Seeded ${days} days with randomized human variance.`);
  console.table(summary);
  console.log('👉 Head to the Review tab (or swipe to Accountability) to view results!');
};

/** Remove all seeded neglect history and reset dailyLogs. */
window.clearNeglect = () => {
  store.state.stats.dailyLogs = {};
  store.state.stats.totalDaysTracked = 0;
  store.state.stats.currentStreak = 0;
  store.notify();
  console.log('🧹 Cleared all daily log history.');
};

// Prompt for notification permission on initial boot
setTimeout(() => {
  notifier.requestPermission();
}, 1500);

// Service Worker management: clean old cache in dev so updates appear immediately
if ('serviceWorker' in navigator) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // In dev, unregister service workers and clear caches to prevent stale bundles
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  } else if (window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service worker registration ignored:', err);
      });
    });
  }
}

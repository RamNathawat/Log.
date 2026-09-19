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
      (id)     => store.postponeCustomTask(id)
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

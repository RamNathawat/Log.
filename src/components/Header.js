import { audio } from '../services/audioService.js';
import { notifier } from '../services/notificationService.js';

export function renderHeader(state, onAction) {
  const dateObj = state.date ? new Date(state.date + 'T12:00:00') : new Date();
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const streak = state.stats?.currentStreak || 0;
  const name = state.character?.name || 'Ram';

  const element = document.createElement('header');
  element.className = 'app-header';

  element.innerHTML = `
    <div class="app-header-inner">
      <div class="app-header-left">
        <div class="app-logo">Log.</div>
        <div class="app-greeting">
          Hey, Ram
          <svg class="greeting-smile" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </div>
        <div class="app-tagline">Same direction. One day at a time.</div>
      </div>

      <!-- Right: date+menu on one row, streak below -->
      <div class="app-header-right">
        <div class="app-header-top-row">
          <div class="app-header-date">${dateStr}</div>
          <button id="btn-menu-toggle" class="header-menu-btn" title="Menu" aria-label="Open menu">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
              <line x1="4" y1="7" x2="20" y2="7"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="17" x2="20" y2="17"></line>
            </svg>
          </button>
        </div>
        <div class="app-header-streak">${streak > 0 ? `${streak} day streak` : 'No streak yet'}</div>
      </div>
    </div>
  `;

  // ── Action Sheet ──────────────────────────────────────────────────────────
  function openActionSheet() {
    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'action-sheet-backdrop';

    // Sheet
    const sheet = document.createElement('div');
    sheet.className = 'action-sheet';
    sheet.innerHTML = `
      <div class="action-sheet-handle"></div>

      <div class="action-sheet-title">Settings</div>

      <div class="action-sheet-list">
        <button class="action-sheet-item" id="as-sync">
          <div class="action-sheet-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
          </div>
          <div class="action-sheet-item-text">
            <span class="action-sheet-item-label">Cloud Sync</span>
            <span class="action-sheet-item-sub">Backup & restore your data</span>
          </div>
          <svg class="action-sheet-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <div class="action-sheet-divider"></div>

        <button class="action-sheet-item" id="as-calibrate">
          <div class="action-sheet-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
          </div>
          <div class="action-sheet-item-text">
            <span class="action-sheet-item-label">Baseline Targets</span>
            <span class="action-sheet-item-sub">Calibrate your personal benchmarks</span>
          </div>
          <svg class="action-sheet-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <div class="action-sheet-divider"></div>

        <button class="action-sheet-item" id="as-eval">
          <div class="action-sheet-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div class="action-sheet-item-text">
            <span class="action-sheet-item-label">Review Today</span>
            <span class="action-sheet-item-sub">See how you executed today</span>
          </div>
          <svg class="action-sheet-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <button class="action-sheet-cancel" id="as-cancel">Cancel</button>
    `;

    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);

    // Force reflow for silky smooth 60fps hardware accelerated slide-up
    void sheet.offsetHeight;

    // Animate in
    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
      sheet.classList.add('visible');
    });

    function close() {
      backdrop.classList.remove('visible');
      sheet.classList.remove('visible');
      setTimeout(() => backdrop.remove(), 320);
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    sheet.querySelector('#as-cancel').addEventListener('click', close);

    sheet.querySelector('#as-sync').addEventListener('click', () => {
      close();
      setTimeout(() => onAction('OPEN_SYNC'), 100);
    });
    sheet.querySelector('#as-calibrate').addEventListener('click', () => {
      close();
      setTimeout(() => onAction('OPEN_CALIBRATE'), 100);
    });
    sheet.querySelector('#as-eval').addEventListener('click', () => {
      close();
      setTimeout(() => onAction('OPEN_EVAL'), 100);
    });
  }

  element.querySelector('#btn-menu-toggle').addEventListener('click', openActionSheet);

  return element;
}

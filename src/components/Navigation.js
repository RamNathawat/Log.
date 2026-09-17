/**
 * Navigation Bar — Editorial Segmented Control
 * Crisp, mature, no emojis.
 */
export function renderNavigation(activeTab, onTabChange) {
  const nav = document.createElement('nav');
  nav.className = 'app-nav-bar';
  nav.setAttribute('aria-label', 'Main navigation');

  const tabs = [
    {
      id: 'today',
      label: 'Habits',
      icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>'
    },
    {
      id: 'pillars',
      label: 'Vision',
      icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>'
    }
  ];

  nav.innerHTML = `
    <div class="nav-segment-container">
      ${tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return `
          <button
            class="nav-tab-btn ${isActive ? 'active' : ''}"
            data-tab="${tab.id}"
            type="button"
            role="tab"
            aria-selected="${isActive}"
          >
            <span class="nav-tab-icon">${tab.icon}</span>
            <span class="nav-tab-label">${tab.label}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  nav.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (tabId !== activeTab) {
        onTabChange(tabId);
      }
    });
  });

  return nav;
}

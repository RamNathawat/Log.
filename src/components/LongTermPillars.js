export function renderLongTermPillars(state) {
  const element = document.createElement('section');
  element.className = 'screen-view pillars-screen';

  const pillarsData = [
    {
      id: 'polymath',
      index: '01',
      title: 'Become a Polymath before Age 27',
      subtitle: 'Intellectual & Systems Mastery',
      description: 'Comprehensive mastery of systems, intellect, deep reading, writing, and cognitive expansion.',
      relatedAttributes: ['INT', 'WIL'],
      habits: ['Focused Reading', 'Deep Research', 'Writing & Reflection']
    },
    {
      id: 'physique',
      index: '02',
      title: 'Build a Lean, Athletic Physique',
      subtitle: 'Physical Movement & Longevity',
      description: 'Aesthetic body composition, progressive physical strength, calisthenics, and high vitality.',
      relatedAttributes: ['STR', 'RECOVERY'],
      habits: ['Movement & Training', 'Cooking & Nutrition', 'Sleep & Rest']
    },
    {
      id: 'career',
      index: '03',
      title: 'Master Career & High-Value Craft',
      subtitle: 'Technical Leverage & Engineering',
      description: 'High-leverage engineering skills, technical dominance, proactive networking, and deep work focus.',
      relatedAttributes: ['WORK', 'INT'],
      habits: ['Deep Work & Coding', 'Career Outreach', 'Project Execution']
    },
    {
      id: 'wealth',
      index: '04',
      title: 'Achieve Financial Sovereignty',
      subtitle: 'Autonomy & Strategic Capital',
      description: 'Compounding wealth, disciplined capital allocation, and complete autonomy over time and location.',
      relatedAttributes: ['WORK', 'LIFE', 'WIL'],
      habits: ['Budget & Investing', 'Disciplined Living', 'Long-Term Compounding']
    }
  ];

  element.innerHTML = `
    <!-- Vision screen header -->
    <div class="progress-screen-header" style="margin-bottom: 4px;">
      <div class="progress-screen-subtitle">Vision</div>
      <div class="progress-screen-tagline">The enduring North Stars guiding your daily habits.</div>
    </div>

    <div class="system-section">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${pillarsData.map(p => `
          <div class="pillar-card-new card">
            <!-- Top row: number + title + attr badges -->
            <div class="pillar-top-row">
              <div class="pillar-header-left">
                <div class="pillar-index">${p.index}</div>
                <div class="pillar-title-block">
                  <h3 class="pillar-title">${p.title}</h3>
                  <span class="telemetry">${p.subtitle}</span>
                </div>
              </div>
              <div class="pillar-badges">
                ${p.relatedAttributes.map(a => `<span class="pillar-attr-badge">+${a}</span>`).join('')}
              </div>
            </div>

            <p class="pillar-description">${p.description}</p>

            <!-- Divider + fueling habits -->
            <div class="pillar-habits-section">
              <span class="telemetry" style="margin-bottom: 8px; display: block;">Fueling Habits</span>
              <div class="pillar-habits-row">
                ${p.habits.map(h => `<span class="category-pill pill-neutral">${h}</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return element;
}

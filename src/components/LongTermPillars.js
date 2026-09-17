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
    <div class="system-section">
      <div class="section-label"></div>
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 20px; font-weight: 800; color: var(--color-text-primary); letter-spacing: -0.03em; margin-bottom: 4px;">Pillars of Growth</h2>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.5;">
          The enduring North Stars guiding your daily habits and challenges.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${pillarsData.map(p => `
          <div class="card pillar-card" style="padding: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="pillar-icon">${p.index}</div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; line-height: 1.25; margin: 0;">
                    ${p.title}
                  </h3>
                  <span class="telemetry" style="margin-top: 3px; display: block;">${p.subtitle}</span>
                </div>
              </div>
              <div style="display: flex; gap: 4px; flex-shrink: 0;">
                ${p.relatedAttributes.map(a => `<span class="status-badge status-badge-locked">+${a}</span>`).join('')}
              </div>
            </div>

            <p style="font-size: 13px; color: var(--color-text-secondary); margin: 10px 0 14px; line-height: 1.55;">
              ${p.description}
            </p>

            <div class="section-divider" style="margin-bottom: 12px;"></div>

            <div>
              <span class="telemetry" style="margin-bottom: 6px; display: block;">Fueling Habits:</span>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
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

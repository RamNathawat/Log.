import { authService } from '../services/authService.js';
import { audio } from '../services/audioService.js';
import { haptics } from '../services/hapticsService.js';

export function renderAuthScreen(onAuthSuccess) {
  const element = document.createElement('div');
  element.className = 'auth-screen-container';

  let currentTab = 'signin'; // 'signin' | 'signup'
  let isSubmitting = false;
  let showPassword = false;

  function render() {
    element.innerHTML = `
      <div class="auth-screen-card">
        <!-- Logo & Branding -->
        <div class="auth-brand">
          <div class="auth-logo">Log.</div>
          <div class="auth-tagline">Discipline & Daily Rituals Operating System</div>
        </div>

        <!-- Mode Toggle Tabs -->
        <div class="auth-tab-bar">
          <button type="button" class="auth-tab ${currentTab === 'signin' ? 'active' : ''}" id="tab-signin">
            Sign In
          </button>
          <button type="button" class="auth-tab ${currentTab === 'signup' ? 'active' : ''}" id="tab-signup">
            Create Account
          </button>
        </div>

        <!-- Form Area -->
        <form id="auth-form" class="auth-form">
          ${currentTab === 'signup' ? `
            <div class="auth-input-group">
              <label class="auth-label" for="auth-name">Your Name</label>
              <input
                id="auth-name"
                class="auth-input"
                type="text"
                placeholder="e.g. Ram"
                autocomplete="name"
                autocapitalize="words"
              />
            </div>
          ` : ''}

          <div class="auth-input-group">
            <label class="auth-label" for="auth-email">Email Address</label>
            <input
              id="auth-email"
              class="auth-input"
              type="email"
              placeholder="name@domain.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="auth-input-group">
            <label class="auth-label" for="auth-password">Password</label>
            <div class="auth-password-wrapper">
              <input
                id="auth-password"
                class="auth-input auth-password-input"
                type="${showPassword ? 'text' : 'password'}"
                placeholder="••••••••"
                required
                autocomplete="${currentTab === 'signup' ? 'new-password' : 'current-password'}"
              />
              <button type="button" id="btn-toggle-pw" class="auth-pw-toggle" title="${showPassword ? 'Hide' : 'Show'} password">
                ${showPassword
                  ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
                  : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
                }
              </button>
            </div>
          </div>

          <div id="auth-error-msg" class="auth-error-banner" style="display: none;"></div>

          <button type="submit" id="auth-submit-btn" class="auth-submit-btn" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting
              ? '<span class="auth-spinner"></span> Connecting...'
              : (currentTab === 'signup' ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <div class="auth-footer-note">
          Real-time sibling accountability sync included.
        </div>
      </div>
    `;

    attachEventListeners();
  }

  function attachEventListeners() {
    // Tab switching
    element.querySelector('#tab-signin')?.addEventListener('click', () => {
      if (currentTab !== 'signin') {
        currentTab = 'signin';
        audio.playAccept();
        haptics.impactLight();
        render();
      }
    });

    element.querySelector('#tab-signup')?.addEventListener('click', () => {
      if (currentTab !== 'signup') {
        currentTab = 'signup';
        audio.playAccept();
        haptics.impactLight();
        render();
      }
    });

    // Password visibility toggle
    element.querySelector('#btn-toggle-pw')?.addEventListener('click', () => {
      showPassword = !showPassword;
      const pw = element.querySelector('#auth-password');
      if (pw) pw.type = showPassword ? 'text' : 'password';
      const btn = element.querySelector('#btn-toggle-pw');
      if (btn) {
        btn.innerHTML = showPassword
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });

    // Email / password form submit
    element.querySelector('#auth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = element.querySelector('#auth-email')?.value.trim();
      const password = element.querySelector('#auth-password')?.value;
      const name = element.querySelector('#auth-name')?.value.trim() || '';

      if (!email || !password) return;

      try {
        isSubmitting = true;
        audio.playAccept();
        haptics.impactMedium();
        render();

        const user = currentTab === 'signup'
          ? await authService.signUp(email, password, name || email.split('@')[0])
          : await authService.signIn(email, password);

        audio.playComplete();
        if (onAuthSuccess) onAuthSuccess(user);
      } catch (err) {
        isSubmitting = false;
        render();
        showError(err.message || 'Authentication failed. Please check your details.');
      }
    });
  }

  function showError(msg) {
    const errorEl = element.querySelector('#auth-error-msg');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      haptics.notificationWarning();
    }
  }

  render();
  return element;
}

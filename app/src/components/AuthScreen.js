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

        <!-- Google OAuth Button -->
        <button id="btn-google-auth" class="auth-google-btn" ${isSubmitting ? 'disabled' : ''}>
          <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <!-- Divider -->
        <div class="auth-divider">
          <span>or continue with email</span>
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
          ${
            currentTab === 'signup'
              ? `
            <div class="auth-input-group">
              <label class="auth-label" for="auth-name">Character Name</label>
              <input 
                id="auth-name" 
                class="auth-input" 
                type="text" 
                placeholder="e.g. Ram" 
                required 
                autocomplete="name" 
                autocapitalize="words"
              />
            </div>
          `
              : ''
          }

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
                ${
                  showPassword
                    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
                }
              </button>
            </div>
          </div>

          <div id="auth-error-msg" class="auth-error-banner" style="display: none;"></div>

          <button type="submit" id="auth-submit-btn" class="auth-submit-btn" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? '<span class="auth-spinner"></span> Connecting...' : (currentTab === 'signup' ? 'Create Character Account' : 'Sign In')}
          </button>
        </form>

        <div class="auth-footer-note">
          Synced end-to-end with real-time sibling accountability.
        </div>
      </div>
    `;

    attachEventListeners();
  }

  function attachEventListeners() {
    // Tab switching
    const tabSignin = element.querySelector('#tab-signin');
    const tabSignup = element.querySelector('#tab-signup');
    if (tabSignin) {
      tabSignin.addEventListener('click', () => {
        if (currentTab !== 'signin') {
          currentTab = 'signin';
          audio.playAccept();
          haptics.impactLight();
          render();
        }
      });
    }
    if (tabSignup) {
      tabSignup.addEventListener('click', () => {
        if (currentTab !== 'signup') {
          currentTab = 'signup';
          audio.playAccept();
          haptics.impactLight();
          render();
        }
      });
    }

    // Toggle Password Visibility
    const btnTogglePw = element.querySelector('#btn-toggle-pw');
    if (btnTogglePw) {
      btnTogglePw.addEventListener('click', () => {
        showPassword = !showPassword;
        const pwInput = element.querySelector('#auth-password');
        if (pwInput) {
          pwInput.type = showPassword ? 'text' : 'password';
        }
        btnTogglePw.innerHTML = showPassword
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      });
    }

    // Google Sign-In
    const btnGoogle = element.querySelector('#btn-google-auth');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        try {
          isSubmitting = true;
          audio.playAccept();
          haptics.impactMedium();
          btnGoogle.setAttribute('disabled', 'true');
          const user = await authService.signInWithGoogle();
          audio.playComplete();
          if (onAuthSuccess) onAuthSuccess(user);
        } catch (err) {
          showError(err.message || 'Google sign-in failed');
        } finally {
          isSubmitting = false;
          btnGoogle.removeAttribute('disabled');
        }
      });
    }

    // Form Submit
    const form = element.querySelector('#auth-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = element.querySelector('#auth-email')?.value.trim();
        const password = element.querySelector('#auth-password')?.value;
        const name = element.querySelector('#auth-name')?.value.trim() || 'Operator';

        if (!email || !password) return;

        try {
          isSubmitting = true;
          audio.playAccept();
          haptics.impactMedium();
          render();

          let user;
          if (currentTab === 'signup') {
            user = await authService.signUp(email, password, name);
          } else {
            user = await authService.signIn(email, password);
          }

          audio.playComplete();
          if (onAuthSuccess) onAuthSuccess(user);
        } catch (err) {
          isSubmitting = false;
          render();
          showError(err.message || 'Authentication failed. Please check credentials.');
        }
      });
    }
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

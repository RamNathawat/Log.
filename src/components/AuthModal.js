import { haptics } from '../services/hapticsService.js';
import { authService } from '../services/authService.js';

export function renderAuthModal(state, onAuthSuccess, onSwitchProfile, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.maxWidth = '420px';

  let mode = 'quick'; // 'quick' | 'login' | 'signup'
  const currentProfile = state?.profile || 'ram';
  const currentUser = authService.getCurrentUser();

  function renderContent() {
    if (currentUser) {
      modal.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Account Profile</h2>
          <p style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
            Logged in as <strong>${currentUser.email || currentUser.displayName || 'User'}</strong>
          </p>
        </div>

        <div style="background: var(--color-surface-subtle); border-radius: 14px; padding: 16px; margin: 16px 0; border: 1.5px solid var(--color-border-subtle);">
          <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); margin-bottom: 4px;">Active Character</div>
          <div style="font-size: 16px; font-weight: 700; color: var(--color-text-primary);">${state?.character?.name || currentProfile}</div>
          <div style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-secondary); margin-top: 4px;">ID: ${state?.syncKey || currentUser.uid}</div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="btn-logout" class="btn-secondary" style="flex: 1; padding: 12px; color: var(--color-danger); border-color: var(--color-border-subtle);">
            Sign Out
          </button>
          <button id="btn-done" class="btn-primary" style="flex: 1; padding: 12px;">
            Done
          </button>
        </div>
      `;

      modal.querySelector('#btn-done').addEventListener('click', onClose);
      modal.querySelector('#btn-logout').addEventListener('click', async () => {
        haptics.impactMedium?.();
        await authService.signOut();
        renderContent();
      });
      return;
    }

    modal.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
          ${mode === 'quick' ? 'Account Setup' : (mode === 'login' ? 'Sign In' : 'Create Character Account')}
        </h2>
        <p style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
          ${mode === 'quick' ? 'Choose your profile or create an authenticated account.' : 'Your data syncs securely across all your devices.'}
        </p>
      </div>

      <!-- Mode Switcher -->
      <div style="display: flex; background: var(--color-surface-subtle); border-radius: 10px; padding: 3px; margin: 14px 0;">
        <button id="tab-quick" style="flex: 1; padding: 7px 10px; font-size: 12px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: all 150ms ease; ${mode === 'quick' ? 'background: var(--color-surface); color: var(--color-text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: var(--color-text-tertiary);'}">
          Quick Profile
        </button>
        <button id="tab-login" style="flex: 1; padding: 7px 10px; font-size: 12px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: all 150ms ease; ${mode === 'login' ? 'background: var(--color-surface); color: var(--color-text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: var(--color-text-tertiary);'}">
          Log In
        </button>
        <button id="tab-signup" style="flex: 1; padding: 7px 10px; font-size: 12px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: all 150ms ease; ${mode === 'signup' ? 'background: var(--color-surface); color: var(--color-text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: var(--color-text-tertiary);'}">
          Sign Up
        </button>
      </div>

      <div id="auth-panel">
        ${mode === 'quick' ? `
          <div style="display: flex; flex-direction: column; gap: 10px; padding: 4px 0 12px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.05em;">
              Select Active Persona
            </div>
            <button id="btn-quick-ram" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: ${currentProfile === 'ram' ? 'var(--color-surface-subtle)' : 'transparent'}; border: 1.5px solid ${currentProfile === 'ram' ? 'var(--color-text-primary)' : 'var(--color-border)'}; border-radius: 12px; cursor: pointer; text-align: left; width: 100%;">
              <div>
                <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary);">Ram</div>
                <div style="font-size: 12px; color: var(--color-text-secondary);">Core habits, workout, deep work</div>
              </div>
              ${currentProfile === 'ram' ? '<span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #111; color: #fff; padding: 3px 8px; border-radius: 6px;">Active</span>' : ''}
            </button>

            <button id="btn-quick-sister" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: ${currentProfile === 'sister' ? 'var(--color-surface-subtle)' : 'transparent'}; border: 1.5px solid ${currentProfile === 'sister' ? 'var(--color-text-primary)' : 'var(--color-border)'}; border-radius: 12px; cursor: pointer; text-align: left; width: 100%;">
              <div>
                <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary);">Sister</div>
                <div style="font-size: 12px; color: var(--color-text-secondary);">Daily cooking, fresh supplies, home living</div>
              </div>
              ${currentProfile === 'sister' ? '<span style="font-size: 11px; font-weight: 700; text-transform: uppercase; background: #111; color: #fff; padding: 3px 8px; border-radius: 6px;">Active</span>' : ''}
            </button>
          </div>
        ` : `
          <form id="auth-form" style="display: flex; flex-direction: column; gap: 12px; padding: 4px 0 10px;">
            ${mode === 'signup' ? `
              <div>
                <label style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary);">Character Name</label>
                <input type="text" id="auth-name" class="add-task-input-v2" placeholder="e.g. Ram / Sister" required autocomplete="name" style="width: 100%; box-sizing: border-box; margin-top: 4px;"/>
              </div>
            ` : ''}
            <div>
              <label style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary);">Email</label>
              <input type="email" id="auth-email" class="add-task-input-v2" placeholder="name@domain.com" required autocomplete="email" style="width: 100%; box-sizing: border-box; margin-top: 4px;"/>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary);">Password</label>
              <input type="password" id="auth-password" class="add-task-input-v2" placeholder="••••••••" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" style="width: 100%; box-sizing: border-box; margin-top: 4px;"/>
            </div>

            <div id="auth-error" style="font-size: 12px; color: var(--color-danger); display: none; margin-top: 2px;"></div>

            <button type="submit" id="btn-auth-submit" class="btn-primary" style="padding: 13px; font-size: 14px; font-weight: 600; margin-top: 6px;">
              ${mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        `}
      </div>

      <button id="btn-close-auth" class="action-sheet-cancel" style="margin-top: 8px; width: 100%;">Close</button>
    `;

    modal.querySelector('#btn-close-auth').addEventListener('click', onClose);

    const tabQuick = modal.querySelector('#tab-quick');
    const tabLogin = modal.querySelector('#tab-login');
    const tabSignup = modal.querySelector('#tab-signup');

    if (tabQuick) tabQuick.addEventListener('click', () => { mode = 'quick'; renderContent(); });
    if (tabLogin) tabLogin.addEventListener('click', () => { mode = 'login'; renderContent(); });
    if (tabSignup) tabSignup.addEventListener('click', () => { mode = 'signup'; renderContent(); });

    const btnRam = modal.querySelector('#btn-quick-ram');
    const btnSister = modal.querySelector('#btn-quick-sister');

    if (btnRam) {
      btnRam.addEventListener('click', () => {
        haptics.impactMedium?.();
        if (onSwitchProfile) onSwitchProfile('ram');
        onClose();
      });
    }

    if (btnSister) {
      btnSister.addEventListener('click', () => {
        haptics.impactMedium?.();
        if (onSwitchProfile) onSwitchProfile('sister');
        onClose();
      });
    }

    const form = modal.querySelector('#auth-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = modal.querySelector('#auth-email')?.value.trim();
        const password = modal.querySelector('#auth-password')?.value;
        const nameInput = modal.querySelector('#auth-name');
        const name = nameInput ? nameInput.value.trim() : 'Ram';
        const errorEl = modal.querySelector('#auth-error');
        const submitBtn = modal.querySelector('#btn-auth-submit');

        if (!email || !password) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing…';
        errorEl.style.display = 'none';

        try {
          if (mode === 'signup') {
            await authService.signUp(email, password, name);
          } else {
            await authService.signIn(email, password);
          }
          haptics.impactMedium?.();
          if (onAuthSuccess) onAuthSuccess(authService.getCurrentUser());
          onClose();
        } catch (err) {
          haptics.notificationError?.();
          errorEl.textContent = err.message || 'Authentication error.';
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
        }
      });
    }
  }

  renderContent();
  backdrop.appendChild(modal);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose();
  });

  return backdrop;
}

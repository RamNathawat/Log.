import { haptics } from '../services/hapticsService.js';
import { pairingService } from '../services/pairingService.js';

export function renderPairModal(state, onPairSuccess, onUnpairSuccess, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.style.maxWidth = '420px';

  const currentUserId = state?.syncKey || (state?.profile === 'sister' ? 'OS1837' : 'OS2290');
  const currentUserName = state?.character?.name || (state?.profile === 'sister' ? 'Sister' : 'Ram');
  const currentProfile = state?.profile || 'ram';
  const pairedWith = state?.pairedWith || null;

  let activeTab = 'generate'; // 'generate' | 'enter'
  let generatedCode = null;
  let codeTimer = null;

  function renderContent() {
    if (pairedWith && pairedWith.uid) {
      modal.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Sibling Link</h2>
          <p style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
            Your account is paired in real time. Task trades and barter requests sync automatically.
          </p>
        </div>

        <div style="background: var(--color-surface-subtle); border-radius: 14px; padding: 16px; margin: 16px 0; border: 1.5px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">
              ${(pairedWith.name || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--color-text-primary);">${pairedWith.name || 'Sibling'}</div>
              <div style="font-size: 11.5px; color: #10B981; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                Connected &amp; Synced
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button id="btn-unpair" class="btn-secondary" style="flex: 1; padding: 12px; color: var(--color-danger); border-color: var(--color-border-subtle);">
            Disconnect Link
          </button>
          <button id="btn-done" class="btn-primary" style="flex: 1; padding: 12px;">
            Done
          </button>
        </div>
      `;

      modal.querySelector('#btn-done').addEventListener('click', onClose);
      modal.querySelector('#btn-unpair').addEventListener('click', async () => {
        haptics.impactMedium?.();
        if (confirm(`Disconnect link with ${pairedWith.name || 'Sibling'}?`)) {
          await pairingService.unpair(currentUserId, pairedWith.uid);
          if (onUnpairSuccess) onUnpairSuccess();
          onClose();
        }
      });
      return;
    }

    modal.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Link Sibling Account</h2>
        <p style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.45;">
          Connect with your sibling's device using a 6-digit sync code for seamless task trading.
        </p>
      </div>

      <!-- Segmented Tab Switcher -->
      <div style="display: flex; background: var(--color-surface-subtle); border-radius: 10px; padding: 3px; margin: 14px 0;">
        <button id="tab-gen" style="flex: 1; padding: 8px 12px; font-size: 12.5px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: all 150ms ease; ${activeTab === 'generate' ? 'background: var(--color-surface); color: var(--color-text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: var(--color-text-tertiary);'}">
          Get 6-Digit Code
        </button>
        <button id="tab-enter" style="flex: 1; padding: 8px 12px; font-size: 12.5px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: all 150ms ease; ${activeTab === 'enter' ? 'background: var(--color-surface); color: var(--color-text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : 'background: transparent; color: var(--color-text-tertiary);'}">
          Enter Code
        </button>
      </div>

      <div id="tab-panel">
        ${activeTab === 'generate' ? `
          <div style="display: flex; flex-direction: column; align-items: center; padding: 12px 0 8px;">
            <span style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary); letter-spacing: 0.08em; margin-bottom: 8px;">
              Your Pairing Code
            </span>
            <div id="code-display" style="font-family: var(--font-mono); font-size: 32px; font-weight: 800; letter-spacing: 0.2em; color: var(--color-text-primary); background: var(--color-surface-subtle); padding: 14px 24px; border-radius: 14px; border: 1.5px solid var(--color-border); margin-bottom: 12px; user-select: all; cursor: pointer;">
              ${generatedCode || '------'}
            </div>
            <p style="font-size: 12px; color: var(--color-text-secondary); text-align: center; margin-bottom: 16px; line-height: 1.4;">
              Share this code with your sibling. Tell them to tap <strong>"Enter Code"</strong> on their phone.
            </p>
            <div style="display: flex; gap: 8px; width: 100%;">
              <button id="btn-gen-code" class="btn-primary" style="flex: 1; padding: 12px; font-size: 13.5px; font-weight: 600;">
                ${generatedCode ? 'Generate New Code' : 'Generate Code'}
              </button>
              ${generatedCode ? `
                <button id="btn-copy-code" class="btn-secondary" style="padding: 12px 18px;">
                  Copy
                </button>
              ` : ''}
            </div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 0;">
            <label for="input-code" style="font-size: 12px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-tertiary);">
              Enter Sibling's 6-Digit Code
            </label>
            <input type="text" id="input-code" maxlength="6" inputmode="numeric" placeholder="e.g. 849201"
                   class="add-task-input-v2"
                   style="font-size: 24px; font-family: var(--font-mono); font-weight: 700; text-align: center; letter-spacing: 0.25em; padding: 12px;"
                   autocomplete="off" />
            <div id="error-msg" style="font-size: 12px; color: var(--color-danger); display: none; text-align: center;"></div>
            <button id="btn-connect" class="btn-primary" style="padding: 13px; font-size: 14px; font-weight: 600; margin-top: 4px;">
              Connect &amp; Pair Device
            </button>
          </div>
        `}
      </div>

      <button id="btn-close-modal" class="action-sheet-cancel" style="margin-top: 14px; width: 100%;">Cancel</button>
    `;

    // Event listeners
    modal.querySelector('#btn-close-modal').addEventListener('click', onClose);

    const tabGen = modal.querySelector('#tab-gen');
    const tabEnter = modal.querySelector('#tab-enter');

    if (tabGen) {
      tabGen.addEventListener('click', () => {
        activeTab = 'generate';
        renderContent();
      });
    }

    if (tabEnter) {
      tabEnter.addEventListener('click', () => {
        activeTab = 'enter';
        renderContent();
      });
    }

    const genBtn = modal.querySelector('#btn-gen-code');
    if (genBtn) {
      genBtn.addEventListener('click', async () => {
        haptics.impactMedium?.();
        genBtn.disabled = true;
        genBtn.textContent = 'Generating…';
        try {
          const res = await pairingService.generatePairCode(currentUserId, currentUserName, currentProfile);
          generatedCode = res.code;
          renderContent();
        } catch (e) {
          alert('Could not generate code: ' + (e.message || e));
          renderContent();
        }
      });
    }

    const copyBtn = modal.querySelector('#btn-copy-code');
    if (copyBtn && generatedCode) {
      copyBtn.addEventListener('click', () => {
        haptics.impactLight?.();
        navigator.clipboard?.writeText(generatedCode);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { if (copyBtn) copyBtn.textContent = 'Copy'; }, 1800);
      });
    }

    const connectBtn = modal.querySelector('#btn-connect');
    const inputCode = modal.querySelector('#input-code');
    const errorMsg = modal.querySelector('#error-msg');

    if (connectBtn && inputCode) {
      const doConnect = async () => {
        const val = inputCode.value.trim();
        if (val.length !== 6) {
          errorMsg.textContent = 'Please enter a valid 6-digit code.';
          errorMsg.style.display = 'block';
          return;
        }

        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting…';
        errorMsg.style.display = 'none';

        try {
          const res = await pairingService.redeemPairCode(val, currentUserId, currentUserName, currentProfile);
          haptics.impactMedium?.();
          if (onPairSuccess) onPairSuccess(res.partner);
          onClose();
        } catch (err) {
          haptics.notificationError?.();
          errorMsg.textContent = err.message || 'Failed to connect code.';
          errorMsg.style.display = 'block';
          connectBtn.disabled = false;
          connectBtn.textContent = 'Connect & Pair Device';
        }
      };

      connectBtn.addEventListener('click', doConnect);
      inputCode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConnect();
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

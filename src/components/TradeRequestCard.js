import { haptics } from '../services/hapticsService.js';
import { renderTradeModal } from './TradeModal.js';

export function renderTradeRequestCards(trades, currentSyncKey, availableTasks, onRespond, onCounter) {
  if (!trades || trades.length === 0) return null;

  // Filter trades that need attention from current user:
  // 1. Pending trade targeting current user (toUser === currentSyncKey && status === 'PENDING')
  // 2. Counter-offer sent back to current user (fromUser === currentSyncKey && status === 'COUNTER_OFFER')
  const pendingTrades = trades.filter(t => {
    if (t.status === 'PENDING' && t.toUser === currentSyncKey) return true;
    if (t.status === 'COUNTER_OFFER' && t.fromUser === currentSyncKey) return true;
    return false;
  });

  if (pendingTrades.length === 0) return null;

  const container = document.createElement('div');
  container.className = 'trade-requests-container';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '10px';
  container.style.marginBottom = '16px';

  pendingTrades.forEach(trade => {
    const isCounter = trade.status === 'COUNTER_OFFER';
    const senderName = isCounter ? (trade.counterOffer?.fromName || 'Sibling') : (trade.fromName || 'Sibling');
    const noteText = isCounter ? (trade.counterOffer?.note || trade.note) : trade.note;
    const swapText = isCounter ? (trade.counterOffer?.swapTaskName || trade.swapTaskName) : trade.swapTaskName;

    const card = document.createElement('div');
    card.className = 'trade-request-card';
    card.style.background = 'var(--color-surface-card)';
    card.style.border = '1.5px solid var(--color-border)';
    card.style.borderRadius = '16px';
    card.style.padding = '14px 16px';
    card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 10px; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em; background: var(--color-text-primary); color: var(--color-surface); padding: 2px 8px; border-radius: 9999px;">
            ${isCounter ? 'Counter Proposal' : 'Task Trade Request'}
          </span>
          <span style="font-size: 11px; color: var(--color-text-tertiary);">from ${senderName}</span>
        </div>
      </div>

      <div style="font-size: 14px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 4px;">
        ${trade.taskName}
      </div>

      ${noteText ? `
        <div style="font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 6px; background: var(--color-surface-subtle); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--color-border-subtle);">
          <strong style="color: var(--color-text-primary);">Offer:</strong> "${noteText}"
        </div>
      ` : ''}

      ${swapText ? `
        <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">
          ⇄ Swap with: <strong style="color: var(--color-text-primary);">${swapText}</strong>
        </div>
      ` : ''}

      <div style="display: flex; gap: 6px; margin-top: 10px;">
        <button class="btn-trade-accept" style="flex: 1; padding: 8px 12px; background: var(--color-text-primary); color: var(--color-surface); border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font-sans);">
          Accept
        </button>
        <button class="btn-trade-counter" style="padding: 8px 12px; background: var(--color-surface-subtle); color: var(--color-text-primary); border: 1.5px solid var(--color-border); border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font-sans);">
          Counter
        </button>
        <button class="btn-trade-decline" style="padding: 8px 12px; background: transparent; color: var(--color-text-tertiary); border: 1.5px solid var(--color-border-subtle); border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: var(--font-sans);">
          Decline
        </button>
      </div>
    `;

    card.querySelector('.btn-trade-accept').addEventListener('click', () => {
      haptics.impactMedium?.();
      onRespond(trade.id, 'ACCEPT');
    });

    card.querySelector('.btn-trade-decline').addEventListener('click', () => {
      haptics.impactLight?.();
      onRespond(trade.id, 'DECLINE');
    });

    card.querySelector('.btn-trade-counter').addEventListener('click', () => {
      haptics.impactLight?.();
      renderTradeModal(
        { id: trade.taskId, name: trade.taskName },
        trade.taskType,
        availableTasks,
        (counterData) => {
          onRespond(trade.id, 'COUNTER', counterData);
        },
        null,
        true
      );
    });

    container.appendChild(card);
  });

  return container;
}

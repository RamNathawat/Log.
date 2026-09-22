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

  // Ensure reading and workout are NEVER in the swap list for counter offers
  const strictlyTradeableTasks = (availableTasks || []).filter(t => 
    t.isTradeable !== false && 
    t.id !== 'reading' && 
    t.id !== 'workout' && 
    !t.id.startsWith('reading') && 
    !t.id.startsWith('workout')
  );

  pendingTrades.forEach(trade => {
    const isCounter = trade.status === 'COUNTER_OFFER';
    const senderName = isCounter ? (trade.counterOffer?.fromName || 'Sibling') : (trade.fromName || 'Sibling');
    const noteText = isCounter ? (trade.counterOffer?.note || trade.note) : trade.note;
    const swapText = isCounter ? (trade.counterOffer?.swapTaskName || trade.swapTaskName) : trade.swapTaskName;

    const card = document.createElement('div');
    card.className = 'trade-request-card';

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
        <span class="category-pill pill-neutral" style="font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em;">
          ${isCounter ? 'Counter Proposal' : 'Trade Request'}
        </span>
        <span style="font-size: 11.5px; color: var(--color-text-tertiary);">from ${senderName}</span>
      </div>

      <div style="font-size: 16px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; margin-bottom: ${(noteText || swapText) ? '8px' : '0'};">
        ${trade.taskName}
      </div>

      ${swapText ? `
        <div style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--color-text-secondary); margin-bottom: ${noteText ? '6px' : '0'};">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.6">
            <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l4-4M17 20l-4-4"/>
          </svg>
          Swap with: <span style="font-weight: 700; color: var(--color-text-primary);">${swapText}</span>
        </div>
      ` : ''}

      ${noteText ? `
        <div style="font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 2px; font-style: italic;">
          "${noteText}"
        </div>
      ` : ''}

      <!-- Accept: full-width, tall, unmissable -->
      <button class="btn-trade-accept" style="
        display: block;
        width: 100%;
        margin-top: 14px;
        padding: 13px 16px;
        background: #111111;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: -0.01em;
        cursor: pointer;
        font-family: var(--font-sans);
        transition: opacity 120ms ease;
        -webkit-tap-highlight-color: transparent;
      ">Accept</button>

      <!-- Counter + Decline: secondary row -->
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn-trade-counter" style="
          flex: 1;
          padding: 11px 14px;
          background: var(--color-surface-subtle);
          color: var(--color-text-primary);
          border: 1.5px solid var(--color-border);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--font-sans);
          -webkit-tap-highlight-color: transparent;
        ">Counter</button>
        <button class="btn-trade-decline" style="
          flex: 1;
          padding: 11px 14px;
          background: transparent;
          color: var(--color-text-tertiary);
          border: 1.5px solid var(--color-border-subtle);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: var(--font-sans);
          -webkit-tap-highlight-color: transparent;
        ">Decline</button>
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
        strictlyTradeableTasks,
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

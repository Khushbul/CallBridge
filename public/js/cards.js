/**
 * Authentic Sprite-Based Card Renderer for CallBridge
 * Renders official high-resolution Cricket 2025 illustrated playing cards
 * from the extracted master spritesheet (cricket2025_card_spritesheet.webp).
 */

const SUIT_ROWS = {
  diamonds: 0,
  clubs: 1,
  hearts: 2,
  spades: 3
};

class CardRenderer {
  /**
   * Create an interactive Card DOM element using the Cricket 2025 spritesheet
   */
  static createCardElement(card, options = {}) {
    const el = document.createElement('div');
    el.className = 'playing-card';
    el.dataset.id = card ? card.id : 'back';

    if (options.isBack || !card) {
      el.classList.add('card-back');
      // Card back is at col 0, row 4 (100% Y)
      el.style.backgroundImage = "url('assets/cricket2025_card_spritesheet.webp')";
      el.style.backgroundSize = '1300% 500%';
      el.style.backgroundPosition = '0% 100%';
      return el;
    }

    el.classList.add(`suit-${card.suit}`);
    el.dataset.suit = card.suit;
    el.dataset.rank = card.rank;

    if (card.isTrump || card.suit === 'spades') {
      el.classList.add('is-trump');
    }

    // Map rank (2..14) to column (0..12)
    // 2=0, 3=1, 4=2, 5=3, 6=4, 7=5, 8=6, 9=7, 10=8, 11(J)=9, 12(Q)=10, 13(K)=11, 14(A)=12
    const col = Math.max(0, Math.min(12, card.rank - 2));
    const row = SUIT_ROWS[card.suit] !== undefined ? SUIT_ROWS[card.suit] : 0;

    // Background position in percentage
    const posX = ((col / 12) * 100).toFixed(4);
    const posY = ((row / 4) * 100).toFixed(4);

    el.style.backgroundImage = "url('assets/cricket2025_card_spritesheet.webp')";
    el.style.backgroundSize = '1300% 500%';
    el.style.backgroundPosition = `${posX}% ${posY}%`;
    el.style.backgroundRepeat = 'no-repeat';

    return el;
  }

  /**
   * Create a miniature or fan card back element
   */
  static createCardBack() {
    return this.createCardElement(null, { isBack: true });
  }
}

window.CardRenderer = CardRenderer;

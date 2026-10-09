/**
 * Smart Heuristic AI for Callbreak
 * Evaluates hand strength for bidding and selects optimal legal moves.
 */

const { SUITS } = require('./engine');

class CallbreakAI {
  /**
   * Calculate smart bid (1 to 8) based on hand composition
   */
  static calculateBid(hand) {
    let estimatedTricks = 0;

    const suits = {
      [SUITS.SPADES]: [],
      [SUITS.HEARTS]: [],
      [SUITS.DIAMONDS]: [],
      [SUITS.CLUBS]: []
    };

    hand.forEach(card => {
      suits[card.suit].push(card);
    });

    // 1. Spades (Trump) tricks evaluation
    const spades = suits[SUITS.SPADES];
    const spadeRanks = spades.map(c => c.rank);

    if (spadeRanks.includes(14)) estimatedTricks += 1.0; // Ace of Spades
    if (spadeRanks.includes(13)) estimatedTricks += (spades.length >= 2 ? 0.9 : 0.6); // King of Spades
    if (spadeRanks.includes(12)) estimatedTricks += (spades.length >= 3 ? 0.7 : 0.4); // Queen of Spades
    if (spadeRanks.includes(11)) estimatedTricks += (spades.length >= 4 ? 0.5 : 0.2); // Jack of Spades

    // Long spade trump bonus (ruffing capability)
    if (spades.length >= 5) estimatedTricks += (spades.length - 4) * 0.7;

    // 2. Off-suit high cards evaluation
    for (const suit of [SUITS.HEARTS, SUITS.DIAMONDS, SUITS.CLUBS]) {
      const cardsInSuit = suits[suit];
      const ranks = cardsInSuit.map(c => c.rank);
      const count = cardsInSuit.length;

      // Ace of off-suit
      if (ranks.includes(14)) {
        if (count <= 4) estimatedTricks += 0.95;
        else estimatedTricks += 0.7; // Risk of getting trumped if too long
      }

      // King of off-suit
      if (ranks.includes(13)) {
        if (count >= 2 && count <= 4) {
          estimatedTricks += ranks.includes(14) ? 0.9 : 0.6;
        }
      }

      // Queen with protection
      if (ranks.includes(12) && ranks.includes(14) && count >= 3) {
        estimatedTricks += 0.5;
      }

      // Short suit ruffing bonus if we have spare spades
      if (count === 0 && spades.length > 2) estimatedTricks += 0.7;
      else if (count === 1 && spades.length > 3 && !ranks.includes(14)) estimatedTricks += 0.4;
    }

    // Callbreak bids are integers between 1 and 8 (rarely 9+)
    let bid = Math.round(estimatedTricks);
    if (bid < 1) bid = 1;
    if (bid > 8) bid = 8;
    return bid;
  }

  /**
   * Select best legal card to play in current trick
   */
  static chooseCard(playerIndex, game) {
    const legalCards = game.getLegalCards(playerIndex);
    if (legalCards.length === 1) return legalCards[0];

    const currentTrick = game.currentTrick;
    const bid = game.bids[playerIndex];
    const won = game.tricksWon[playerIndex];
    const stillNeedsTricks = won < bid;

    // Case 1: Leading the trick
    if (currentTrick.length === 0) {
      return this.chooseLeadCard(legalCards, stillNeedsTricks, game);
    }

    // Case 2: Following in trick
    return this.chooseFollowCard(legalCards, currentTrick, stillNeedsTricks, game);
  }

  static chooseLeadCard(legalCards, stillNeedsTricks, game) {
    // If still needs tricks, lead high master cards (Ace of non-trump, or top trumps)
    if (stillNeedsTricks) {
      // Find Aces of non-trump suits
      const nonTrumpAces = legalCards.filter(c => c.rank === 14 && c.suit !== SUITS.SPADES);
      if (nonTrumpAces.length > 0) return nonTrumpAces[0];

      // Find Kings if we know Ace has been played or we hold it
      const nonTrumpKings = legalCards.filter(c => c.rank === 13 && c.suit !== SUITS.SPADES);
      if (nonTrumpKings.length > 0) return nonTrumpKings[0];

      // Otherwise lead lowest card of our longest suit
      const nonTrumps = legalCards.filter(c => c.suit !== SUITS.SPADES);
      if (nonTrumps.length > 0) {
        // Return lowest rank non-trump
        return nonTrumps.sort((a, b) => a.rank - b.rank)[0];
      }
    }

    // If bid already satisfied, minimize risk of taking excess overtricks (or avoid losing points)
    // Play lowest rank card available
    return legalCards.sort((a, b) => a.rank - b.rank)[0];
  }

  static chooseFollowCard(legalCards, currentTrick, stillNeedsTricks, game) {
    const winningPlay = this.getWinningPlay(currentTrick);

    // Filter cards that can win this trick
    const winningCards = legalCards.filter(card => {
      if (card.suit === SUITS.SPADES && winningPlay.card.suit !== SUITS.SPADES) return true;
      if (card.suit === winningPlay.card.suit && card.rank > winningPlay.card.rank) return true;
      return false;
    });

    if (stillNeedsTricks && winningCards.length > 0) {
      // We want to win: play lowest winning card to save higher cards for later
      winningCards.sort((a, b) => a.rank - b.rank);
      return winningCards[0];
    }

    // If we don't want to win or cannot win, discard the lowest rank card
    legalCards.sort((a, b) => a.rank - b.rank);
    return legalCards[0];
  }

  static getWinningPlay(trick) {
    let winning = trick[0];
    for (let i = 1; i < trick.length; i++) {
      const play = trick[i];
      if (play.card.suit === SUITS.SPADES) {
        if (winning.card.suit !== SUITS.SPADES || play.card.rank > winning.card.rank) {
          winning = play;
        }
      } else if (play.card.suit === winning.card.suit && play.card.rank > winning.card.rank) {
        winning = play;
      }
    }
    return winning;
  }
}

module.exports = CallbreakAI;

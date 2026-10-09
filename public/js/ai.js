/**
 * Client-Side AI for Offline Callbreak
 */

class ClientAI {
  static calculateBid(hand) {
    let tricks = 0;
    const suits = { spades: [], hearts: [], diamonds: [], clubs: [] };
    hand.forEach(c => suits[c.suit].push(c));

    const spades = suits.spades;
    const ranks = spades.map(c => c.rank);
    if (ranks.includes(14)) tricks += 1.0;
    if (ranks.includes(13)) tricks += (spades.length >= 2 ? 0.9 : 0.6);
    if (ranks.includes(12)) tricks += (spades.length >= 3 ? 0.7 : 0.4);
    if (ranks.includes(11)) tricks += (spades.length >= 4 ? 0.5 : 0.2);
    if (spades.length >= 5) tricks += (spades.length - 4) * 0.7;

    for (const suit of ['hearts', 'diamonds', 'clubs']) {
      const cards = suits[suit];
      const r = cards.map(c => c.rank);
      if (r.includes(14)) tricks += (cards.length <= 4 ? 0.95 : 0.7);
      if (r.includes(13) && cards.length >= 2) tricks += (r.includes(14) ? 0.9 : 0.6);
      if (r.includes(12) && r.includes(14) && cards.length >= 3) tricks += 0.5;
      if (cards.length === 0 && spades.length > 2) tricks += 0.7;
    }

    let bid = Math.round(tricks);
    if (bid < 1) bid = 1;
    if (bid > 8) bid = 8;
    return bid;
  }

  static chooseCard(seatIndex, game) {
    const legal = game.getLegalCards(seatIndex);
    if (legal.length === 1) return legal[0];

    const trick = game.currentTrick;
    const bid = game.bids[seatIndex];
    const won = game.tricksWon[seatIndex];
    const needsTricks = won < bid;

    if (trick.length === 0) {
      if (needsTricks) {
        const nonTrumpAces = legal.filter(c => c.rank === 14 && c.suit !== 'spades');
        if (nonTrumpAces.length > 0) return nonTrumpAces[0];
        const nonTrumpKings = legal.filter(c => c.rank === 13 && c.suit !== 'spades');
        if (nonTrumpKings.length > 0) return nonTrumpKings[0];
      }
      return legal.sort((a, b) => a.rank - b.rank)[0];
    }

    let winning = trick[0];
    for (let i = 1; i < trick.length; i++) {
      const play = trick[i];
      if (play.card.suit === 'spades') {
        if (winning.card.suit !== 'spades' || play.card.rank > winning.card.rank) winning = play;
      } else if (play.card.suit === winning.card.suit && play.card.rank > winning.card.rank) {
        winning = play;
      }
    }

    const winningCards = legal.filter(card => {
      if (card.suit === 'spades' && winning.card.suit !== 'spades') return true;
      if (card.suit === winning.card.suit && card.rank > winning.card.rank) return true;
      return false;
    });

    if (needsTricks && winningCards.length > 0) {
      winningCards.sort((a, b) => a.rank - b.rank);
      return winningCards[0];
    }

    legal.sort((a, b) => a.rank - b.rank);
    return legal[0];
  }
}

window.ClientAI = ClientAI;

/**
 * Callbreak Game Engine (Authoritative)
 * Implements standard international/South Asian Callbreak rules:
 * - 52-card standard deck, 13 cards per player
 * - Permanent Trump: Spades (♠)
 * - Strict Follow-Suit and Higher-Card play rules
 * - Bidding 1 to 8 (or up to 13)
 * - Accurate Callbreak decimal scoring
 * - Selectable match lengths: 5, 10, 15, or 20 rounds
 */

const SUITS = {
  SPADES: 'spades',
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs'
};

const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣'
};

const SUIT_ORDER = ['spades', 'hearts', 'clubs', 'diamonds'];

// Ranks: 2 to 14 (14 is Ace)
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.id = `${suit}_${rank}`;
  }

  get isTrump() {
    return this.suit === SUITS.SPADES;
  }

  get label() {
    return `${RANK_LABELS[this.rank]}${SUIT_SYMBOLS[this.suit]}`;
  }

  toJSON() {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      label: this.label,
      isTrump: this.isTrump
    };
  }
}

class Deck {
  static createStandardDeck() {
    const cards = [];
    for (const suit of Object.values(SUITS)) {
      for (const rank of RANKS) {
        cards.push(new Card(suit, rank));
      }
    }
    return cards;
  }

  static shuffle(cards) {
    const array = [...cards];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  static deal() {
    const deck = Deck.shuffle(Deck.createStandardDeck());
    const hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
      hands[i % 4].push(deck[i]);
    }
    // Sort hands by suit and rank descending
    hands.forEach(hand => Deck.sortHand(hand));
    return hands;
  }

  static sortHand(hand) {
    return hand.sort((a, b) => {
      const suitDiff = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return b.rank - a.rank; // Higher rank first
    });
  }
}

class CallbreakGame {
  constructor(options = {}) {
    this.id = options.id || Math.random().toString(36).substring(2, 8).toUpperCase();
    this.totalRounds = options.totalRounds || 5; // 5, 10, 15, or 20
    this.currentRound = 1;
    this.players = options.players || []; // 4 players: { id, name, isBot, seatIndex }
    
    // Round state
    this.roundState = 'WAITING'; // WAITING, BIDDING, PLAYING, ROUND_OVER, GAME_OVER
    this.dealerIndex = 0;
    this.currentTurnIndex = 1; // starts with player next to dealer
    this.hands = [[], [], [], []]; // Array of Card arrays
    this.bids = [null, null, null, null];
    this.tricksWon = [0, 0, 0, 0];
    
    // Current trick
    this.currentTrick = []; // [{ playerIndex, card: Card }]
    this.leadSuit = null;
    this.trickHistory = []; // list of 13 tricks in the round
    
    // Multi-round scoring ledger
    // scores[roundIndex][playerIndex] = score earned in that round
    this.scores = [];
    this.totalScores = [0, 0, 0, 0];
  }

  startMatch() {
    this.currentRound = 1;
    this.dealerIndex = 0;
    this.scores = [];
    this.totalScores = [0, 0, 0, 0];
    this.startRound();
  }

  startRound() {
    this.roundState = 'BIDDING';
    this.hands = Deck.deal();
    this.bids = [null, null, null, null];
    this.tricksWon = [0, 0, 0, 0];
    this.currentTrick = [];
    this.leadSuit = null;
    this.trickHistory = [];
    
    // Player to the right of dealer bids/leads first
    this.currentTurnIndex = (this.dealerIndex + 1) % 4;
  }

  /**
   * Submit bid for a player
   */
  makeBid(playerIndex, bidValue) {
    if (this.roundState !== 'BIDDING') {
      throw new Error('Not in bidding phase');
    }
    if (playerIndex !== this.currentTurnIndex) {
      throw new Error(`Not player ${playerIndex}'s turn to bid`);
    }
    const val = parseInt(bidValue, 10);
    if (isNaN(val) || val < 1 || val > 13) {
      throw new Error('Bid must be between 1 and 13');
    }

    this.bids[playerIndex] = val;

    // Check if all players have bid
    const allBid = this.bids.every(b => b !== null);
    if (allBid) {
      this.roundState = 'PLAYING';
      // First trick lead is the player to the right of dealer
      this.currentTurnIndex = (this.dealerIndex + 1) % 4;
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % 4;
    }

    return {
      playerIndex,
      bid: val,
      allBid,
      nextTurn: this.currentTurnIndex,
      roundState: this.roundState
    };
  }

  /**
   * Get legal cards a player is allowed to play in the current trick
   */
  getLegalCards(playerIndex) {
    const hand = this.hands[playerIndex];
    if (!hand || hand.length === 0) return [];

    // If leading the trick, any card is legal
    if (this.currentTrick.length === 0) {
      return [...hand];
    }

    const leadSuit = this.currentTrick[0].card.suit;
    const sameSuitCards = hand.filter(c => c.suit === leadSuit);

    // Identify current highest winning card in the trick so far
    let highestCardInTrick = this.currentTrick[0].card;
    for (let i = 1; i < this.currentTrick.length; i++) {
      const tc = this.currentTrick[i].card;
      if (tc.suit === SUITS.SPADES && highestCardInTrick.suit !== SUITS.SPADES) {
        highestCardInTrick = tc;
      } else if (tc.suit === highestCardInTrick.suit && tc.rank > highestCardInTrick.rank) {
        highestCardInTrick = tc;
      }
    }

    // Rule 1: If player has cards of the led suit, they MUST play the led suit.
    if (sameSuitCards.length > 0) {
      // Rule 2: In Callbreak, player must try to play a higher card of the led suit if possible
      const higherSameSuit = sameSuitCards.filter(c => c.rank > highestCardInTrick.rank);
      if (highestCardInTrick.suit === leadSuit && higherSameSuit.length > 0) {
        return higherSameSuit;
      }
      return sameSuitCards;
    }

    // Rule 3: If void in led suit, player MUST play a Spade (trump) if they have one
    const trumps = hand.filter(c => c.suit === SUITS.SPADES);
    if (trumps.length > 0) {
      // If someone has already played a Spade, must beat it if possible
      if (highestCardInTrick.suit === SUITS.SPADES) {
        const higherTrumps = trumps.filter(c => c.rank > highestCardInTrick.rank);
        if (higherTrumps.length > 0) {
          return higherTrumps;
        }
      }
      return trumps;
    }

    // Rule 4: If void in led suit and void in Spades, any card can be played (discard)
    return [...hand];
  }

  /**
   * Play a card from hand
   */
  playCard(playerIndex, cardId) {
    if (this.roundState !== 'PLAYING') {
      throw new Error('Not in playing phase');
    }
    if (playerIndex !== this.currentTurnIndex) {
      throw new Error(`Not player ${playerIndex}'s turn`);
    }

    const hand = this.hands[playerIndex];
    const cardObj = hand.find(c => c.id === cardId);
    if (!cardObj) {
      throw new Error(`Card ${cardId} not in player's hand`);
    }

    const legalCards = this.getLegalCards(playerIndex);
    const isLegal = legalCards.some(c => c.id === cardId);
    if (!isLegal) {
      throw new Error('Illegal card play according to Callbreak rules');
    }

    // Remove from hand
    const cardIndex = hand.findIndex(c => c.id === cardId);
    hand.splice(cardIndex, 1);

    // Record trick card
    if (this.currentTrick.length === 0) {
      this.leadSuit = cardObj.suit;
    }
    this.currentTrick.push({
      playerIndex,
      card: cardObj
    });

    let trickResult = null;

    // Check if trick is complete (4 cards played)
    if (this.currentTrick.length === 4) {
      const winnerIndex = this.evaluateTrickWinner(this.currentTrick);
      this.tricksWon[winnerIndex] += 1;

      trickResult = {
        trick: [...this.currentTrick],
        winnerIndex,
        tricksWon: [...this.tricksWon]
      };

      this.trickHistory.push(trickResult);
      this.currentTrick = [];
      this.leadSuit = null;
      this.currentTurnIndex = winnerIndex; // Winner leads next trick

      // Check if round is over (13 tricks played)
      if (this.trickHistory.length === 13) {
        this.finishRound();
      }
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % 4;
    }

    return {
      playerIndex,
      card: cardObj,
      trickResult,
      nextTurn: this.currentTurnIndex,
      roundState: this.roundState,
      handsRemaining: this.hands.map(h => h.length)
    };
  }

  evaluateTrickWinner(trick) {
    let winningPlay = trick[0];
    const leadSuit = trick[0].card.suit;

    for (let i = 1; i < trick.length; i++) {
      const play = trick[i];
      const card = play.card;
      const winCard = winningPlay.card;

      if (card.suit === SUITS.SPADES) {
        if (winCard.suit !== SUITS.SPADES) {
          winningPlay = play;
        } else if (card.rank > winCard.rank) {
          winningPlay = play;
        }
      } else if (card.suit === leadSuit && winCard.suit !== SUITS.SPADES) {
        if (card.rank > winCard.rank) {
          winningPlay = play;
        }
      }
    }

    return winningPlay.playerIndex;
  }

  finishRound() {
    this.roundState = 'ROUND_OVER';

    // Calculate round score for each player
    const roundScores = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const bid = this.bids[i];
      const won = this.tricksWon[i];
      let score = 0;

      if (won >= bid) {
        // Made the bid: bid points + 0.1 for every extra trick
        score = bid + (won - bid) * 0.1;
      } else {
        // Failed the bid: negative of the bid
        score = -bid;
      }
      roundScores[i] = parseFloat(score.toFixed(1));
      this.totalScores[i] = parseFloat((this.totalScores[i] + roundScores[i]).toFixed(1));
    }

    this.scores.push({
      round: this.currentRound,
      bids: [...this.bids],
      tricksWon: [...this.tricksWon],
      roundScores: [...roundScores],
      cumulativeScores: [...this.totalScores]
    });

    if (this.currentRound >= this.totalRounds) {
      this.roundState = 'GAME_OVER';
    }
  }

  proceedToNextRound() {
    if (this.roundState !== 'ROUND_OVER') {
      throw new Error('Current round is not over');
    }
    this.currentRound += 1;
    this.dealerIndex = (this.dealerIndex + 1) % 4;
    this.startRound();
    return {
      currentRound: this.currentRound,
      dealerIndex: this.dealerIndex,
      turnIndex: this.currentTurnIndex
    };
  }

  getRankings() {
    return this.players.map((p, idx) => ({
      playerIndex: idx,
      name: p.name,
      totalScore: this.totalScores[idx],
      isBot: p.isBot
    })).sort((a, b) => b.totalScore - a.totalScore);
  }

  getStateForPlayer(playerIndex) {
    return {
      gameId: this.id,
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      roundState: this.roundState,
      dealerIndex: this.dealerIndex,
      currentTurnIndex: this.currentTurnIndex,
      myHand: this.hands[playerIndex] ? this.hands[playerIndex].map(c => c.toJSON()) : [],
      legalCards: (this.roundState === 'PLAYING' && this.currentTurnIndex === playerIndex)
        ? this.getLegalCards(playerIndex).map(c => c.id)
        : [],
      otherHandsCount: this.hands.map(h => h.length),
      bids: [...this.bids],
      tricksWon: [...this.tricksWon],
      currentTrick: this.currentTrick.map(t => ({
        playerIndex: t.playerIndex,
        card: t.card.toJSON()
      })),
      leadSuit: this.leadSuit,
      scores: this.scores,
      totalScores: this.totalScores,
      players: this.players
    };
  }
}

module.exports = {
  SUITS,
  SUIT_SYMBOLS,
  RANKS,
  RANK_LABELS,
  Card,
  Deck,
  CallbreakGame
};

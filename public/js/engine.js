/**
 * Client-Side Callbreak Game Engine Mirror
 * Allows 100% offline single player play without network delay.
 */

const CLIENT_SUITS = {
  SPADES: 'spades',
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs'
};

const CLIENT_SUIT_ORDER = ['spades', 'hearts', 'clubs', 'diamonds'];
const CLIENT_RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

class ClientCard {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
    this.id = `${suit}_${rank}`;
  }

  get isTrump() {
    return this.suit === CLIENT_SUITS.SPADES;
  }
}

class ClientDeck {
  static createStandardDeck() {
    const cards = [];
    for (const suit of Object.values(CLIENT_SUITS)) {
      for (const rank of CLIENT_RANKS) {
        cards.push(new ClientCard(suit, rank));
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
    const deck = ClientDeck.shuffle(ClientDeck.createStandardDeck());
    const hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) {
      hands[i % 4].push(deck[i]);
    }
    hands.forEach(h => ClientDeck.sortHand(h));
    return hands;
  }

  static sortHand(hand) {
    return hand.sort((a, b) => {
      const suitDiff = CLIENT_SUIT_ORDER.indexOf(a.suit) - CLIENT_SUIT_ORDER.indexOf(b.suit);
      if (suitDiff !== 0) return suitDiff;
      return b.rank - a.rank;
    });
  }
}

class ClientCallbreakGame {
  constructor(totalRounds = 5, playerNames = ['You', 'Aryan (AI)', 'Rohan (AI)', 'Kabir (AI)']) {
    this.totalRounds = totalRounds;
    this.currentRound = 1;
    this.players = playerNames.map((name, idx) => ({
      name,
      seatIndex: idx,
      isBot: idx !== 0
    }));

    this.roundState = 'WAITING'; // WAITING, BIDDING, PLAYING, ROUND_OVER, GAME_OVER
    this.dealerIndex = 0;
    this.currentTurnIndex = 1;
    this.hands = [[], [], [], []];
    this.bids = [null, null, null, null];
    this.tricksWon = [0, 0, 0, 0];
    this.currentTrick = [];
    this.trickHistory = [];
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
    this.hands = ClientDeck.deal();
    this.bids = [null, null, null, null];
    this.tricksWon = [0, 0, 0, 0];
    this.currentTrick = [];
    this.trickHistory = [];
    this.currentTurnIndex = (this.dealerIndex + 1) % 4;
  }

  makeBid(seatIndex, bidValue) {
    this.bids[seatIndex] = parseInt(bidValue, 10);
    const allBid = this.bids.every(b => b !== null);
    if (allBid) {
      this.roundState = 'PLAYING';
      this.currentTurnIndex = (this.dealerIndex + 1) % 4;
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % 4;
    }
  }

  getLegalCards(seatIndex) {
    const hand = this.hands[seatIndex];
    if (!hand || hand.length === 0) return [];
    if (this.currentTrick.length === 0) return [...hand];

    const leadSuit = this.currentTrick[0].card.suit;
    const sameSuitCards = hand.filter(c => c.suit === leadSuit);

    let highestCardInTrick = this.currentTrick[0].card;
    for (let i = 1; i < this.currentTrick.length; i++) {
      const tc = this.currentTrick[i].card;
      if (tc.suit === CLIENT_SUITS.SPADES && highestCardInTrick.suit !== CLIENT_SUITS.SPADES) {
        highestCardInTrick = tc;
      } else if (tc.suit === highestCardInTrick.suit && tc.rank > highestCardInTrick.rank) {
        highestCardInTrick = tc;
      }
    }

    if (sameSuitCards.length > 0) {
      const higherSameSuit = sameSuitCards.filter(c => c.rank > highestCardInTrick.rank);
      if (highestCardInTrick.suit === leadSuit && higherSameSuit.length > 0) {
        return higherSameSuit;
      }
      return sameSuitCards;
    }

    const trumps = hand.filter(c => c.suit === CLIENT_SUITS.SPADES);
    if (trumps.length > 0) {
      if (highestCardInTrick.suit === CLIENT_SUITS.SPADES) {
        const higherTrumps = trumps.filter(c => c.rank > highestCardInTrick.rank);
        if (higherTrumps.length > 0) return higherTrumps;
      }
      return trumps;
    }

    return [...hand];
  }

  playCard(seatIndex, cardId) {
    const hand = this.hands[seatIndex];
    const cardObj = hand.find(c => c.id === cardId);
    if (!cardObj) throw new Error('Card not in hand');

    const cardIndex = hand.findIndex(c => c.id === cardId);
    hand.splice(cardIndex, 1);

    this.currentTrick.push({
      playerIndex: seatIndex,
      card: cardObj
    });

    let trickResult = null;

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
      this.currentTurnIndex = winnerIndex;

      if (this.trickHistory.length === 13) {
        this.finishRound();
      }
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % 4;
    }

    return {
      seatIndex,
      card: cardObj,
      trickResult,
      nextTurn: this.currentTurnIndex,
      roundState: this.roundState
    };
  }

  evaluateTrickWinner(trick) {
    let winningPlay = trick[0];
    const leadSuit = trick[0].card.suit;

    for (let i = 1; i < trick.length; i++) {
      const play = trick[i];
      const card = play.card;
      const winCard = winningPlay.card;

      if (card.suit === CLIENT_SUITS.SPADES) {
        if (winCard.suit !== CLIENT_SUITS.SPADES || card.rank > winCard.rank) {
          winningPlay = play;
        }
      } else if (card.suit === leadSuit && winCard.suit !== CLIENT_SUITS.SPADES) {
        if (card.rank > winCard.rank) {
          winningPlay = play;
        }
      }
    }

    return winningPlay.playerIndex;
  }

  finishRound() {
    this.roundState = 'ROUND_OVER';
    const roundScores = [0, 0, 0, 0];

    for (let i = 0; i < 4; i++) {
      const bid = this.bids[i];
      const won = this.tricksWon[i];
      let score = 0;
      if (won >= bid) {
        score = bid + (won - bid) * 0.1;
      } else {
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
    this.currentRound += 1;
    this.dealerIndex = (this.dealerIndex + 1) % 4;
    this.startRound();
  }

  getRankings() {
    return this.players.map((p, idx) => ({
      playerIndex: idx,
      name: p.name,
      totalScore: this.totalScores[idx],
      isBot: p.isBot
    })).sort((a, b) => b.totalScore - a.totalScore);
  }
}

window.ClientCallbreakGame = ClientCallbreakGame;
window.CLIENT_SUITS = CLIENT_SUITS;

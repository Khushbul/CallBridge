import '../models/card_model.dart';

class CallbreakEngine {
  final int totalRounds; // 5, 10, 15, or 20
  int currentRound = 1;
  int dealerIndex = 0;
  int currentTurnIndex = 1;
  
  List<List<PlayingCard>> hands = [[], [], [], []];
  List<int?> bids = [null, null, null, null];
  List<int> tricksWon = [0, 0, 0, 0];
  
  List<Map<String, dynamic>> currentTrick = [];
  List<Map<String, dynamic>> scores = [];
  List<double> totalScores = [0.0, 0.0, 0.0, 0.0];
  
  String roundState = 'WAITING'; // BIDDING, PLAYING, ROUND_OVER, GAME_OVER

  CallbreakEngine({this.totalRounds = 20});

  static List<PlayingCard> createDeck() {
    final list = <PlayingCard>[];
    for (final s in Suit.values) {
      for (int r = 2; r <= 14; r++) {
        list.add(PlayingCard(suit: s, rank: r));
      }
    }
    list.shuffle();
    return list;
  }

  void startMatch() {
    currentRound = 1;
    dealerIndex = 0;
    scores = [];
    totalScores = [0.0, 0.0, 0.0, 0.0];
    startRound();
  }

  void startRound() {
    roundState = 'BIDDING';
    final deck = createDeck();
    hands = [[], [], [], []];
    for (int i = 0; i < 52; i++) {
      hands[i % 4].add(deck[i]);
    }
    // Sort hands: Spades, Hearts, Clubs, Diamonds
    for (final hand in hands) {
      hand.sort((a, b) {
        if (a.suit != b.suit) return a.suit.index.compareTo(b.suit.index);
        return b.rank.compareTo(a.rank);
      });
    }
    bids = [null, null, null, null];
    tricksWon = [0, 0, 0, 0];
    currentTrick = [];
    currentTurnIndex = (dealerIndex + 1) % 4;
  }

  void makeBid(int playerIndex, int bid) {
    bids[playerIndex] = bid;
    if (bids.every((b) => b != null)) {
      roundState = 'PLAYING';
      currentTurnIndex = (dealerIndex + 1) % 4;
    } else {
      currentTurnIndex = (currentTurnIndex + 1) % 4;
    }
  }

  List<PlayingCard> getLegalCards(int playerIndex) {
    final hand = hands[playerIndex];
    if (currentTrick.isEmpty) return List.from(hand);

    final leadSuit = (currentTrick[0]['card'] as PlayingCard).suit;
    final sameSuit = hand.where((c) => c.suit == leadSuit).toList();

    PlayingCard highest = currentTrick[0]['card'] as PlayingCard;
    for (int i = 1; i < currentTrick.length; i++) {
      final c = currentTrick[i]['card'] as PlayingCard;
      if (c.suit == Suit.spades && highest.suit != Suit.spades) {
        highest = c;
      } else if (c.suit == highest.suit && c.rank > highest.rank) {
        highest = c;
      }
    }

    if (sameSuit.isNotEmpty) {
      final higher = sameSuit.where((c) => c.rank > highest.rank).toList();
      if (highest.suit == leadSuit && higher.isNotEmpty) return higher;
      return sameSuit;
    }

    final trumps = hand.where((c) => c.suit == Suit.spades).toList();
    if (trumps.isNotEmpty) {
      if (highest.suit == Suit.spades) {
        final higherTrumps = trumps.where((c) => c.rank > highest.rank).toList();
        if (higherTrumps.isNotEmpty) return higherTrumps;
      }
      return trumps;
    }

    return List.from(hand);
  }

  Map<String, dynamic> playCard(int playerIndex, String cardId) {
    final hand = hands[playerIndex];
    final card = hand.firstWhere((c) => c.id == cardId);
    hand.remove(card);

    currentTrick.add({
      'playerIndex': playerIndex,
      'card': card,
    });

    Map<String, dynamic>? trickResult;

    if (currentTrick.length == 4) {
      final winner = evaluateTrickWinner();
      tricksWon[winner]++;
      trickResult = {
        'winnerIndex': winner,
        'tricks': List.from(currentTrick),
      };
      currentTrick = [];
      currentTurnIndex = winner;

      if (hands[0].isEmpty) {
        finishRound();
      }
    } else {
      currentTurnIndex = (currentTurnIndex + 1) % 4;
    }

    return {
      'trickResult': trickResult,
      'roundState': roundState,
    };
  }

  int evaluateTrickWinner() {
    var winning = currentTrick[0];
    final leadSuit = (winning['card'] as PlayingCard).suit;

    for (int i = 1; i < currentTrick.length; i++) {
      final play = currentTrick[i];
      final card = play['card'] as PlayingCard;
      final winCard = winning['card'] as PlayingCard;

      if (card.suit == Suit.spades) {
        if (winCard.suit != Suit.spades || card.rank > winCard.rank) winning = play;
      } else if (card.suit == leadSuit && winCard.suit != Suit.spades) {
        if (card.rank > winCard.rank) winning = play;
      }
    }
    return winning['playerIndex'] as int;
  }

  void finishRound() {
    roundState = 'ROUND_OVER';
    final roundScores = <double>[];
    for (int i = 0; i < 4; i++) {
      final bid = bids[i]!;
      final won = tricksWon[i];
      double s = (won >= bid) ? (bid + (won - bid) * 0.1) : (-bid.toDouble());
      s = double.parse(s.toStringAsFixed(1));
      roundScores.add(s);
      totalScores[i] = double.parse((totalScores[i] + s).toStringAsFixed(1));
    }

    scores.add({
      'round': currentRound,
      'bids': List.from(bids),
      'won': List.from(tricksWon),
      'roundScores': roundScores,
      'totals': List.from(totalScores),
    });

    if (currentRound >= totalRounds) {
      roundState = 'GAME_OVER';
    }
  }

  void proceedToNextRound() {
    currentRound++;
    dealerIndex = (dealerIndex + 1) % 4;
    startRound();
  }
}

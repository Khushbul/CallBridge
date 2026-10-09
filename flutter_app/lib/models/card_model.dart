enum Suit { spades, hearts, clubs, diamonds }

class PlayingCard {
  final Suit suit;
  final int rank; // 2 to 14 (14 is Ace)
  final String id;

  PlayingCard({required this.suit, required this.rank})
      : id = '${suit.name}_$rank';

  bool get isTrump => suit == Suit.spades;

  String get symbol {
    switch (suit) {
      case Suit.spades: return '♠';
      case Suit.hearts: return '♥';
      case Suit.diamonds: return '♦';
      case Suit.clubs: return '♣';
    }
  }

  String get rankLabel {
    switch (rank) {
      case 14: return 'A';
      case 13: return 'K';
      case 12: return 'Q';
      case 11: return 'J';
      default: return rank.toString();
    }
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'suit': suit.name,
    'rank': rank,
    'symbol': symbol,
    'rankLabel': rankLabel,
    'isTrump': isTrump,
  };

  factory PlayingCard.fromJson(Map<String, dynamic> json) {
    return PlayingCard(
      suit: Suit.values.byName(json['suit']),
      rank: json['rank'],
    );
  }
}

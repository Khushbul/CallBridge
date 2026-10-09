import 'package:flutter/material.dart';
import '../server/embedded_server.dart';
import '../engine/game_engine.dart';
import '../models/card_model.dart';

class GameScreen extends StatefulWidget {
  final String playerName;
  final int totalRounds;
  final bool isOffline;
  final bool isHost;
  final bool isClient;
  final LocalHotspotServer? server;
  final String? hostIp;

  const GameScreen({
    super.key,
    required this.playerName,
    this.totalRounds = 20,
    this.isOffline = false,
    this.isHost = false,
    this.isClient = false,
    this.server,
    this.hostIp,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late CallbreakEngine _engine;
  List<PlayingCard> _hand = [];
  int _currentRound = 1;

  @override
  void initState() {
    super.initState();
    _engine = CallbreakEngine(totalRounds: widget.totalRounds);
    _engine.startMatch();
    _hand = _engine.hands[0];
    _currentRound = _engine.currentRound;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF062616),
      appBar: AppBar(
        backgroundColor: const Color(0xFF04180E),
        title: Text(
          'Round $_currentRound / ${widget.totalRounds} • Callbreak',
          style: const TextStyle(color: Color(0xFFD4AF37), fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.leaderboard, color: Color(0xFFD4AF37)),
            onPressed: _showScoreboard,
          ),
        ],
      ),
      body: Stack(
        children: [
          // Felt Table Center
          Center(
            child: Container(
              width: 280,
              height: 200,
              decoration: BoxDecoration(
                color: const Color(0xFF0B3E24),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.3), width: 2),
              ),
              child: Center(
                child: Text(
                  _engine.roundState == 'BIDDING' ? 'BIDDING IN PROGRESS' : 'TRICK PLAY',
                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),

          // Hand Cards Fan at Bottom
          Positioned(
            bottom: 20,
            left: 0,
            right: 0,
            child: SizedBox(
              height: 120,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _hand.length,
                itemBuilder: (ctx, i) {
                  final card = _hand[i];
                  return Container(
                    width: 60,
                    margin: const EdgeInsets.only(right: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: card.isTrump ? Colors.amber : Colors.grey.shade400, width: 2),
                      boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 2))],
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${card.rankLabel}${card.symbol}',
                          style: TextStyle(
                            color: (card.suit == Suit.hearts || card.suit == Suit.diamonds) ? Colors.red : Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          card.symbol,
                          style: TextStyle(
                            fontSize: 24,
                            color: (card.suit == Suit.hearts || card.suit == Suit.diamonds) ? Colors.red : Colors.black,
                          ),
                        ),
                        const SizedBox(height: 4),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showScoreboard() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF091C12),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Match Scoreboard (20 Rounds)', style: TextStyle(color: Color(0xFFD4AF37), fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text('Cumulative Score: ${_engine.totalScores[0]} pts', style: const TextStyle(color: Colors.white)),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    widget.server?.stop();
    super.dispose();
  }
}

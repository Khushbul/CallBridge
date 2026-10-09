import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../engine/game_engine.dart';

class LocalHotspotServer {
  HttpServer? _server;
  final List<WebSocket> _clients = [];
  CallbreakEngine? _game;
  final int totalRounds;

  LocalHotspotServer({this.totalRounds = 20});

  Future<int> start({int port = 8081}) async {
    _server = await HttpServer.bind(InternetAddress.anyIPv4, port);
    _server!.listen((HttpRequest request) async {
      if (WebSocketTransformer.isUpgradeRequest(request)) {
        final socket = await WebSocketTransformer.upgrade(request);
        _handleClient(socket);
      } else {
        request.response
          ..statusCode = HttpStatus.ok
          ..write('Callbreak Local Hotspot Server Running on port $port');
        await request.response.close();
      }
    });

    _game = CallbreakEngine(totalRounds: totalRounds);
    return port;
  }

  void _handleClient(WebSocket ws) {
    if (_clients.length >= 4) {
      ws.close(WebSocketStatus.normalClosure, 'Room is full');
      return;
    }
    final seat = _clients.length;
    _clients.add(ws);

    ws.listen((data) {
      try {
        final msg = jsonDecode(data as String);
        _processMessage(seat, msg);
      } catch (e) {
        // Handle error
      }
    }, onDone: () {
      _clients.remove(ws);
    });

    // Notify player of seat assignment
    ws.add(jsonEncode({
      'type': 'SEAT_ASSIGNED',
      'seatIndex': seat,
      'totalRounds': totalRounds,
    }));
  }

  void _processMessage(int seat, Map<String, dynamic> msg) {
    if (_game == null) return;

    switch (msg['type']) {
      case 'START_MATCH':
        _game!.startMatch();
        _broadcastGameState();
        break;
      case 'MAKE_BID':
        _game!.makeBid(seat, msg['bid'] as int);
        _broadcastGameState();
        break;
      case 'PLAY_CARD':
        _game!.playCard(seat, msg['cardId'] as String);
        _broadcastGameState();
        break;
      case 'NEXT_ROUND':
        _game!.proceedToNextRound();
        _broadcastGameState();
        break;
    }
  }

  void _broadcastGameState() {
    if (_game == null) return;
    for (int i = 0; i < _clients.length; i++) {
      final ws = _clients[i];
      final state = {
        'type': 'STATE_UPDATE',
        'round': _game!.currentRound,
        'totalRounds': _game!.totalRounds,
        'state': _game!.roundState,
        'turn': _game!.currentTurnIndex,
        'bids': _game!.bids,
        'tricksWon': _game!.tricksWon,
        'myHand': _game!.hands[i].map((c) => c.toJson()).toList(),
        'legalCards': (_game!.roundState == 'PLAYING' && _game!.currentTurnIndex == i)
            ? _game!.getLegalCards(i).map((c) => c.id).toList()
            : [],
        'scores': _game!.scores,
        'totals': _game!.totalScores,
      };
      ws.add(jsonEncode(state));
    }
  }

  Future<void> stop() async {
    for (final ws in _clients) {
      await ws.close();
    }
    _clients.clear();
    await _server?.close(force: true);
  }
}

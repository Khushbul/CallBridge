/**
 * Callbreak Dedicated Multiplayer & Hotspot Server
 * - Serves frontend client
 * - Handles local hotspot & online WebSocket rooms
 * - Enforces 5, 10, 15, or 20 round matches
 * - Supports instant filling with AI bots if less than 4 humans
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');
const { CallbreakGame } = require('./engine');
const CallbreakAI = require('./ai');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// Rooms registry: roomId -> Room
const rooms = new Map();

class Room {
  constructor(id, hostName, totalRounds = 5, pin = '', isHotspot = false) {
    this.id = id;
    this.hostName = hostName;
    this.totalRounds = parseInt(totalRounds, 10) || 5;
    this.pin = pin ? String(pin).trim() : '';
    this.isHotspot = isHotspot;
    this.createdAt = Date.now();
    this.clients = []; // { id, name, ws, seatIndex, isBot }
    this.game = null;
    this.status = 'LOBBY'; // LOBBY, PLAYING, FINISHED
    this.turnTimer = null;
  }

  addPlayer(clientInfo) {
    if (this.clients.length >= 4) {
      throw new Error('Room is full (max 4 players)');
    }
    const seatIndex = this.clients.length;
    const player = {
      id: clientInfo.id,
      name: clientInfo.name || `Player ${seatIndex + 1}`,
      ws: clientInfo.ws,
      seatIndex,
      isBot: false,
      connected: true
    };
    this.clients.push(player);
    return player;
  }

  fillWithBots() {
    const botNames = ['Aryan (AI)', 'Rohan (AI)', 'Kabir (AI)', 'Sameer (AI)'];
    let botIndex = 0;
    while (this.clients.length < 4) {
      const seatIndex = this.clients.length;
      this.clients.push({
        id: `bot_${seatIndex}_${Date.now()}`,
        name: botNames[botIndex++] || `Bot ${seatIndex + 1}`,
        ws: null,
        seatIndex,
        isBot: true,
        connected: true
      });
    }
  }

  startGame() {
    if (this.clients.length < 4) {
      this.fillWithBots();
    }

    this.status = 'PLAYING';
    this.game = new CallbreakGame({
      id: this.id,
      totalRounds: this.totalRounds,
      players: this.clients.map(c => ({
        id: c.id,
        name: c.name,
        seatIndex: c.seatIndex,
        isBot: c.isBot
      }))
    });

    this.game.startMatch();
    this.broadcastState();
    this.checkBotTurn();
  }

  checkBotTurn() {
    if (!this.game || this.status !== 'PLAYING') return;

    const currentTurn = this.game.currentTurnIndex;
    const player = this.clients[currentTurn];
    if (!player || !player.isBot) return;

    // Trigger AI action after realistic thinking delay
    clearTimeout(this.turnTimer);
    this.turnTimer = setTimeout(() => {
      this.executeBotAction(currentTurn);
    }, 1000);
  }

  executeBotAction(botSeat) {
    if (!this.game || this.game.currentTurnIndex !== botSeat) return;

    if (this.game.roundState === 'BIDDING') {
      const hand = this.game.hands[botSeat];
      const bid = CallbreakAI.calculateBid(hand);
      this.game.makeBid(botSeat, bid);
      this.broadcastState();
      this.checkBotTurn();
    } else if (this.game.roundState === 'PLAYING') {
      const chosenCard = CallbreakAI.chooseCard(botSeat, this.game);
      if (chosenCard) {
        const result = this.game.playCard(botSeat, chosenCard.id);
        this.broadcastState({ lastPlay: result });

        if (result.trickResult) {
          // Pause so players can see the completed trick
          setTimeout(() => {
            this.broadcastState();
            if (this.game.roundState === 'PLAYING') {
              this.checkBotTurn();
            }
          }, 1500);
        } else {
          this.checkBotTurn();
        }
      }
    }
  }

  broadcast(messageObj) {
    const data = JSON.stringify(messageObj);
    this.clients.forEach(c => {
      if (c.ws && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(data);
      }
    });
  }

  broadcastState(extra = {}) {
    if (!this.game) {
      // In lobby
      this.broadcast({
        type: 'ROOM_UPDATE',
        room: {
          id: this.id,
          hostName: this.hostName,
          totalRounds: this.totalRounds,
          status: this.status,
          players: this.clients.map(c => ({
            id: c.id,
            name: c.name,
            seatIndex: c.seatIndex,
            isBot: c.isBot,
            connected: c.connected
          }))
        },
        ...extra
      });
      return;
    }

    // Send individualized state to each player
    this.clients.forEach(c => {
      if (c.ws && c.ws.readyState === WebSocket.OPEN) {
        const playerState = this.game.getStateForPlayer(c.seatIndex);
        c.ws.send(JSON.stringify({
          type: 'GAME_STATE',
          state: playerState,
          seatIndex: c.seatIndex,
          ...extra
        }));
      }
    });
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  // REST API endpoints
  if (req.url === '/api/lan/info' && req.method === 'GET') {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({ interface: name, ip: iface.address });
        }
      }
    }
    const publicRooms = Array.from(rooms.values())
      .filter(r => r.status === 'LOBBY')
      .map(r => ({
        id: r.id,
        hostName: r.hostName,
        totalRounds: r.totalRounds,
        playerCount: r.clients.length,
        hasPin: Boolean(r.pin),
        isHotspot: r.isHotspot
      }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ips: addresses,
      port: PORT,
      availableRooms: publicRooms
    }));
    return;
  }

  // Serve static files
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let currentRoom = null;
  let clientPlayer = null;

  ws.on('message', (messageStr) => {
    try {
      const msg = JSON.parse(messageStr);
      switch (msg.type) {
        case 'CREATE_ROOM': {
          const roomId = msg.roomId || Math.random().toString(36).substring(2, 8).toUpperCase();
          const hostName = msg.name || 'Host';
          const totalRounds = [5, 10, 15, 20].includes(parseInt(msg.totalRounds, 10))
            ? parseInt(msg.totalRounds, 10)
            : 5;
          const pin = msg.pin || '';
          const isHotspot = Boolean(msg.isHotspot);

          const room = new Room(roomId, hostName, totalRounds, pin, isHotspot);
          rooms.set(roomId, room);
          currentRoom = room;

          clientPlayer = room.addPlayer({
            id: msg.clientId || Math.random().toString(36).substring(2, 9),
            name: hostName,
            ws
          });

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomId,
            seatIndex: clientPlayer.seatIndex,
            totalRounds
          }));

          room.broadcastState();
          break;
        }

        case 'JOIN_ROOM': {
          const room = rooms.get((msg.roomId || '').toUpperCase());
          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
            return;
          }
          if (room.pin && room.pin !== msg.pin) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid room PIN' }));
            return;
          }
          if (room.clients.length >= 4) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is already full' }));
            return;
          }

          currentRoom = room;
          clientPlayer = room.addPlayer({
            id: msg.clientId || Math.random().toString(36).substring(2, 9),
            name: msg.name || `Player ${room.clients.length + 1}`,
            ws
          });

          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomId: room.id,
            seatIndex: clientPlayer.seatIndex,
            totalRounds: room.totalRounds
          }));

          room.broadcastState();
          break;
        }

        case 'START_MATCH': {
          if (!currentRoom) return;
          if (clientPlayer.seatIndex !== 0) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Only the host can start the match' }));
            return;
          }
          currentRoom.startGame();
          break;
        }

        case 'MAKE_BID': {
          if (!currentRoom || !currentRoom.game) return;
          try {
            const bidVal = parseInt(msg.bid, 10);
            currentRoom.game.makeBid(clientPlayer.seatIndex, bidVal);
            currentRoom.broadcastState();
            currentRoom.checkBotTurn();
          } catch (e) {
            ws.send(JSON.stringify({ type: 'ERROR', message: e.message }));
          }
          break;
        }

        case 'PLAY_CARD': {
          if (!currentRoom || !currentRoom.game) return;
          try {
            const result = currentRoom.game.playCard(clientPlayer.seatIndex, msg.cardId);
            currentRoom.broadcastState({ lastPlay: result });

            if (result.trickResult) {
              setTimeout(() => {
                if (currentRoom && currentRoom.game) {
                  currentRoom.broadcastState();
                  if (currentRoom.game.roundState === 'PLAYING') {
                    currentRoom.checkBotTurn();
                  }
                }
              }, 1500);
            } else {
              currentRoom.checkBotTurn();
            }
          } catch (e) {
            ws.send(JSON.stringify({ type: 'ERROR', message: e.message }));
          }
          break;
        }

        case 'NEXT_ROUND': {
          if (!currentRoom || !currentRoom.game) return;
          if (currentRoom.game.roundState === 'ROUND_OVER') {
            currentRoom.game.proceedToNextRound();
            currentRoom.broadcastState();
            currentRoom.checkBotTurn();
          }
          break;
        }

        case 'CHAT': {
          if (!currentRoom) return;
          currentRoom.broadcast({
            type: 'CHAT_MESSAGE',
            sender: clientPlayer ? clientPlayer.name : 'Guest',
            text: String(msg.text || '').substring(0, 100),
            emoji: msg.emoji || null
          });
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && clientPlayer) {
      clientPlayer.connected = false;
      // If room still in lobby and host left, remove room or transfer
      if (currentRoom.status === 'LOBBY') {
        const idx = currentRoom.clients.indexOf(clientPlayer);
        if (idx !== -1) currentRoom.clients.splice(idx, 1);
        if (currentRoom.clients.length === 0) {
          rooms.delete(currentRoom.id);
        } else {
          currentRoom.broadcastState();
        }
      } else {
        // If match in progress, convert disconnected human into AI bot so game continues!
        clientPlayer.isBot = true;
        clientPlayer.name = `${clientPlayer.name} (Bot)`;
        currentRoom.broadcastState();
        currentRoom.checkBotTurn();
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`♠️ Callbreak 20-Round Multiplayer Server is Live!`);
  console.log(`🌐 Local Web:    http://localhost:${PORT}`);

  const interfaces = os.networkInterfaces();
  console.log(`📱 LAN/Hotspot:`);
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   👉 http://${iface.address}:${PORT} (${name})`);
      }
    }
  }
  console.log(`======================================================\n`);
});

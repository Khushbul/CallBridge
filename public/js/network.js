/**
 * Network Controller for Callbreak Multiplayer
 * Manages WebSocket connections, room joining, and real-time state sync.
 */

class NetworkClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.roomId = null;
    this.seatIndex = null;
    this.clientId = 'user_' + Math.random().toString(36).substring(2, 9);
    
    // Callbacks
    this.onRoomUpdate = null;
    this.onGameState = null;
    this.onError = null;
    this.onChatMessage = null;
    this.onConnected = null;
  }

  connect(customHost = null) {
    return new Promise((resolve, reject) => {
      let wsUrl = '';
      if (customHost) {
        let clean = customHost.trim().replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
        if (!clean.includes(':')) clean += ':3000';
        wsUrl = `ws://${clean}`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}`;
      }

      try {
        if (this.ws) {
          this.ws.close();
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.connected = true;
          if (this.onConnected) this.onConnected();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (err) => {
          this.connected = false;
          reject(err);
        };

        this.ws.onclose = () => {
          this.connected = false;
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  handleMessage(dataStr) {
    try {
      const msg = JSON.parse(dataStr);
      switch (msg.type) {
        case 'ROOM_CREATED':
        case 'ROOM_JOINED':
          this.roomId = msg.roomId;
          this.seatIndex = msg.seatIndex;
          break;
        case 'ROOM_UPDATE':
          if (this.onRoomUpdate) this.onRoomUpdate(msg.room);
          break;
        case 'GAME_STATE':
          if (this.onGameState) this.onGameState(msg.state, msg.seatIndex, msg.lastPlay);
          break;
        case 'CHAT_MESSAGE':
          if (this.onChatMessage) this.onChatMessage(msg);
          break;
        case 'ERROR':
          if (this.onError) this.onError(msg.message);
          break;
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  createRoom(name, totalRounds = 5, isHotspot = false, pin = '') {
    this.send({
      type: 'CREATE_ROOM',
      name,
      totalRounds: parseInt(totalRounds, 10),
      isHotspot,
      pin,
      clientId: this.clientId
    });
  }

  joinRoom(roomId, name, pin = '') {
    this.send({
      type: 'JOIN_ROOM',
      roomId,
      name,
      pin,
      clientId: this.clientId
    });
  }

  startMatch() {
    this.send({ type: 'START_MATCH' });
  }

  makeBid(bid) {
    this.send({ type: 'MAKE_BID', bid });
  }

  playCard(cardId) {
    this.send({ type: 'PLAY_CARD', cardId });
  }

  nextRound() {
    this.send({ type: 'NEXT_ROUND' });
  }

  sendChat(text, emoji = null) {
    this.send({ type: 'CHAT', text, emoji });
  }
}

window.networkClient = new NetworkClient();

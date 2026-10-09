/**
 * Callbreak Master Application Controller
 * Handles UI interactions, game loop, animations, sound triggers,
 * and state synchronization for both Offline and Multiplayer modes.
 */

// Global State
let gameMode = 'OFFLINE'; // 'OFFLINE' | 'HOTSPOT' | 'ONLINE'
let offlineGame = null;
let currentMatchState = null;
let userSeatIndex = 0;
let offlineTotalRounds = 20; // Default 20 rounds!
let hostTotalRounds = 20;

// DOM Elements
const screenMenu = document.getElementById('screen-menu');
const screenLobby = document.getElementById('screen-lobby');
const screenGame = document.getElementById('screen-game');

const panelOfflineConfig = document.getElementById('panel-offline-config');
const panelHotspotConfig = document.getElementById('panel-hotspot-config');
const panelOnlineConfig = document.getElementById('panel-online-config');
const panelRules = document.getElementById('panel-rules');
const mainMenuOptions = document.getElementById('main-menu-options');

// Modals
const modalBidding = document.getElementById('modal-bidding');
const modalScoreboard = document.getElementById('modal-scoreboard');
const modalGameOver = document.getElementById('modal-gameover');

// Sound Button
const btnToggleSound = document.getElementById('btn-toggle-sound');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  setupMenuNavigation();
  setupRoundSelectors();
  setupModals();
  setupSoundToggle();
  checkLanInfo();
});

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showSubpanel(panel) {
  mainMenuOptions.style.display = 'none';
  document.querySelectorAll('.config-subpanel').forEach(p => p.classList.remove('active'));
  panel.classList.add('active');
}

function resetToMainMenu() {
  document.querySelectorAll('.config-subpanel').forEach(p => p.classList.remove('active'));
  mainMenuOptions.style.display = 'flex';
}

function setupMenuNavigation() {
  // Option 1: Play vs AI
  document.getElementById('btn-select-offline').addEventListener('click', () => {
    showSubpanel(panelOfflineConfig);
  });
  document.getElementById('btn-back-from-offline').addEventListener('click', resetToMainMenu);

  // Option 2: Hotspot / LAN
  document.getElementById('btn-select-hotspot').addEventListener('click', () => {
    showSubpanel(panelHotspotConfig);
    checkLanInfo();
  });
  document.getElementById('btn-back-from-hotspot').addEventListener('click', resetToMainMenu);

  // Option 3: Online Cloud
  document.getElementById('btn-select-online').addEventListener('click', () => {
    showSubpanel(panelOnlineConfig);
  });
  document.getElementById('btn-back-from-online').addEventListener('click', resetToMainMenu);

  // Option 4: Rules
  document.getElementById('btn-select-rules').addEventListener('click', () => {
    showSubpanel(panelRules);
  });
  document.getElementById('btn-back-from-rules').addEventListener('click', resetToMainMenu);

  // Start Offline Match
  document.getElementById('btn-start-offline-game').addEventListener('click', () => {
    startOfflineGame(offlineTotalRounds);
  });

  // Hotspot tabs (Host vs Join)
  const tabHost = document.getElementById('tab-host-hotspot');
  const tabJoin = document.getElementById('tab-join-hotspot');
  const viewHost = document.getElementById('view-host-setup');
  const viewJoin = document.getElementById('view-join-setup');

  tabHost.addEventListener('click', () => {
    tabHost.classList.add('selected');
    tabJoin.classList.remove('selected');
    viewHost.style.display = 'block';
    viewJoin.style.display = 'none';
  });

  tabJoin.addEventListener('click', () => {
    tabJoin.classList.add('selected');
    tabHost.classList.remove('selected');
    viewHost.style.display = 'none';
    viewJoin.style.display = 'block';
  });

  // Online tabs (Create vs Join)
  const tabCreateOnline = document.getElementById('tab-create-online');
  const tabJoinOnline = document.getElementById('tab-join-online');
  const viewOnlineCreate = document.getElementById('view-online-create');
  const viewOnlineJoin = document.getElementById('view-online-join');

  tabCreateOnline.addEventListener('click', () => {
    tabCreateOnline.classList.add('selected');
    tabJoinOnline.classList.remove('selected');
    viewOnlineCreate.style.display = 'block';
    viewOnlineJoin.style.display = 'none';
  });

  tabJoinOnline.addEventListener('click', () => {
    tabJoinOnline.classList.add('selected');
    tabCreateOnline.classList.remove('selected');
    viewOnlineCreate.style.display = 'none';
    viewOnlineJoin.style.display = 'block';
  });

  // Multiplayer Actions
  document.getElementById('btn-create-hotspot-room').addEventListener('click', () => {
    const name = document.getElementById('host-player-name').value.trim() || 'Host';
    const pin = document.getElementById('host-room-pin').value.trim();
    createMultiplayerRoom(name, hostTotalRounds, true, pin);
  });

  document.getElementById('btn-connect-join-room').addEventListener('click', () => {
    const name = document.getElementById('join-player-name').value.trim() || 'Player';
    const hostIp = document.getElementById('join-host-ip').value.trim();
    const pin = document.getElementById('join-room-pin').value.trim();
    joinMultiplayerRoom(name, hostIp, pin);
  });

  document.getElementById('btn-create-online-room').addEventListener('click', () => {
    const name = document.getElementById('online-player-name').value.trim() || 'Player';
    createMultiplayerRoom(name, hostTotalRounds, false, '');
  });

  document.getElementById('btn-join-online-room').addEventListener('click', () => {
    const name = document.getElementById('online-player-name').value.trim() || 'Player';
    const code = document.getElementById('online-join-code').value.trim().toUpperCase();
    joinMultiplayerRoom(name, code, '');
  });

  // Lobby actions
  document.getElementById('btn-lobby-start').addEventListener('click', () => {
    window.networkClient.startMatch();
  });

  document.getElementById('btn-lobby-leave').addEventListener('click', () => {
    if (window.networkClient.ws) window.networkClient.ws.close();
    showScreen('screen-menu');
    resetToMainMenu();
  });

  // Exit game to menu
  document.getElementById('btn-exit-game').addEventListener('click', () => {
    if (confirm('Leave current Callbreak match?')) {
      if (window.networkClient.ws) window.networkClient.ws.close();
      showScreen('screen-menu');
      resetToMainMenu();
    }
  });

  // Rematch / Back to Menu from Game Over
  document.getElementById('btn-gameover-rematch').addEventListener('click', () => {
    modalGameOver.classList.remove('active');
    showScreen('screen-menu');
    resetToMainMenu();
  });
}

function setupRoundSelectors() {
  // Setup pill click selection for 5, 10, 15, 20 rounds
  ['offline-round-pills', 'hotspot-round-pills', 'online-round-pills'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const pills = container.querySelectorAll('.round-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        const val = parseInt(pill.dataset.rounds, 10);
        if (containerId === 'offline-round-pills') {
          offlineTotalRounds = val;
        } else {
          hostTotalRounds = val;
        }
      });
    });
  });
}

function setupSoundToggle() {
  btnToggleSound.addEventListener('click', () => {
    const enabled = window.soundManager.toggle();
    btnToggleSound.textContent = enabled ? '🔊' : '🔇';
  });
}

function setupModals() {
  // Scoreboard close
  const btnCloseScoreboard = document.getElementById('btn-close-scoreboard');
  if (btnCloseScoreboard) {
    btnCloseScoreboard.addEventListener('click', () => {
      modalScoreboard.classList.remove('active');
    });
  }

  // Top-left clipboard round indicator opens Scorecard
  const btnHudRound = document.getElementById('btn-hud-round');
  if (btnHudRound) {
    btnHudRound.addEventListener('click', () => {
      showScoreboardModal();
    });
  }

  // Scoreboard ledger share button
  const btnLedgerShare = document.getElementById('btn-ledger-share');
  if (btnLedgerShare) {
    btnLedgerShare.addEventListener('click', () => {
      showGameToast('📋 Scorecard copied to clipboard!');
    });
  }

  // Settings Gear Modal
  const modalSettings = document.getElementById('modal-settings');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnExitToMenu = document.getElementById('btn-exit-to-menu');
  const btnToggleSoundSettings = document.getElementById('btn-toggle-sound-settings');
  const arenaEl = document.getElementById('table-arena');

  if (btnOpenSettings && modalSettings) {
    btnOpenSettings.addEventListener('click', () => {
      modalSettings.classList.add('active');
    });
  }

  if (btnCloseSettings && modalSettings) {
    btnCloseSettings.addEventListener('click', () => {
      modalSettings.classList.remove('active');
    });
  }

  if (btnExitToMenu && modalSettings) {
    btnExitToMenu.addEventListener('click', () => {
      if (confirm('Exit current match to main menu?')) {
        modalSettings.classList.remove('active');
        if (window.networkClient && window.networkClient.ws) window.networkClient.ws.close();
        showScreen('screen-menu');
        resetToMainMenu();
      }
    });
  }

  if (btnToggleSoundSettings) {
    btnToggleSoundSettings.addEventListener('click', () => {
      const enabled = window.soundManager.toggle();
      btnToggleSoundSettings.textContent = enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      if (btnToggleSound) btnToggleSound.textContent = enabled ? '🔊' : '🔇';
    });
  }

  // Theme Picker Pills (Stadium, Palace, Lake)
  const themePills = document.querySelectorAll('#theme-pills .round-pill');
  themePills.forEach(pill => {
    pill.addEventListener('click', () => {
      themePills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      const theme = pill.dataset.theme;
      if (arenaEl) {
        arenaEl.classList.remove('theme-stadium', 'theme-palace', 'theme-lake');
        arenaEl.classList.add(`theme-${theme}`);
      }
    });
  });

  // Next Round proceed button
  const btnProceed = document.getElementById('btn-proceed-next-round');
  if (btnProceed) {
    btnProceed.addEventListener('click', () => {
      modalScoreboard.classList.remove('active');
      if (gameMode === 'OFFLINE' && offlineGame) {
        offlineGame.proceedToNextRound();
        window.soundManager.playCardDeal();
        renderOfflineGameState();
        checkOfflineBotBids();
      } else if (gameMode !== 'OFFLINE') {
        window.networkClient.nextRound();
      }
    });
  }

  // Interactive Wooden Bidding Slider Controls
  const bidSlider = document.getElementById('bid-slider');
  const bidSliderFill = document.getElementById('bid-slider-fill');
  const bidSliderThumb = document.getElementById('bid-slider-thumb');
  const biddingCurrentVal = document.getElementById('bidding-current-val');
  const btnBidMinus = document.getElementById('btn-bid-minus');
  const btnBidPlus = document.getElementById('btn-bid-plus');
  const btnBidConfirm = document.getElementById('btn-bid-confirm');
  const btnBidHint = document.getElementById('btn-bid-hint');
  const numMarks = document.querySelectorAll('.num-mark');

  let currentSelectedBid = 4;

  function updateBidUI(val) {
    currentSelectedBid = Math.max(1, Math.min(8, val));
    if (biddingCurrentVal) biddingCurrentVal.textContent = currentSelectedBid;
    if (bidSlider) bidSlider.value = currentSelectedBid;

    // Percent for slider track (min 1, max 8 -> 7 steps)
    const pct = ((currentSelectedBid - 1) / 7) * 100;
    if (bidSliderFill) bidSliderFill.style.width = `${pct}%`;
    if (bidSliderThumb) bidSliderThumb.style.left = `${pct}%`;

    // Highlight number
    numMarks.forEach(m => {
      if (parseInt(m.dataset.val, 10) === currentSelectedBid) {
        m.classList.add('active');
      } else {
        m.classList.remove('active');
      }
    });
  }

  if (bidSlider) {
    bidSlider.addEventListener('input', (e) => {
      updateBidUI(parseInt(e.target.value, 10));
    });
  }

  if (btnBidMinus) {
    btnBidMinus.addEventListener('click', () => {
      updateBidUI(currentSelectedBid - 1);
    });
  }

  if (btnBidPlus) {
    btnBidPlus.addEventListener('click', () => {
      updateBidUI(currentSelectedBid + 1);
    });
  }

  numMarks.forEach(mark => {
    mark.addEventListener('click', () => {
      updateBidUI(parseInt(mark.dataset.val, 10));
    });
  });

  if (btnBidHint) {
    btnBidHint.addEventListener('click', () => {
      if (offlineGame && offlineGame.hands[0]) {
        const rec = window.ClientAI.calculateBid(offlineGame.hands[0]);
        updateBidUI(rec);
      }
    });
  }

  if (btnBidConfirm) {
    btnBidConfirm.addEventListener('click', () => {
      modalBidding.classList.remove('active');
      if (gameMode === 'OFFLINE' && offlineGame) {
        offlineGame.makeBid(0, currentSelectedBid);
        renderOfflineGameState();
        checkOfflineBotBids();
      } else if (window.networkClient) {
        window.networkClient.makeBid(currentSelectedBid);
      }
    });
  }

  // Floating Chat / Emoji triggers
  const btnChat = document.getElementById('btn-chat-trigger');
  const btnEmoji = document.getElementById('btn-emoji-trigger');
  const bubbleWest = document.getElementById('bubble-west');
  const bubbleEast = document.getElementById('bubble-east');

  const chatMessages = ['Easy Win!', 'Good Luck!', 'Well Played!', 'Nice Game!', 'Watch Out!'];
  let chatIdx = 0;
  if (btnChat && bubbleWest) {
    btnChat.addEventListener('click', () => {
      bubbleWest.textContent = chatMessages[chatIdx % chatMessages.length];
      chatIdx++;
      bubbleWest.classList.add('show');
      setTimeout(() => bubbleWest.classList.remove('show'), 2500);
    });
  }

  const emojiList = ['😂', '👏', '🔥', '❤️', '😎', '🎉'];
  let emojiIdx = 0;
  if (btnEmoji && bubbleEast) {
    btnEmoji.addEventListener('click', () => {
      bubbleEast.textContent = emojiList[emojiIdx % emojiList.length];
      emojiIdx++;
      bubbleEast.classList.add('show');
      setTimeout(() => bubbleEast.classList.remove('show'), 2500);
    });
  }

  window.updateBidUI = updateBidUI;
}

// Check local IP for Hotspot mode
async function checkLanInfo() {
  try {
    const res = await fetch('/api/lan/info');
    if (res.ok) {
      const data = await res.json();
      if (data.ips && data.ips.length > 0) {
        const ip = data.ips[0].ip;
        document.getElementById('join-host-ip').placeholder = `e.g. ${ip} or ROOM CODE`;
        document.getElementById('lobby-direct-url').textContent = `http://${ip}:${data.port}`;
      }

      // Show discovered rooms
      const listContainer = document.getElementById('discovered-rooms-list');
      if (data.availableRooms && data.availableRooms.length > 0) {
        listContainer.innerHTML = '<div style="font-size:12px;color:var(--gold-light);font-weight:700;margin-bottom:6px;">Available Nearby Rooms:</div>';
        data.availableRooms.forEach(room => {
          const btn = document.createElement('div');
          btn.className = 'btn-menu';
          btn.style.padding = '8px 12px';
          btn.style.fontSize = '13px';
          btn.style.marginBottom = '6px';
          btn.innerHTML = `
            <span>🏠 ${room.hostName}'s Table (${room.playerCount}/4) - <strong>${room.totalRounds} Rounds</strong></span>
            <span style="color:var(--gold-light);font-weight:700;">JOIN ➔</span>
          `;
          btn.addEventListener('click', () => {
            document.getElementById('join-host-ip').value = room.id;
          });
          listContainer.appendChild(btn);
        });
      }
    }
  } catch (e) {
    // Running static without backend API
  }
}

// =========================================================
// OFFLINE GAME LOGIC (Single Player vs AI)
// =========================================================

function startOfflineGame(totalRounds) {
  gameMode = 'OFFLINE';
  userSeatIndex = 0;
  
  // Seat 0: You (South), Seat 1: Lily34 (West), Seat 2: Meena.S (North), Seat 3: Dannie (East)
  offlineGame = new window.ClientCallbreakGame(totalRounds, [
    'You',
    'Lily34',
    'Meena.S',
    'Dannie'
  ]);

  offlineGame.startMatch();
  showScreen('screen-game');
  window.soundManager.playCardDeal();

  renderOfflineGameState();
  checkOfflineBotBids();
}

function checkOfflineBotBids() {
  if (!offlineGame) return;

  if (offlineGame.roundState === 'BIDDING') {
    const turn = offlineGame.currentTurnIndex;
    if (turn === 0) {
      // User's turn to bid
      const rec = window.ClientAI.calculateBid(offlineGame.hands[0]);
      document.getElementById('ai-bid-recommendation').textContent = `💡 Suggested Call: ${rec} Tricks`;
      if (window.updateBidUI) {
        window.updateBidUI(rec);
      }
      modalBidding.classList.add('active');
    } else {
      // Bot's turn to bid
      setTimeout(() => {
        if (!offlineGame || offlineGame.roundState !== 'BIDDING') return;
        const botBid = window.ClientAI.calculateBid(offlineGame.hands[turn]);
        offlineGame.makeBid(turn, botBid);
        renderOfflineGameState();
        checkOfflineBotBids();
      }, 700);
    }
  } else if (offlineGame.roundState === 'PLAYING') {
    checkOfflineBotPlay();
  }
}

function checkOfflineBotPlay() {
  if (!offlineGame || offlineGame.roundState !== 'PLAYING') return;

  const turn = offlineGame.currentTurnIndex;
  if (turn === 0) {
    // User turn to play: highlight playable cards in hand
    renderHandCards(offlineGame.hands[0], offlineGame.getLegalCards(0));
  } else {
    // Bot turn to play
    setTimeout(() => {
      if (!offlineGame || offlineGame.roundState !== 'PLAYING') return;
      if (offlineGame.currentTurnIndex !== turn) return;

      const card = window.ClientAI.chooseCard(turn, offlineGame);
      if (card) {
        const result = offlineGame.playCard(turn, card.id);
        window.soundManager.playCardThrow(card.suit === 'spades');
        renderOfflineGameState();

        if (result.trickResult) {
          handleTrickComplete(result.trickResult, () => {
            renderOfflineGameState();
            if (offlineGame.roundState === 'PLAYING') {
              checkOfflineBotPlay();
            } else if (offlineGame.roundState === 'ROUND_OVER' || offlineGame.roundState === 'GAME_OVER') {
              handleRoundComplete();
            }
          });
        } else {
          checkOfflineBotPlay();
        }
      }
    }, 900);
  }
}

function showGameToast(msg) {
  const toast = document.getElementById('game-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function handleUserPlayCard(cardId) {
  if (gameMode === 'OFFLINE') {
    if (!offlineGame || offlineGame.roundState !== 'PLAYING') return;
    if (offlineGame.currentTurnIndex !== 0) return;

    const legal = offlineGame.getLegalCards(0);
    if (!legal.some(c => c.id === cardId)) {
      window.soundManager.playInvalid();
      const card = offlineGame.hands[0].find(c => c.id === cardId);
      const leadPlay = offlineGame.currentTrick[0];
      if (leadPlay && card) {
        const leadSuit = leadPlay.card.suit;
        if (card.suit !== leadSuit && offlineGame.hands[0].some(c => c.suit === leadSuit)) {
          showGameToast(`⚠️ Must follow ${leadSuit.toUpperCase()} suit!`);
        } else if (offlineGame.hands[0].some(c => c.suit === 'spades') && card.suit !== 'spades') {
          showGameToast(`⚠️ Must play Trump (♠) card!`);
        } else {
          showGameToast(`⚠️ Must play higher card if possible!`);
        }
      } else {
        showGameToast(`⚠️ Card not legal to play!`);
      }

      // Visual card shake animation
      const cardEl = document.querySelector(`.playing-card[data-id="${cardId}"]`);
      if (cardEl) {
        cardEl.classList.add('shake-illegal');
        setTimeout(() => cardEl.classList.remove('shake-illegal'), 400);
      }
      return;
    }

    const card = offlineGame.hands[0].find(c => c.id === cardId);
    const result = offlineGame.playCard(0, cardId);
    window.soundManager.playCardThrow(card && card.suit === 'spades');
    renderOfflineGameState();

    if (result.trickResult) {
      handleTrickComplete(result.trickResult, () => {
        renderOfflineGameState();
        if (offlineGame.roundState === 'PLAYING') {
          checkOfflineBotPlay();
        } else if (offlineGame.roundState === 'ROUND_OVER' || offlineGame.roundState === 'GAME_OVER') {
          handleRoundComplete();
        }
      });
    } else {
      checkOfflineBotPlay();
    }
  } else {
    // Multiplayer
    window.networkClient.playCard(cardId);
  }
}

function handleTrickComplete(trickResult, callback) {
  const winnerIndex = trickResult.winnerIndex;
  const winnerName = (gameMode === 'OFFLINE' ? offlineGame.players[winnerIndex].name : (currentMatchState.players[winnerIndex].name));
  
  const banner = document.getElementById('trick-winner-banner');
  banner.textContent = `${winnerName} Won Trick!`;
  banner.classList.add('show');
  window.soundManager.playTrickWon();

  setTimeout(() => {
    banner.classList.remove('show');
    clearTrickSlots();
    if (callback) callback();
  }, 1400);
}

function handleRoundComplete() {
  showScoreboardModal(true);
}

function showScoreboardModal(isRoundOver = false) {
  const tbody = document.getElementById('scoreboard-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const scores = gameMode === 'OFFLINE' ? offlineGame.scores : currentMatchState.scores;
  const players = gameMode === 'OFFLINE' ? offlineGame.players : currentMatchState.players;
  const totalRounds = gameMode === 'OFFLINE' ? offlineGame.totalRounds : currentMatchState.totalRounds;
  const currentRound = gameMode === 'OFFLINE' ? offlineGame.currentRound : currentMatchState.currentRound;

  // Update tab title
  const tabRoundMode = document.getElementById('tab-round-mode');
  if (tabRoundMode) tabRoundMode.textContent = `${totalRounds} Round`;

  // Update HUD top round text
  const hudRound = document.getElementById('hud-round-indicator');
  if (hudRound) hudRound.textContent = `${currentRound}/${totalRounds}`;

  // Populate round rows: Lily (1), Meena (2), You (0), Dannie (3)
  scores.forEach(s => {
    const tr = document.createElement('tr');
    const trickSum = s.tricksWon.reduce((a, b) => a + b, 0) || 13;
    tr.innerHTML = `
      <td class="col-round font-bold">(R${s.round})</td>
      <td>${s.roundScores[1].toFixed(1)}</td>
      <td>${s.roundScores[2].toFixed(1)}</td>
      <td class="col-you-elevated font-green">${s.roundScores[0].toFixed(1)}</td>
      <td>${s.roundScores[3].toFixed(1)}</td>
      <td class="col-sum">${trickSum}</td>
    `;
    tbody.appendChild(tr);
  });

  // Calculate totals and rankings
  const totals = gameMode === 'OFFLINE' ? offlineGame.totalScores : currentMatchState.totalScores;
  
  // Overall scores
  const elTotP1 = document.getElementById('tot-p1');
  const elTotP2 = document.getElementById('tot-p2');
  const elTotP3 = document.getElementById('tot-p3');
  const elTotP4 = document.getElementById('tot-p4');
  if (elTotP1) elTotP1.textContent = totals[0].toFixed(1);
  if (elTotP2) elTotP2.textContent = totals[1].toFixed(1);
  if (elTotP3) elTotP3.textContent = totals[2].toFixed(1);
  if (elTotP4) elTotP4.textContent = totals[3].toFixed(1);

  // Projected scores (projected based on completed rounds)
  const roundsPlayed = Math.max(1, scores.length);
  const remaining = Math.max(0, totalRounds - roundsPlayed);
  const proj = totals.map(t => (t + (t / roundsPlayed) * remaining).toFixed(1));
  const elProjP1 = document.getElementById('proj-p1');
  const elProjP2 = document.getElementById('proj-p2');
  const elProjP3 = document.getElementById('proj-p3');
  const elProjP4 = document.getElementById('proj-p4');
  if (elProjP1) elProjP1.textContent = proj[0];
  if (elProjP2) elProjP2.textContent = proj[1];
  if (elProjP3) elProjP3.textContent = proj[2];
  if (elProjP4) elProjP4.textContent = proj[3];

  // Ranks (1st, 2nd, 3rd, 4th)
  const sortedIndices = [0, 1, 2, 3].sort((a, b) => totals[b] - totals[a]);
  const rankNames = ['1st', '2nd', '3rd', '4th'];
  const ranks = [];
  sortedIndices.forEach((playerIdx, rankIdx) => {
    ranks[playerIdx] = rankNames[rankIdx];
  });

  const elRankP1 = document.getElementById('rank-p1');
  const elRankP2 = document.getElementById('rank-p2');
  const elRankP3 = document.getElementById('rank-p3');
  const elRankP4 = document.getElementById('rank-p4');
  if (elRankP1) elRankP1.textContent = ranks[0];
  if (elRankP2) elRankP2.textContent = ranks[1];
  if (elRankP3) elRankP3.textContent = ranks[2];
  if (elRankP4) elRankP4.textContent = ranks[3];

  // Next round button visibility
  const nextActions = document.getElementById('round-over-actions');
  const isOver = gameMode === 'OFFLINE' 
    ? (offlineGame.roundState === 'ROUND_OVER')
    : (currentMatchState.roundState === 'ROUND_OVER');

  const isGameOver = gameMode === 'OFFLINE'
    ? (offlineGame.roundState === 'GAME_OVER')
    : (currentMatchState.roundState === 'GAME_OVER');

  if (isGameOver) {
    if (nextActions) nextActions.style.display = 'none';
    modalScoreboard.classList.remove('active');
    showGameOverPodium();
    return;
  }

  if (nextActions) nextActions.style.display = isOver ? 'block' : 'none';
  modalScoreboard.classList.add('active');
}

function showGameOverPodium() {
  const rankings = gameMode === 'OFFLINE' ? offlineGame.getRankings() : currentMatchState.players.map((p, idx) => ({
    playerIndex: idx,
    name: p.name,
    totalScore: currentMatchState.totalScores[idx]
  })).sort((a, b) => b.totalScore - a.totalScore);

  window.soundManager.playVictory();

  // 1st place
  document.getElementById('podium-p1-name').textContent = rankings[0].name;
  document.getElementById('podium-p1-score').textContent = `${rankings[0].totalScore} pts`;

  // 2nd place
  document.getElementById('podium-p2-name').textContent = rankings[1].name;
  document.getElementById('podium-p2-score').textContent = `${rankings[1].totalScore} pts`;

  // 3rd place
  document.getElementById('podium-p3-name').textContent = rankings[2].name;
  document.getElementById('podium-p3-score').textContent = `${rankings[2].totalScore} pts`;

  // 4th place
  document.getElementById('podium-p4-name').textContent = rankings[3].name;
  document.getElementById('podium-p4-score').textContent = rankings[3].totalScore;

  const totalRounds = gameMode === 'OFFLINE' ? offlineGame.totalRounds : currentMatchState.totalRounds;
  document.getElementById('gameover-round-subtitle').textContent = `${totalRounds}-Round Championship Winners`;

  modalGameOver.classList.add('active');
}

// =========================================================
// TABLE & SEAT RENDERING
// =========================================================

function renderOfflineGameState() {
  if (!offlineGame) return;

  // Round indicator
  const hudRound = document.getElementById('hud-round-indicator');
  if (hudRound) hudRound.textContent = `${offlineGame.currentRound}/${offlineGame.totalRounds}`;

  // Render 4 seats: seat 0 is South, 1 is West, 2 is North, 3 is East
  renderSeat('south', 0, offlineGame.players[0], offlineGame);
  renderSeat('west', 1, offlineGame.players[1], offlineGame);
  renderSeat('north', 2, offlineGame.players[2], offlineGame);
  renderSeat('east', 3, offlineGame.players[3], offlineGame);

  // Render Current Trick
  renderTrickCards(offlineGame.currentTrick, 0);

  // Render Hand Cards
  const legal = (offlineGame.roundState === 'PLAYING' && offlineGame.currentTurnIndex === 0)
    ? offlineGame.getLegalCards(0)
    : [];
  renderHandCards(offlineGame.hands[0], legal);
}

function renderSeat(pos, seatIndex, player, state) {
  const seatEl = document.getElementById(`seat-${pos}`);
  const nameEl = document.getElementById(`name-${pos}`);
  const bidTricksEl = document.getElementById(`bid-tricks-${pos}`);
  const dealerChip = document.getElementById(`dealer-${pos}`);
  const avatarWrap = document.getElementById(`avatar-wrap-${pos}`);

  if (nameEl) nameEl.textContent = player.name;

  const bid = state.bids[seatIndex];
  const won = state.tricksWon[seatIndex];
  if (bidTricksEl) {
    // Exact format from screenshot: won / bid (e.g. 2/1, 0/3, 1/4)
    bidTricksEl.textContent = `${won}/${bid !== null ? bid : '-'}`;
  }

  // Active turn glow & pulse ring on player avatar
  const isTurn = (state.roundState === 'PLAYING' || state.roundState === 'BIDDING') && (state.currentTurnIndex === seatIndex);
  if (seatEl) {
    if (isTurn) {
      seatEl.classList.add('active-turn');
    } else {
      seatEl.classList.remove('active-turn');
    }
  }
  if (avatarWrap) {
    if (isTurn) {
      avatarWrap.classList.add('active-turn');
    } else {
      avatarWrap.classList.remove('active-turn');
    }
  }

  // Dealer button
  if (dealerChip) {
    dealerChip.style.display = (state.dealerIndex === seatIndex) ? 'flex' : 'none';
  }

  // Opponent card back fan (curved fan of cards)
  if (pos !== 'south') {
    const fanEl = document.getElementById(`fan-${pos}`);
    if (fanEl) {
      fanEl.innerHTML = '';
      const handCount = state.hands ? state.hands[seatIndex].length : (state.otherHandsCount ? state.otherHandsCount[seatIndex] : 0);
      for (let i = 0; i < handCount; i++) {
        const mini = document.createElement('div');
        mini.className = 'fan-card-back';
        if (pos === 'north') {
          // Arc curving downward around the avatar bottom
          const angle = -50 + (i / Math.max(1, handCount - 1)) * 100;
          mini.style.transform = `rotate(${angle}deg) translateY(30px)`;
        } else if (pos === 'west') {
          // Fan extending to the right
          const angle = -40 + (i / Math.max(1, handCount - 1)) * 80;
          mini.style.transform = `rotate(${angle + 90}deg) translateY(30px)`;
        } else if (pos === 'east') {
          // Fan extending to the left
          const angle = -40 + (i / Math.max(1, handCount - 1)) * 80;
          mini.style.transform = `rotate(${angle - 90}deg) translateY(30px)`;
        }
        fanEl.appendChild(mini);
      }
    }
  }
}

function renderHandCards(hand, legalCards = []) {
  const wrapper = document.getElementById('player-hand-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';
  if (!hand || hand.length === 0) return;

  const total = hand.length;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isLandscape = screenWidth > screenHeight;

  // Adapt card width & height dynamically to screen size
  let cardWidth, cardHeight;
  if (isLandscape) {
    cardWidth = Math.max(46, Math.min(68, Math.floor(screenHeight * 0.22)));
    cardHeight = Math.floor(cardWidth * 1.42);
  } else {
    cardWidth = Math.max(42, Math.min(64, Math.floor((screenWidth - 24) / Math.min(total, 8))));
    cardHeight = Math.floor(cardWidth * 1.42);
  }

  // Constrain max width for hand cards area
  const maxHandWidth = Math.min(screenWidth - 20, isLandscape ? Math.min(760, screenWidth - 220) : 480);

  // Compute card overlap spacing
  let marginLeft = -16;
  if (total > 1) {
    const idealSpan = (total - 1) * (cardWidth * 0.52) + cardWidth;
    if (idealSpan > maxHandWidth) {
      const step = (maxHandWidth - cardWidth) / (total - 1);
      marginLeft = Math.floor(step - cardWidth);
    } else {
      marginLeft = Math.floor(cardWidth * -0.48);
    }
  }

  const mid = (total - 1) / 2;

  hand.forEach((card, idx) => {
    const el = window.CardRenderer.createCardElement(card);
    el.style.width = `${cardWidth}px`;
    el.style.height = `${cardHeight}px`;
    el.style.marginLeft = (idx === 0) ? '0px' : `${marginLeft}px`;

    // Subtle ergonomic fan arc
    const offset = idx - mid;
    const rotate = (offset * 1.8).toFixed(1);
    const translateY = (Math.abs(offset) * 1.5).toFixed(1);
    el.style.transform = `rotate(${rotate}deg) translateY(${translateY}px)`;
    el.style.zIndex = idx + 1;

    // Check legality
    if (legalCards.length > 0) {
      const isLegal = legalCards.some(c => c.id === card.id);
      if (isLegal) {
        el.classList.add('is-legal');
      } else {
        el.classList.add('is-illegal');
      }
    }

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleUserPlayCard(card.id);
    });

    wrapper.appendChild(el);
  });
}

// Window resize & orientation change handler
window.addEventListener('resize', () => {
  if (gameMode === 'OFFLINE' && offlineGame) {
    renderOfflineGameState();
  } else if (currentMatchState) {
    const relPositions = ['south', 'west', 'north', 'east'];
    for (let i = 0; i < 4; i++) {
      const seatIdx = (userSeatIndex + i) % 4;
      renderSeat(relPositions[i], seatIdx, currentMatchState.players[seatIdx], currentMatchState);
    }
    renderTrickCards(currentMatchState.currentTrick, userSeatIndex);
    renderHandCards(currentMatchState.myHand, currentMatchState.legalCards);
  }
});

function renderTrickCards(trick, mySeat) {
  clearTrickSlots();

  trick.forEach(play => {
    // Relative position calculation
    const relIndex = (play.playerIndex - mySeat + 4) % 4;
    const posMap = { 0: 'south', 1: 'west', 2: 'north', 3: 'east' };
    const slotId = `trick-${posMap[relIndex]}`;
    const slot = document.getElementById(slotId);
    if (slot) {
      slot.innerHTML = '';
      const cardEl = window.CardRenderer.createCardElement(play.card);
      cardEl.style.width = '100%';
      cardEl.style.height = '100%';
      cardEl.style.margin = '0';
      cardEl.style.cursor = 'default';
      slot.appendChild(cardEl);
    }
  });
}

function clearTrickSlots() {
  ['south', 'north', 'west', 'east'].forEach(pos => {
    const slot = document.getElementById(`trick-${pos}`);
    if (slot) slot.innerHTML = '';
  });
}

// =========================================================
// MULTIPLAYER (Hotspot & Online)
// =========================================================

function createMultiplayerRoom(name, totalRounds, isHotspot, pin) {
  gameMode = isHotspot ? 'HOTSPOT' : 'ONLINE';
  
  window.networkClient.connect().then(() => {
    window.networkClient.onRoomUpdate = handleLobbyUpdate;
    window.networkClient.onGameState = handleMultiplayerGameState;
    window.networkClient.onError = (msg) => alert(msg);

    window.networkClient.createRoom(name, totalRounds, isHotspot, pin);
    showScreen('screen-lobby');

    if (isHotspot) {
      document.getElementById('lobby-hotspot-info').style.display = 'flex';
    } else {
      document.getElementById('lobby-hotspot-info').style.display = 'none';
    }
  }).catch(err => {
    alert('Could not connect to game server: ' + err.message);
  });
}

function joinMultiplayerRoom(name, roomOrIp, pin) {
  let customHost = null;
  let roomId = roomOrIp;

  if (roomOrIp.includes('.') || roomOrIp.includes(':')) {
    customHost = roomOrIp;
    roomId = '';
  }

  window.networkClient.connect(customHost).then(() => {
    window.networkClient.onRoomUpdate = handleLobbyUpdate;
    window.networkClient.onGameState = handleMultiplayerGameState;
    window.networkClient.onError = (msg) => alert(msg);

    window.networkClient.joinRoom(roomId, name, pin);
    showScreen('screen-lobby');
  }).catch(err => {
    alert('Failed to connect to host: ' + err.message);
  });
}

function handleLobbyUpdate(room) {
  document.getElementById('lobby-room-code').textContent = `ROOM: ${room.id}`;
  document.getElementById('lobby-match-info').textContent = `${room.totalRounds}-Round Match (Host: ${room.hostName})`;

  const slotsContainer = document.getElementById('lobby-slots-container');
  slotsContainer.innerHTML = '';

  for (let i = 0; i < 4; i++) {
    const player = room.players[i];
    const slot = document.createElement('div');
    slot.className = `lobby-slot ${player ? 'occupied' : ''}`;
    
    if (player) {
      slot.innerHTML = `
        <div class="slot-avatar">${player.isBot ? '🤖' : '👤'}</div>
        <div class="slot-info">
          <div class="slot-name">${player.name}</div>
          <div class="slot-status" style="color: #81c784;">Connected</div>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="slot-avatar" style="opacity: 0.5;">+</div>
        <div class="slot-info">
          <div class="slot-name" style="color: var(--text-muted);">Empty Slot</div>
          <div class="slot-status">Waiting for player...</div>
        </div>
      `;
    }
    slotsContainer.appendChild(slot);
  }
}

function handleMultiplayerGameState(state, mySeat, lastPlay) {
  currentMatchState = state;
  userSeatIndex = mySeat;

  showScreen('screen-game');
  document.getElementById('hud-round-indicator').textContent = `ROUND ${state.currentRound} / ${state.totalRounds}`;
  document.getElementById('hud-game-mode').textContent = `${gameMode === 'HOTSPOT' ? 'Hotspot LAN' : 'Online'} (${state.totalRounds} Rounds)`;

  // Relative seat rendering
  const relPositions = ['south', 'west', 'north', 'east'];
  for (let i = 0; i < 4; i++) {
    const seatIdx = (mySeat + i) % 4;
    const pos = relPositions[i];
    renderSeat(pos, seatIdx, state.players[seatIdx], state);
  }

  // Render Trick
  renderTrickCards(state.currentTrick, mySeat);

  // Play sound if a card was just played
  if (lastPlay && lastPlay.card) {
    window.soundManager.playCardThrow(lastPlay.card.suit === 'spades');
  }

  // Render Hand
  renderHandCards(state.myHand, state.legalCards);

  // Bidding check
  if (state.roundState === 'BIDDING' && state.currentTurnIndex === mySeat && state.bids[mySeat] === null) {
    const rec = window.ClientAI.calculateBid(state.myHand);
    document.getElementById('ai-bid-recommendation').textContent = `💡 Suggested Call: ${rec} Tricks`;
    modalBidding.classList.add('active');
  } else {
    modalBidding.classList.remove('active');
  }

  // Round over / Game over check
  if (state.roundState === 'ROUND_OVER') {
    showScoreboardModal(true);
  } else if (state.roundState === 'GAME_OVER') {
    showGameOverPodium();
  }
}

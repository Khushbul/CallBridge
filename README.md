# ♠️ Callbreak 20-Round Championship Card Game

An enhanced, high-performance Callbreak card game built from the architectural blueprint of **[Build Callbreak App.pdf](file:///d:/AI/CallBreak/Build%20Callbreak%20App.pdf)** and reverse-engineered reference of **[Reference_Callbreak.com-Card-game_37.apks](file:///d:/AI/CallBreak/Reference_Callbreak.com-Card-game_37.apks)** (Teslatech Callbreak `io.teslatech.callbreak`).

---

## 🌟 Key Upgrades & Features

1. **Flexible Match Lengths (5, 10, 15, or 20 Rounds)**:
   - While standard Callbreak games are locked to 5 rounds, this application gives the host full freedom to select **5, 10, 15, or 20 Rounds**.
   - Dynamic 20-round score ledger showing round-by-round points, bids, overtricks, and cumulative rankings.
2. **Local Hotspot / LAN Multiplayer**:
   - **Zero Internet / Zero PC Required**: Host turns on mobile Wi-Fi hotspot; other phones connect directly and play.
   - Built-in host IP auto-detection (`192.168.43.1` / Wi-Fi IP) and optional PIN protection.
3. **Single Player vs AI (Offline)**:
   - Play anytime without an active connection against 3 smart AI bots.
4. **Online Cloud Multiplayer**:
   - 6-character room codes for remote games over 4G/5G/Internet.
5. **Authentic Felt Table & Sound**:
   - Deep emerald felt casino aesthetic, card fanning, legal card highlighting, illegal card dimming, and procedural Web Audio card throw & trump slam sounds.

---

## 🚀 How to Run and Play Immediately

### 1. Start the Game Server
From the project root:
```bash
npm start
```
The server will output:
```
♠️ Callbreak 20-Round Multiplayer Server is Live!
🌐 Local Web:    http://localhost:3000
📱 LAN/Hotspot:  http://<your-ip>:3000
```

### 2. Playing on Multiple Devices via Mobile Hotspot
1. Phone 1 turns on **Wi-Fi Hotspot**.
2. Run `npm start` (on Phone 1 or connected laptop).
3. The other 3 phones connect to Phone 1's Wi-Fi Hotspot.
4. Open the displayed URL (e.g. `http://192.168.43.1:3000`) on all phones.
5. Select **20 Rounds**, create or join table, and enjoy!

### 3. Run Automated Engine Tests
```bash
node test/game_engine.test.js
```

---

## 📁 Project Architecture

- **`server/`**:
  - `engine.js`: Authoritative Callbreak rules engine (52 cards, Spades trump, strict trick verification, 20-round scoring).
  - `ai.js`: Hand evaluation heuristic bot logic.
  - `index.js`: HTTP static server and WebSocket room manager.
- **`public/`**:
  - `index.html`: Responsive table layout, 20-round scorecard, lobby, and winner podium.
  - `css/game.css`: Luxury emerald felt casino styling, card fanning, and animations.
  - `js/cards.js`: 4K vector playing cards renderer.
  - `js/audio.js`: Zero-dependency Web Audio procedural sound engine (card snap, trump slam, fanfare).
  - `js/engine.js` & `js/ai.js`: Client-side offline engine mirrors.
  - `js/network.js`: WebSocket sync manager.
  - `js/app.js`: Master game controller.
- **`flutter_app/`**:
  - Full native Flutter/Android project ready for compilation into APK/AAB (`lib/server/embedded_server.dart`, `lib/engine/game_engine.dart`, `lib/screens/`).
- **`test/`**:
  - `game_engine.test.js`: Comprehensive automated test suite.

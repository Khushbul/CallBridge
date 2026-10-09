import 'package:flutter/material.dart';
import '../server/embedded_server.dart';
import 'game_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedRounds = 20; // 5, 10, 15, or 20 rounds
  final TextEditingController _nameController = TextEditingController(text: 'Khushbul');
  final TextEditingController _ipController = TextEditingController(text: '192.168.43.1');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF041009),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            padding: const EdgeInsets.all(28.0),
            decoration: BoxDecoration(
              color: const Color(0xDD091C12),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.4)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.7),
                  blurRadius: 30,
                  offset: const Offset(0, 15),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  '♠ CALLBREAK',
                  style: TextStyle(
                    fontFamily: 'serif',
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFD4AF37),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red.shade800,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '20 ROUNDS MATCH SUPPORT',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Name field
                TextField(
                  controller: _nameController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Player Name',
                    labelStyle: const TextStyle(color: Color(0xFFD4AF37)),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: const Color(0xFFD4AF37).withOpacity(0.4)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFD4AF37)),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Match length selection
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'SELECT MATCH LENGTH:',
                    style: TextStyle(
                      color: Color(0xFFF7E28B),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [5, 10, 15, 20].map((r) {
                    final selected = _selectedRounds == r;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedRounds = r),
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: selected ? const Color(0xFFD4AF37) : Colors.black45,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: selected ? const Color(0xFFF7E28B) : Colors.white24,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '$r Rnds',
                              style: TextStyle(
                                color: selected ? const Color(0xFF1A0B04) : Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),

                // Button: Play vs AI
                _buildMenuButton(
                  icon: Icons.person,
                  title: 'Play vs AI (Offline)',
                  subtitle: 'Practice with 3 intelligent bots ($_selectedRounds Rounds)',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => GameScreen(
                          playerName: _nameController.text,
                          totalRounds: _selectedRounds,
                          isOffline: true,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 12),

                // Button: Host Hotspot
                _buildMenuButton(
                  icon: Icons.wifi_tethering,
                  title: 'Host Hotspot Game',
                  subtitle: 'Embedded local server on your phone ($_selectedRounds Rounds)',
                  badge: 'HOTSPOT',
                  onTap: () async {
                    final server = LocalHotspotServer(totalRounds: _selectedRounds);
                    await server.start(port: 8081);
                    if (context.mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => GameScreen(
                            playerName: _nameController.text,
                            totalRounds: _selectedRounds,
                            isHost: true,
                            server: server,
                          ),
                        ),
                      );
                    }
                  },
                ),
                const SizedBox(height: 12),

                // Button: Join Hotspot
                _buildMenuButton(
                  icon: Icons.wifi,
                  title: 'Join Friends Game',
                  subtitle: 'Connect to friend\'s hotspot and play',
                  onTap: () => _showJoinDialog(context),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMenuButton({
    required IconData icon,
    required String title,
    required String subtitle,
    String? badge,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFFD4AF37), size: 28),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade700,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(color: Colors.white60, fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white38, size: 14),
          ],
        ),
      ),
    );
  }

  void _showJoinDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0D2818),
        title: const Text('Join Local Hotspot Table', style: TextStyle(color: Color(0xFFD4AF37))),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _ipController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Host IP Address',
                labelStyle: TextStyle(color: Colors.white70),
                hintText: '192.168.43.1',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD4AF37)),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => GameScreen(
                    playerName: _nameController.text,
                    hostIp: _ipController.text,
                    isClient: true,
                  ),
                ),
              );
            },
            child: const Text('Join', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

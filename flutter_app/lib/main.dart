import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const CallbreakApp());
}

class CallbreakApp extends StatelessWidget {
  const CallbreakApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Callbreak 20-Round Pro',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF041009),
        primaryColor: const Color(0xFFD4AF37),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFF165B38),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}

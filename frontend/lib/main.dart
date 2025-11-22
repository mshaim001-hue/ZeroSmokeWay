import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'providers/agent_provider.dart';
import 'providers/session_provider.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const ZeroSmokeWayApp());
}

class ZeroSmokeWayApp extends StatelessWidget {
  const ZeroSmokeWayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SessionProvider()),
        ChangeNotifierProxyProvider<SessionProvider, AgentProvider>(
          create: (_) => AgentProvider(),
          update: (_, sessionProvider, agentProvider) {
            agentProvider ??= AgentProvider();
            agentProvider.onAnamnesisDataUpdated = (data) async {
              await sessionProvider.updateAnamnesisData(data);
            };
            return agentProvider;
          },
        ),
      ],
      child: MaterialApp(
        title: 'ZeroSmokeWay',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF2E7D32),
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          textTheme: GoogleFonts.robotoTextTheme(),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}


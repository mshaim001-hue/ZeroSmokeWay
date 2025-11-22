import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/agent_provider.dart';
import '../../utils/constants.dart';
import 'agent_chat_screen.dart';

class AgentSelectionScreen extends StatelessWidget {
  const AgentSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Выбери своего помощника',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              Expanded(
                child: ListView(
                  children: [
                    _AgentCard(
                      title: 'Агент 1: Собиратель информации',
                      description:
                          'Помогу выявить твои убеждения, страхи и триггеры, которые составляют психологическую зависимость.',
                      icon: Icons.search,
                      color: Colors.blue,
                      onTap: () {
                        final agentProvider =
                            Provider.of<AgentProvider>(context, listen: false);
                        agentProvider.startAgent1();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const AgentChatScreen(),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    _AgentCard(
                      title: 'Агент 2: Развенчатель мифов',
                      description:
                          'Разрушу иллюзии и убеждения о курении, опираясь на логику и факты. Помогу увидеть правду.',
                      icon: Icons.lightbulb,
                      color: Colors.orange,
                      onTap: () {
                        final agentProvider =
                            Provider.of<AgentProvider>(context, listen: false);
                        agentProvider.startAgent2();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const AgentChatScreen(),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    _AgentCard(
                      title: 'Агент 3: Поддержка и опора',
                      description:
                          'Буду твоим помощником в поддержании свободы от курения. Поддержу позитивный настрой.',
                      icon: Icons.favorite,
                      color: Colors.green,
                      onTap: () {
                        final agentProvider =
                            Provider.of<AgentProvider>(context, listen: false);
                        agentProvider.startAgent3();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const AgentChatScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AgentCard extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _AgentCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 32),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withOpacity(0.7),
                          ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}


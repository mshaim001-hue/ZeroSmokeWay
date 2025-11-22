import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/agent_provider.dart';
import '../../models/agent_message.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeChat();
    });
  }

  void _initializeChat() {
    if (!_isInitialized) {
      _isInitialized = true;
      final agentProvider = Provider.of<AgentProvider>(context, listen: false);
      if (agentProvider.currentAgentType == null) {
        agentProvider.startAgent1();
      }
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AgentProvider>(
      builder: (context, agentProvider, _) {
        // Автоматическая прокрутка при новых сообщениях
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _scrollToBottom();
        });

        if (agentProvider.error != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(agentProvider.error!),
                backgroundColor: Colors.red,
              ),
            );
          });
        }

        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
                Theme.of(context).colorScheme.surface,
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                // Заголовок
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.smoke_free,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ZeroSmokeWay',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Text(
                              _getAgentName(agentProvider.currentAgentType),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withOpacity(0.6),
                                  ),
                            ),
                          ],
                        ),
                      ),
                      if (agentProvider.isLoading)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                ),

                // Чат
                Expanded(
                  child: agentProvider.messages.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CircularProgressIndicator(
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Загрузка...',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.6),
                                    ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: agentProvider.messages.length,
                          itemBuilder: (context, index) {
                            final message = agentProvider.messages[index];
                            return _MessageBubble(message: message);
                          },
                        ),
                ),

                // Поле ввода
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _messageController,
                            decoration: InputDecoration(
                              hintText: 'Напишите сообщение...',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(24),
                                borderSide: BorderSide.none,
                              ),
                              filled: true,
                              fillColor: Theme.of(context)
                                  .colorScheme
                                  .surfaceVariant
                                  .withOpacity(0.5),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 12,
                              ),
                            ),
                            maxLines: null,
                            textCapitalization: TextCapitalization.sentences,
                            enabled: !agentProvider.isLoading,
                            onSubmitted: (_) => _sendMessage(agentProvider),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            onPressed: agentProvider.isLoading
                                ? null
                                : () => _sendMessage(agentProvider),
                            icon: const Icon(Icons.send, color: Colors.white),
                            tooltip: 'Отправить',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _getAgentName(String? agentType) {
    switch (agentType) {
      case 'anamnesis':
        return 'Собираю информацию о вас...';
      case 'myth_buster':
        return 'Развенчиваю мифы о курении...';
      case 'support':
        return 'Поддерживаю вас на пути к свободе...';
      default:
        return 'Готов начать...';
    }
  }

  void _sendMessage(AgentProvider agentProvider) {
    final text = _messageController.text.trim();
    if (text.isEmpty || agentProvider.isLoading) return;

    agentProvider.sendUserMessage(text);
    _messageController.clear();
  }
}

class _MessageBubble extends StatelessWidget {
  final AgentMessage message;

  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: message.isUser
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.surfaceVariant,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(message.isUser ? 20 : 4),
            bottomRight: Radius.circular(message.isUser ? 4 : 20),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Text(
          message.text,
          style: TextStyle(
            color: message.isUser
                ? Theme.of(context).colorScheme.onPrimary
                : Theme.of(context).colorScheme.onSurfaceVariant,
            fontSize: 15,
            height: 1.4,
          ),
        ),
      ),
    );
  }
}


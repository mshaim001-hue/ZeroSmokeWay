import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
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
  final _inputFocusNode = FocusNode();
  bool _isInitialized = false;
  bool _wasLoading = false;

  // Цвета в стиле скриншота
  static const Color _headerColor = Color(0xFF1E3A5F); // Темно-синий
  static const Color _userBubbleColor = Color(0xFFE1BEE7); // Светло-фиолетовый
  static const Color _agentBubbleColor = Colors.white; // Белый
  static const Color _inputFieldColor = Color(0xFFF5F5F5); // Светло-серый
  static const Color _sendButtonColor = Color(0xFF1E3A5F); // Темно-синий

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
        agentProvider.startGuidedJourney();
      }
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _inputFocusNode.dispose();
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
        // После ответа бота возвращаем фокус в поле ввода
        if (_wasLoading && !agentProvider.isLoading) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (_inputFocusNode.canRequestFocus) {
              _inputFocusNode.requestFocus();
            }
          });
        }
        _wasLoading = agentProvider.isLoading;

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

        return Scaffold(
          backgroundColor: Colors.white,
          body: SafeArea(
            child: Column(
              children: [
                // Заголовок в стиле скриншота (темно-синий)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    color: _headerColor,
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _getAgentName(agentProvider.currentAgentType),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (agentProvider.orchestratorMode &&
                                agentProvider.phase != null &&
                                _getPhaseLabel(agentProvider.phase).isNotEmpty)
                              Text(
                                _getPhaseLabel(agentProvider.phase),
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.85),
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Чат с белым фоном
                Expanded(
                  child: Container(
                    color: Colors.white,
                    child: agentProvider.messages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const CircularProgressIndicator(
                                  color: _headerColor,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Загрузка...',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            itemCount: agentProvider.messages.length,
                            itemBuilder: (context, index) {
                              final message = agentProvider.messages[index];
                              return _MessageBubble(
                                message: message,
                                userBubbleColor: _userBubbleColor,
                                agentBubbleColor: _agentBubbleColor,
                              );
                            },
                          ),
                  ),
                ),

                // Поле ввода в стиле скриншота
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 4,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Row(
                      children: [
                        Expanded(
                          child: Focus(
                            onKeyEvent: (_, event) {
                              if (event is KeyDownEvent &&
                                  event.logicalKey == LogicalKeyboardKey.enter &&
                                  !HardwareKeyboard.instance.isShiftPressed) {
                                _sendMessage(agentProvider);
                                return KeyEventResult.handled;
                              }
                              return KeyEventResult.ignored;
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: _inputFieldColor,
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: TextField(
                                focusNode: _inputFocusNode,
                                controller: _messageController,
                                decoration: const InputDecoration(
                                  hintText: 'Напишите сообщение...',
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 12,
                                  ),
                                  hintStyle: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 15,
                                  ),
                                ),
                                style: const TextStyle(fontSize: 15),
                                maxLines: null,
                                textCapitalization: TextCapitalization.sentences,
                                enabled: !agentProvider.isLoading,
                                onSubmitted: (_) => _sendMessage(agentProvider),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Material(
                          color: agentProvider.isLoading
                              ? _sendButtonColor.withOpacity(0.5)
                              : _sendButtonColor,
                          borderRadius: BorderRadius.circular(24),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(24),
                            onTap: agentProvider.isLoading
                                ? null
                                : () => _sendMessage(agentProvider),
                            child: const SizedBox(
                              width: 48,
                              height: 48,
                              child: Icon(
                                Icons.send,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
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
        return 'Алекс';
      case 'myth_buster':
        return 'Алекс';
      case 'support':
        return 'Алекс';
      default:
        return 'Алекс';
    }
  }

  String _getPhaseLabel(String? phase) {
    switch (phase) {
      case 'welcome':
        return 'Знакомство';
      case 'anamnesis':
        return 'Твоя ситуация';
      case 'myth_busting':
        return 'Разбираем мифы';
      case 'support':
        return 'Поддержка';
      default:
        return '';
    }
  }

  void _sendMessage(AgentProvider agentProvider) {
    final text = _messageController.text.trim();
    if (text.isEmpty || agentProvider.isLoading) return;

    // Снимаем фокус до отправки, чтобы на Web не падало из-за размонтирования TextField
    // (Flutter Web assertion: "The DOM element of this text editing strategy is not currently active")
    FocusScope.of(context).unfocus();
    _messageController.clear();
    // Отправка в следующем кадре, после того как текстовое соединение закроется
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      agentProvider.sendUserMessage(text);
    });
  }
}

class _MessageBubble extends StatelessWidget {
  final AgentMessage message;
  final Color userBubbleColor;
  final Color agentBubbleColor;

  const _MessageBubble({
    required this.message,
    required this.userBubbleColor,
    required this.agentBubbleColor,
  });

  String _formatTime(DateTime timestamp) {
    return DateFormat('HH:mm').format(timestamp);
  }

  @override
  Widget build(BuildContext context) {
    if (message.isUser) {
      // Сообщение пользователя справа (светло-фиолетовый)
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: userBubbleColor,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: SelectableText(
                      message.text,
                      style: const TextStyle(
                        color: Colors.black87,
                        fontSize: 15,
                        height: 1.4,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4, right: 8),
              child: Text(
                _formatTime(message.timestamp),
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      );
    } else {
      // Сообщение агента слева (белый) с аватаром
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Аватар агента
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE1BEE7), // Светло-фиолетовый фон
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.person,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: agentBubbleColor,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 2,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: SelectableText(
                      message.text,
                      style: const TextStyle(
                        color: Colors.black87,
                        fontSize: 15,
                        height: 1.4,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 48),
              child: Text(
                _formatTime(message.timestamp),
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      );
    }
  }
}


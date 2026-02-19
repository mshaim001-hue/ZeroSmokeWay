import 'package:flutter/foundation.dart';
import '../models/agent_message.dart';
import '../utils/constants.dart';
import '../services/api_service.dart';

class AgentProvider with ChangeNotifier {
  final List<AgentMessage> _messages = [];
  bool _isLoading = false;
  String? _error;
  String? _currentAgentType;
  Map<String, dynamic>? _anamnesisData;
  /// Режим оркестратора: диалог ведётся по методике, агенты переключаются автоматически.
  bool _orchestratorMode = false;
  /// Текущая фаза пути (welcome, anamnesis, myth_busting, support).
  String? _phase;
  /// План на 3 шага вперёд от оркестратора (передаётся в следующий запрос для проверки onTrack).
  Map<String, dynamic>? _orchestratorPlan;

  // Callback для сохранения данных в сессию
  Function(Map<String, dynamic>)? onAnamnesisDataUpdated;

  List<AgentMessage> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get currentAgentType => _currentAgentType;
  Map<String, dynamic>? get anamnesisData => _anamnesisData;
  bool get orchestratorMode => _orchestratorMode;
  String? get phase => _phase;

  // Проверка, собрана ли вся информация для Агента 1
  bool _isAnamnesisComplete() {
    if (_anamnesisData == null) return false;
    
    // Проверяем наличие ключевых данных
    final requiredFields = ['smokingYears', 'cigarettesPerDay', 'reasons', 'fears', 'triggers'];
    final hasAllFields = requiredFields.every((field) {
      final value = _anamnesisData![field];
      if (value == null) return false;
      if (value is List && value.isEmpty) return false;
      if (value is String && value.isEmpty) return false;
      return true;
    });
    
    // Также проверяем, что было достаточно диалога (минимум 5 сообщений от агента)
    final agentMessages = _messages.where((m) => !m.isUser).length;
    
    return hasAllFields && agentMessages >= 5;
  }

  // Проверка, завершена ли работа Агента 2
  bool _isMythBustingComplete() {
    // Агент 2 завершает работу после достаточного количества диалога
    // (минимум 8 сообщений от агента)
    final agentMessages = _messages.where((m) => !m.isUser).length;
    return agentMessages >= 8;
  }

  /// Запуск пути по методике: оркестратор ведёт диалог, переключает агентов и держит фокус.
  Future<void> startGuidedJourney() async {
    _orchestratorMode = true;
    _phase = Constants.phaseWelcome;
    _orchestratorPlan = null;
    _currentAgentType = Constants.agent1Type;
    _messages.clear();
    _error = null;
    _anamnesisData = null;
    notifyListeners();

    _messages.add(AgentMessage(
      text: 'Привет 🙂\n\nЯ здесь, чтобы помочь тебе разобраться с курением.\n\nБез моралей, без давления, без «надо». Просто честный разговор.',
      isUser: false,
      timestamp: DateTime.now(),
    ));
    _messages.add(AgentMessage(
      text: 'Для начала — как я могу к тебе обращаться?',
      isUser: false,
      timestamp: DateTime.now(),
    ));
    notifyListeners();
  }

  Future<void> startAgent1() async {
    _orchestratorMode = false;
    _phase = null;
    _currentAgentType = Constants.agent1Type;
    _messages.clear();
    _error = null;
    _anamnesisData = null;
    notifyListeners();

    await _sendMessage(
      'Привет 🙂\n\nЯ здесь, чтобы помочь тебе разобраться с курением.\n\nБез моралей, без давления, без «надо». Просто честный разговор.',
      agentType: Constants.agent1Type,
    );
    await Future.delayed(const Duration(milliseconds: 800));
    await _sendMessage(
      'Для начала — как я могу к тебе обращаться?',
      agentType: Constants.agent1Type,
    );
  }

  Future<void> _switchToAgent2() async {
    _currentAgentType = Constants.agent2Type;
    _messages.clear();
    _error = null;
    notifyListeners();

    await _sendMessage(
      'Отлично! Теперь давай разберемся с твоими убеждениями о курении. Я помогу тебе увидеть правду.',
      agentType: Constants.agent2Type,
    );
  }

  Future<void> _switchToAgent3() async {
    _currentAgentType = Constants.agent3Type;
    _messages.clear();
    _error = null;
    notifyListeners();

    await _sendMessage(
      'Поздравляю! Теперь я буду твоим помощником в поддержании свободы от курения. Как дела?',
      agentType: Constants.agent3Type,
    );
  }

  Future<void> sendUserMessage(String message) async {
    if (_currentAgentType == null) {
      await startGuidedJourney();
      return;
    }

    _messages.add(AgentMessage(
      text: message,
      isUser: true,
      timestamp: DateTime.now(),
    ));
    notifyListeners();

    if (_orchestratorMode) {
      await _sendMessageViaOrchestrator(message);
    } else {
      await _sendMessage(message, agentType: _currentAgentType!);
    }
  }

  Future<void> _sendMessageViaOrchestrator(String message) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final apiService = ApiService();
      final data = await apiService.sendOrchestratorMessage(
        message: message,
        conversationHistory: _messages,
        anamnesisData: _anamnesisData,
        phase: _phase ?? Constants.phaseWelcome,
        userProfile: null,
        currentPlan: _orchestratorPlan,
      );

      final agentResponse = data['response'] as String;
      final extractedData = data['extractedData'] as Map<String, dynamic>?;
      final phaseUpdate = data['phase'] as String?;
      final nextAgent = data['nextAgent'] as String?;
      final plan = data['plan'] as Map<String, dynamic>?;

      _messages.add(AgentMessage(
        text: agentResponse,
        isUser: false,
        timestamp: DateTime.now(),
      ));
      if (phaseUpdate != null) _phase = phaseUpdate;
      if (nextAgent != null) _currentAgentType = nextAgent;
      if (plan != null) _orchestratorPlan = plan;
      if (extractedData != null && extractedData.isNotEmpty) {
        _anamnesisData = {...?_anamnesisData, ...extractedData};
        if (onAnamnesisDataUpdated != null) {
          await onAnamnesisDataUpdated!(_anamnesisData!);
        }
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _sendMessage(String message, {required String agentType}) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final apiService = ApiService();
      final data = await apiService.sendAgentMessage(
        message: message,
        agentType: agentType,
        conversationHistory: _messages,
        anamnesisData: _anamnesisData,
      );

      final agentResponse = data['response'] as String;
      final extractedData = data['extractedData'] as Map<String, dynamic>?;

      _messages.add(AgentMessage(
        text: agentResponse,
        isUser: false,
        timestamp: DateTime.now(),
      ));

      // Обработка данных от Агента 1
      if (agentType == Constants.agent1Type && extractedData != null) {
        _anamnesisData = {
          ...?_anamnesisData,
          ...extractedData,
        };
        
        // Сохраняем в сессию
        if (onAnamnesisDataUpdated != null) {
          await onAnamnesisDataUpdated!(_anamnesisData!);
        }

        // Автоматическое переключение на Агента 2
        if (_isAnamnesisComplete()) {
          // Небольшая задержка для плавности
          await Future.delayed(const Duration(milliseconds: 500));
          await _switchToAgent2();
          return;
        }
      }

      // Автоматическое переключение на Агента 3
      if (agentType == Constants.agent2Type && _isMythBustingComplete()) {
        await Future.delayed(const Duration(milliseconds: 500));
        await _switchToAgent3();
        return;
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearMessages() {
    _messages.clear();
    _currentAgentType = null;
    _anamnesisData = null;
    _orchestratorMode = false;
    _phase = null;
    _orchestratorPlan = null;
    notifyListeners();
  }
}

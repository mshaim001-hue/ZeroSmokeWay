import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

/// Провайдер для управления сессиями без авторизации
/// Хранит данные локально и использует session ID для идентификации
class SessionProvider with ChangeNotifier {
  String? _sessionId;
  Map<String, dynamic>? _sessionData;
  bool _isLoading = false;

  String? get sessionId => _sessionId;
  Map<String, dynamic>? get sessionData => _sessionData;
  bool get isLoading => _isLoading;

  SessionProvider() {
    _init();
  }

  Future<void> _init() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Получаем или создаем session ID
      _sessionId = prefs.getString('session_id');
      if (_sessionId == null) {
        _sessionId = _generateSessionId();
        await prefs.setString('session_id', _sessionId!);
      }

      // Загружаем данные сессии
      final sessionDataString = prefs.getString('session_data');
      if (sessionDataString != null) {
        _sessionData = jsonDecode(sessionDataString) as Map<String, dynamic>;
      } else {
        _sessionData = {
          'created_at': DateTime.now().toIso8601String(),
          'anamnesis_data': null,
          'conversations': [],
        };
        await _saveSessionData();
      }
    } catch (e) {
      debugPrint('Error loading session: $e');
      _sessionData = {
        'created_at': DateTime.now().toIso8601String(),
        'anamnesis_data': null,
        'conversations': [],
      };
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String _generateSessionId() {
    return DateTime.now().millisecondsSinceEpoch.toString() +
        '_' +
        (1000 + (9999 - 1000) * (DateTime.now().microsecond / 1000000)).round().toString();
  }

  Future<void> _saveSessionData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('session_data', jsonEncode(_sessionData));
    } catch (e) {
      debugPrint('Error saving session data: $e');
    }
  }

  Future<void> updateAnamnesisData(Map<String, dynamic> data) async {
    if (_sessionData == null) {
      await _init();
    }
    
    _sessionData ??= {};
    _sessionData!['anamnesis_data'] = data;
    _sessionData!['updated_at'] = DateTime.now().toIso8601String();
    
    await _saveSessionData();
    notifyListeners();
  }

  Future<void> addConversation(String agentType, Map<String, dynamic> conversation) async {
    if (_sessionData == null) {
      await _init();
    }
    
    _sessionData ??= {};
    if (_sessionData!['conversations'] == null) {
      _sessionData!['conversations'] = [];
    }
    
    final conversations = _sessionData!['conversations'] as List;
    conversations.add({
      'agent_type': agentType,
      'conversation': conversation,
      'timestamp': DateTime.now().toIso8601String(),
    });
    
    await _saveSessionData();
    notifyListeners();
  }

  Future<void> clearSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('session_id');
      await prefs.remove('session_data');
      
      _sessionId = null;
      _sessionData = null;
      
      // Создаем новую сессию
      await _init();
    } catch (e) {
      debugPrint('Error clearing session: $e');
    }
  }
}


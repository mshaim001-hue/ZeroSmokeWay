import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/agent_message.dart';
import '../utils/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Future<Map<String, dynamic>> sendAgentMessage({
    required String message,
    required String agentType,
    required List<AgentMessage> conversationHistory,
    Map<String, dynamic>? anamnesisData,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/api/agent'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'message': message,
          'agentType': agentType,
          'conversationHistory': conversationHistory.map((m) => m.toJson()).toList(),
          'anamnesisData': anamnesisData,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to send message: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  /// Запрос к оркестратору: ведёт диалог по методике, сам выбирает агента и фокус ответа.
  /// [currentPlan] — план на 3 шага от прошлого ответа (оркестратор сравнивает и при сбое строит новый).
  Future<Map<String, dynamic>> sendOrchestratorMessage({
    required String message,
    required List<AgentMessage> conversationHistory,
    Map<String, dynamic>? anamnesisData,
    required String phase,
    Map<String, dynamic>? userProfile,
    Map<String, dynamic>? currentPlan,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/api/orchestrator'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'message': message,
          'conversationHistory': conversationHistory.map((m) => m.toJson()).toList(),
          'anamnesisData': anamnesisData,
          'phase': phase,
          'userProfile': userProfile,
          'currentPlan': currentPlan,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to send message: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}


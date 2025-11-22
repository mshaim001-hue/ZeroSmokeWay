class UserProfile {
  final String userId;
  final String? name;
  final int? smokingYears;
  final int? cigarettesPerDay;
  final DateTime? quitDate;
  final String? currentStage;
  final Map<String, dynamic>? anamnesisData;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    required this.userId,
    this.name,
    this.smokingYears,
    this.cigarettesPerDay,
    this.quitDate,
    this.currentStage,
    this.anamnesisData,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['user_id'] as String,
      name: json['name'] as String?,
      smokingYears: json['smoking_years'] as int?,
      cigarettesPerDay: json['cigarettes_per_day'] as int?,
      quitDate: json['quit_date'] != null
          ? DateTime.parse(json['quit_date'] as String)
          : null,
      currentStage: json['current_stage'] as String?,
      anamnesisData: json['anamnesis_data'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'smoking_years': smokingYears,
      'cigarettes_per_day': cigarettesPerDay,
      'quit_date': quitDate?.toIso8601String(),
      'current_stage': currentStage,
      'anamnesis_data': anamnesisData,
    };
  }
}


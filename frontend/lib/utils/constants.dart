class Constants {
  // Supabase Configuration
  // Проект ID: ousrgbmapuhimblhyetj
  static const String supabaseUrl = 'https://ousrgbmapuhimblhyetj.supabase.co';
  static const String supabaseAnonKey = 'sb_publishable_luXacOL3lA_KUoG7DUHEKg_fp-UdsQI'; // Publishable key (безопасен для клиента)
  
  // API Configuration
  // Для локальной разработки используйте: http://localhost:3000
  // Для продакшена замените на URL вашего Vercel проекта
  static const String apiBaseUrl = 'http://localhost:3000';
  
  // App Constants
  static const String appName = 'ZeroSmokeWay';
  static const String appVersion = '1.0.0';
  
  // Agent Types
  static const String agent1Type = 'anamnesis'; // Собиратель информации
  static const String agent2Type = 'myth_buster'; // Развенчатель мифов
  static const String agent3Type = 'support'; // Поддержка и опора
  
  // Stages
  static const String stagePreparation = 'preparation';
  static const String stageQuitDay = 'quit_day';
  static const String stageMaintenance = 'maintenance';
}


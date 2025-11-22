# Руководство по разработке

## Архитектура проекта

### Frontend (Flutter)
- **State Management**: Provider
- **Архитектура**: MVVM (Model-View-ViewModel)
- **Структура**:
  - `lib/models/` - модели данных
  - `lib/providers/` - провайдеры состояния
  - `lib/screens/` - экраны приложения
  - `lib/services/` - сервисы для API
  - `lib/utils/` - утилиты и константы
  - `lib/widgets/` - переиспользуемые виджеты

### Backend (Node.js)
- **Framework**: Express.js
- **AI Integration**: OpenAI API
- **Структура**:
  - `routes/` - маршруты API
  - `services/` - бизнес-логика и интеграции
  - `api/` - Vercel Serverless Functions

## Три AI-агента

### Агент 1: Собиратель информации (Anamnesis)
- Собирает информацию о пользователе
- Выявляет убеждения, страхи и триггеры
- Извлекает структурированные данные

### Агент 2: Развенчатель мифов (Myth Buster)
- Разрушает иллюзии о курении
- Использует метод Аллена Карра
- Персонализирует на основе анамнеза

### Агент 3: Поддержка и опора (Support)
- Поддерживает на всех этапах
- Создает позитивный настрой
- Помогает поддерживать свободу

## Стандарты кода

### Dart/Flutter
- Используйте `const` конструкторы где возможно
- Следуйте правилам из `analysis_options.yaml`
- Комментируйте публичные API

### JavaScript/Node.js
- Используйте ES6+ синтаксис
- Обрабатывайте ошибки явно
- Используйте async/await вместо callbacks

## Тестирование

```bash
# Frontend
cd frontend
flutter test

# Backend
cd backend
npm test
```

## Git Workflow

1. Создайте ветку от `main`
2. Внесите изменения
3. Создайте Pull Request
4. Дождитесь code review

## Добавление нового функционала

1. Обновите документацию
2. Добавьте тесты
3. Обновите версию в `pubspec.yaml` / `package.json`
4. Обновите `CHANGELOG.md` (если есть)


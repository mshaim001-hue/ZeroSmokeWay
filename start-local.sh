#!/bin/bash

# Скрипт для запуска приложения локально
# Использование: ./start-local.sh

echo "🚀 ZeroSmokeWay - Локальный запуск"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js v22.x или выше"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Требуется Node.js v22.x или выше. Текущая версия: $(node --version)"
    exit 1
fi

# Проверка Flutter
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter не установлен. Установите Flutter SDK"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ Flutter: $(flutter --version | head -n 1)"
echo ""

# Проверка .env файла
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Файл backend/.env не найден"
    echo "📝 Создаю файл из примера..."
    cp backend/env.example backend/.env
    echo "⚠️  ВАЖНО: Откройте backend/.env и добавьте ваш OPENAI_API_KEY!"
    echo ""
fi

# Проверка зависимостей backend
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Устанавливаю зависимости backend..."
    cd backend
    npm install
    cd ..
fi

# Проверка зависимостей frontend
if [ ! -d "frontend/.dart_tool" ]; then
    echo "📦 Устанавливаю зависимости frontend..."
    cd frontend
    flutter pub get
    cd ..
fi

echo ""
echo "🎯 Готово к запуску!"
echo ""
echo "Запустите в двух терминалах:"
echo ""
echo "Терминал 1 (Backend):"
echo "  cd backend && npm run dev"
echo ""
echo "Терминал 2 (Frontend):"
echo "  cd frontend && flutter run -d chrome"
echo ""
echo "Или запустите backend сейчас? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "🚀 Запускаю backend..."
    cd backend
    npm run dev
fi


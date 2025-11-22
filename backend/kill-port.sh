#!/bin/bash
# Скрипт для освобождения порта 3000

PORT=${1:-3000}

echo "🔍 Ищу процессы на порту $PORT..."

PIDS=$(lsof -ti:$PORT)

if [ -z "$PIDS" ]; then
  echo "✅ Порт $PORT свободен"
  exit 0
fi

echo "🛑 Найдены процессы: $PIDS"
echo "⏹️  Останавливаю..."

kill -9 $PIDS 2>/dev/null

sleep 1

if lsof -ti:$PORT > /dev/null 2>&1; then
  echo "❌ Не удалось освободить порт"
  exit 1
else
  echo "✅ Порт $PORT освобожден"
  exit 0
fi


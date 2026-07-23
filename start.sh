#!/bin/bash
set -e

echo "=== Запуск ИС УКО АО НПО Ангстрем ==="

# Backend
cd "$(dirname "$0")/backend"
if [ ! -f "database.db" ]; then
  echo "Инициализация БД и seed-данных..."
  .venv/bin/python -m app.seed
fi
echo "Запуск backend на :8000..."
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend
echo "Запуск frontend на :5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Система запущена:"
echo "   Сотрудники: http://localhost:5173/"
echo "   Администратор: http://localhost:5173/admin/login"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Логины администратора:"
echo "   admin / admin123"
echo "   hr_specialist / angstrem2024"
echo ""
echo "Нажмите Ctrl+C для остановки"

wait $BACKEND_PID $FRONTEND_PID

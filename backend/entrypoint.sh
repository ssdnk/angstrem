#!/bin/sh
if [ ! -f /data/database.db ]; then
    echo "First run: seeding database..."
    python -m app.seed
fi
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

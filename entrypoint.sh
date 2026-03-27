#!/bin/sh
set -e

echo "Contents of /app/dist/:"
ls /app/dist/ 2>/dev/null || echo "(empty or missing)"

echo "Running database migrations..."
node dist/migrate

echo "Starting application..."
exec node dist/main

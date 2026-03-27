#!/bin/sh
set -e

echo "Running database migrations..."
node dist/migrate

echo "Starting application..."
exec node dist/main

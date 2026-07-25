#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "$BACKEND_DIR"

SEED_DATA=true

for arg in "$@"; do
    case "$arg" in
        --no-seed)
            SEED_DATA=false
            ;;
        --seed)
            SEED_DATA=true
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: ./scripts/start_backend.sh [--seed|--no-seed]"
            exit 1
            ;;
    esac
done

echo "Starting database container..."
docker compose up -d db

echo "Building web image..."
docker compose build web

echo "Waiting for database to be ready..."
until docker compose exec -T db pg_isready -U postgres -d adaptive_sat >/dev/null 2>&1; do
    sleep 1
done

echo "Running Alembic migrations..."
docker compose run --rm web alembic upgrade head

if [ "$SEED_DATA" = true ]; then
    echo "Seeding SAT questions..."
    docker compose run --rm web python scripts/seed_sat_questions.py
fi

echo "Starting web container..."
docker compose up -d web

echo "Backend is running."
echo "Swagger: http://localhost:8000/docs"
echo "Logs: docker compose logs -f web"
#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose"
SUDO=""
NO_CACHE=""

if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
fi

if ! docker ps >/dev/null 2>&1; then
  SUDO="sudo"
fi

cd "$ROOT_DIR"

echo "==> Pancake upgrade starting in $ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo "ERROR: .env not found. Create it from .env.example before upgrading."
  exit 1
fi

echo "==> Pull latest code"
git pull --ff-only

echo "==> Start dependencies"
$SUDO $COMPOSE up -d postgres minio

echo "==> Build app image"
$SUDO $COMPOSE build $NO_CACHE app

echo "==> Recreate app"
$SUDO $COMPOSE up -d --force-recreate app

echo "==> Wait for app health"
for attempt in {1..30}; do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000/login"; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then
    echo "ERROR: app did not respond on http://127.0.0.1:3000/login"
    $SUDO $COMPOSE logs app --tail=120
    exit 1
  fi
  sleep 2
done

echo "==> Verify auth page status"
STATUS="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://127.0.0.1:3000/login)"
echo "local /login: $STATUS"

echo "==> Running containers"
$SUDO $COMPOSE ps

echo "==> Upgrade complete"

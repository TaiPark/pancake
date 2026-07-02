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
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000/login" || true)"
  if [[ "$STATUS" == "200" ]]; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then
    echo "ERROR: app did not return 200 on http://127.0.0.1:3000/login; last status was ${STATUS:-no response}"
    $SUDO $COMPOSE logs app --tail=120
    exit 1
  fi
  sleep 2
done

echo "==> Verify auth page status"
STATUS="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://127.0.0.1:3000/login)"
echo "local /login: $STATUS"

echo "==> Verify static assets"
CSS_PATH="$(curl -fsS http://127.0.0.1:3000/login | grep -o '/_next/static/css/[^" ]*\.css' | head -1 || true)"
if [[ -z "$CSS_PATH" ]]; then
  echo "ERROR: no CSS asset was referenced by /login"
  $SUDO $COMPOSE logs app --tail=120
  exit 1
fi

CSS_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000${CSS_PATH}" || true)"
echo "local CSS ${CSS_PATH}: ${CSS_STATUS:-no response}"
if [[ "$CSS_STATUS" != "200" ]]; then
  echo "ERROR: CSS asset did not return 200"
  $SUDO $COMPOSE exec app sh -lc 'pwd; ls -lah .next; find .next/static -maxdepth 3 -type f | head -40' || true
  exit 1
fi

echo "==> Running containers"
$SUDO $COMPOSE ps

echo "==> Upgrade complete"

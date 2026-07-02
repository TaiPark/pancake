#!/bin/sh
set -e

if [ ! -d ".next/static" ]; then
  echo "ERROR: .next/static is missing. Rebuild the app image without cache." >&2
  exit 1
fi

if ! find ".next/static/css" -type f -name "*.css" | grep -q .; then
  echo "ERROR: no CSS files found in .next/static/css. Rebuild the app image without cache." >&2
  exit 1
fi

npx prisma migrate deploy
npx prisma db seed || true
node server.js

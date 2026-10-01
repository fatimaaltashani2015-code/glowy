#!/bin/sh
set -eu

mkdir -p /data /app/data/backups

export DATABASE_URL="${DATABASE_URL:-file:/data/glowy.db}"
export PORT="${PORT:-3000}"

cd /app
npx prisma db push --schema=./prisma/schema.prisma --skip-generate
node ./scripts/ensure-admin.cjs
exec npx next start -H 0.0.0.0 -p "${PORT}"

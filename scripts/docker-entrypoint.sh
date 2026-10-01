#!/bin/sh
set -eu

echo "[glowy] starting entrypoint..."

mkdir -p /data /app/data/backups
chown -R nextjs:nodejs /data /app/data 2>/dev/null || true
chmod -R u+rwX /data /app/data 2>/dev/null || true

export DATABASE_URL="${DATABASE_URL:-file:/data/glowy.db}"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

echo "[glowy] DATABASE_URL=${DATABASE_URL}"
echo "[glowy] listening on ${HOSTNAME}:${PORT}"

cd /app

echo "[glowy] applying database schema..."
npx prisma db push --schema=./prisma/schema.prisma --skip-generate

echo "[glowy] ensuring admin user..."
node ./scripts/ensure-admin.cjs

echo "[glowy] launching Next.js..."
exec npx next start -H "${HOSTNAME}" -p "${PORT}"

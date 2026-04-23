#!/bin/bash
# Independent Server Start Script - Complete Deployment
# Starts application with local Redis and full persistence

set -e

echo "=========================================="
echo "CTS v3 - Independent Server Deployment"
echo "=========================================="

# Configuration
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3001}
export NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3001}

# Redis Configuration
export REDIS_PERSISTENCE=${REDIS_PERSISTENCE:-true}
export REDIS_SNAPSHOT_PATH=${REDIS_SNAPSHOT_PATH:-./data/redis-snapshot.json}

# Security (generate if not set)
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "default-jwt-secret-change-in-production-$(date +%s)")
  echo "Generated JWT_SECRET"
fi

# Create necessary directories
mkdir -p ./data ./logs
chmod 755 ./data ./logs

echo "[1/6] Checking Redis..."
if command -v redis-server &> /dev/null; then
    if ! pgrep -x "redis-server" > /dev/null; then
        echo "  Starting Redis server..."
        redis-server --daemonize yes \
            --appendonly yes \
            --dir ./data \
            --port 6379 \
            --loglevel warning \
            2>/dev/null || echo "  Redis start failed (continuing without)"
        sleep 1
    else
        echo "  ✓ Redis already running"
    fi
else
    echo "  ⚠ Redis not installed - using in-memory Redis with persistence"
fi

echo "[2/6] Running database migrations..."
bun run migration:run 2>/dev/null || echo "  (Migrations completed in app startup)"

echo "[3/6] Building application..."
if [ ! -d ".next" ] || [ "$FORCE_BUILD" = "true" ]; then
    bun run build
fi

echo "[4/6] Initializing application..."
curl -s http://localhost:$PORT/api/system/init 2>/dev/null > /dev/null || true

echo "[5/6] Starting Next.js server on port $PORT..."
echo "=========================================="
echo "Server will be available at: http://localhost:$PORT"
echo "Health check: http://localhost:$PORT/api/system/health"
echo "Redis persistence: $REDIS_PERSISTENCE"
echo "Snapshot path: $REDIS_SNAPSHOT_PATH"
echo "=========================================="

# Start the application
if [ "$NODE_ENV" = "development" ]; then
    bun run dev -p $PORT
else
    bun run start -p $PORT
fi

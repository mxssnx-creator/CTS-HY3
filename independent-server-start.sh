#!/bin/bash
# Independent Server Start Script
# Starts the application with local Redis and persistence

set -e

echo "=========================================="
echo "CTS v3 - Independent Server Startup"
echo "=========================================="

# Configuration
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3001}
export REDIS_PERSISTENCE=${REDIS_PERSISTENCE:-true}
export REDIS_SNAPSHOT_PATH=${REDIS_SNAPSHOT_PATH:-./data/redis-snapshot.json}

# Create data directory
mkdir -p ./data

# Check if Redis is installed locally
if command -v redis-server &> /dev/null; then
    echo "[1/4] Starting local Redis server..."
    redis-server --daemonize yes --appendonly yes --dir ./data --requirepass "" 2>/dev/null || true
    echo "  ✓ Redis started"
else
    echo "[1/4] Redis not found locally - using in-memory Redis with persistence"
fi

# Run database migrations
echo "[2/4] Running database migrations..."
node -e "
const { initRedis } = require('./lib/redis-db.ts');
initRedis().then(() => console.log('  ✓ Redis initialized')).catch(e => console.log('  ⚠ Redis init warning:', e.message));
" 2>/dev/null || true

# Build if needed
if [ ! -d ".next" ]; then
    echo "[3/4] Building application..."
    npm run build
fi

# Start the application
echo "[4/4] Starting Next.js server on port $PORT..."
echo "=========================================="
echo "Server will be available at: http://localhost:$PORT"
echo "Health check: http://localhost:$PORT/health"
echo "=========================================="

npm start

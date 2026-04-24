#!/bin/bash
# CTS v3 - Coordinated Service Startup Script
# For local development without Docker

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
REDIS_PORT=6379
APP_PORT=3001
DATA_DIR="${SCRIPT_DIR}/data"
LOGS_DIR="${SCRIPT_DIR}/logs"

# Create directories
mkdir -p "$DATA_DIR" "$LOGS_DIR"

main() {
    echo ""
    log_info "=========================================="
    log_info "CTS v3 - Coordinated Startup"
    log_info "=========================================="
    echo ""

    # Step 1: Check prerequisites
    log_info "Step 1/5: Checking prerequisites..."
    
    if ! command -v redis-server &> /dev/null; then
        log_error "Redis is not installed. Please install Redis first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    log_success "Prerequisites check passed\n"

    # Step 2: Start Redis
    log_info "Step 2/5: Starting Redis..."
    
    if pgrep -x "redis-server" > /dev/null; then
        log_warning "Redis is already running"
    else
        redis-server --daemonize yes \
            --port $REDIS_PORT \
            --appendonly yes \
            --appendfsync everysec \
            --dir "$DATA_DIR" \
            --logfile "$LOGS_DIR/redis.log" \
            --maxmemory 256mb \
            --maxmemory-policy allkeys-lru
        
        sleep 2
        
        if redis-cli -p $REDIS_PORT ping | grep -q PONG; then
            log_success "Redis started on port $REDIS_PORT\n"
        else
            log_error "Failed to start Redis"
            exit 1
        fi
    fi

    # Step 3: Initialize Database
    log_info "Step 3/5: Initializing database..."
    
    export REDIS_URL="redis://localhost:${REDIS_PORT}"
    export REDIS_PERSISTENCE=true
    export REDIS_SNAPSHOT_PATH="${DATA_DIR}/redis-snapshot.json"
    export NODE_ENV=development
    
    if [ -f "${SCRIPT_DIR}/scripts/init-database.js" ]; then
        node "${SCRIPT_DIR}/scripts/init-database.js" 2>&1 | tee -a "$LOGS_DIR/init.log"
        log_success "Database initialization complete\n"
    else
        log_warning "init-database.js not found, skipping...\n"
    fi

    # Step 4: Start Next.js Application
    log_info "Step 4/5: Starting Next.js application..."
    
    export PORT=$APP_PORT
    export NEXT_PUBLIC_APP_URL="http://localhost:${APP_PORT}"
    
    log_info "Starting Next.js on port $APP_PORT..."
    log_info "Logs: $LOGS_DIR/next.log"
    log_info "Press Ctrl+C to stop all services\n"
    
    # Start Next.js in foreground (this keeps the script running)
    npm run dev > "$LOGS_DIR/next.log" 2>&1 &
    NEXT_PID=$!
    
    # Trap Ctrl+C to cleanup
    trap "log_info 'Stopping services...'; kill $NEXT_PID 2>/dev/null || true; exit 0" INT TERM
    
    # Step 5: Wait and monitor
    log_info "Step 5/5: Monitoring services..."
    echo ""
    
    # Wait for app to be ready
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "http://localhost:${APP_PORT}/api/health" > /dev/null 2>&1; then
            echo ""
            log_success "=========================================="
            log_success "CTS v3 is ready!"
            log_success "=========================================="
            echo ""
            log_info "Application URL: http://localhost:${APP_PORT}"
            log_info "Health Check: http://localhost:${APP_PORT}/api/health"
            echo ""
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Application failed to start within expected time"
        kill $NEXT_PID 2>/dev/null || true
        exit 1
    fi
    
    # Keep running and show logs
    tail -f "$LOGS_DIR/next.log" "$LOGS_DIR/redis.log" 2>/dev/null || wait $NEXT_PID
}

main "$@"

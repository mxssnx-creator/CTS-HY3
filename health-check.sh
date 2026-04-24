#!/bin/bash
# CTS v3 - Health Check Script
# Verifies all services are running correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running in Docker or locally
if docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
    RUNNING_IN_DOCKER=true
else
    RUNNING_IN_DOCKER=false
fi

# Health check functions
check_redis() {
    log_info "Checking Redis..."
    if [ "$RUNNING_IN_DOCKER" = true ]; then
        if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli -a "${REDIS_PASSWORD:-default_password}" ping 2>/dev/null | grep -q PONG; then
            log_success "Redis is healthy (Docker)"
            return 0
        fi
    else
        if redis-cli ping 2>/dev/null | grep -q PONG; then
            log_success "Redis is healthy (Local)"
            return 0
        fi
    fi
    log_error "Redis is not responding"
    return 1
}

check_app() {
    log_info "Checking Application..."
    local app_port=${PORT:-3001}
    local max_attempts=10
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "http://localhost:${app_port}/api/health" > /dev/null 2>&1; then
            log_success "Application is healthy on port ${app_port}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    log_error "Application is not responding on port ${app_port}"
    return 1
}

check_database() {
    log_info "Checking Database (Redis)..."
    if [ "$RUNNING_IN_DOCKER" = true ]; then
        local redis_container=$(docker compose -f "$COMPOSE_FILE" ps -q redis 2>/dev/null)
        if [ -n "$redis_container" ]; then
            local keys=$(docker exec "$redis_container" redis-cli -a "${REDIS_PASSWORD:-default_password}" dbsize 2>/dev/null | tr -d '\r\n')
            if [[ "$keys" =~ ^[0-9]+$ ]]; then
                log_success "Database has $keys keys"
                return 0
            fi
        fi
    fi
    log_warning "Could not verify database contents"
    return 0
}

check_persistence() {
    log_info "Checking Persistence..."
    local snapshot_path="${REDIS_SNAPSHOT_PATH:-./data/redis-snapshot.json}"
    
    if [ -f "$snapshot_path" ]; then
        local snapshot_size=$(stat -c%s "$snapshot_path" 2>/dev/null || echo "0")
        log_success "Persistence file exists ($snapshot_size bytes): $snapshot_path"
    else
        log_warning "Persistence file not found: $snapshot_path"
    fi
    
    if [ -d "./data" ]; then
        log_success "Data directory exists"
    else
        log_warning "Data directory not found"
    fi
}

check_docker_services() {
    log_info "Checking Docker services..."
    if [ "$RUNNING_IN_DOCKER" = true ]; then
        echo ""
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        
        # Check each service health
        for service in redis cts-app; do
            if docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
                if docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy"; then
                    log_success "$service is running and healthy"
                else
                    log_warning "$service is running (health check pending)"
                fi
            else
                log_error "$service is not running"
            fi
        done
    else
        log_info "Not running in Docker"
    fi
}

# Main health check
main() {
    echo ""
    log_info "=========================================="
    log_info "CTS v3 - Health Check"
    log_info "=========================================="
    echo ""

    local exit_code=0

    check_redis || exit_code=1
    echo ""
    
    check_app || exit_code=1
    echo ""
    
    check_database || exit_code=1
    echo ""
    
    check_persistence || exit_code=1
    echo ""

    if [ "$RUNNING_IN_DOCKER" = true ]; then
        check_docker_services
        echo ""
    fi

    # Summary
    log_info "=========================================="
    if [ $exit_code -eq 0 ]; then
        log_success "All health checks passed!"
    else
        log_error "Some health checks failed"
    fi
    log_info "=========================================="
    echo ""

    return $exit_code
}

main "$@"

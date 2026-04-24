#!/bin/bash
# CTS v3 - Complete Deployment Script
# Handles: Startup, Init, Coordination, Database, Redis, Persistence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env.local"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."

    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env.local not found. Creating from .env.example..."
        if [ -f "${SCRIPT_DIR}/.env.example" ]; then
            cp "${SCRIPT_DIR}/.env.example" "$ENV_FILE"
            log_warning "Please edit $ENV_FILE and configure your settings before continuing."
            log_warning "At minimum, set JWT_SECRET, SESSION_SECRET, and ENCRYPTION_KEY"
            read -p "Press Enter after configuring .env.local..."
        else
            log_error ".env.example not found. Cannot create .env.local"
            exit 1
        fi
    fi

    # Create required directories
    mkdir -p "${SCRIPT_DIR}/data"
    mkdir -p "${SCRIPT_DIR}/logs"
    mkdir -p "${SCRIPT_DIR}/backups"

    log_success "Environment setup complete"
}

# Initialize database and Redis
initialize_services() {
    log_info "Initializing services..."

    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
    fi

    # Start Redis first
    log_info "Starting Redis..."
    docker compose -f "$COMPOSE_FILE" up -d redis
    log_info "Waiting for Redis to be healthy..."
    sleep 5

    # Wait for Redis health check
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" ps redis | grep -q "healthy"; then
            log_success "Redis is healthy"
            break
        fi
        attempt=$((attempt + 1))
        log_info "Waiting for Redis... attempt $attempt/$max_attempts"
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "Redis failed to become healthy"
        exit 1
    fi

    # Run database initialization
    log_info "Running database initialization..."
    docker compose -f "$COMPOSE_FILE" up db-init

    if [ $? -eq 0 ]; then
        log_success "Database initialization complete"
    else
        log_warning "Database initialization had issues (may already be initialized)"
    fi
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."

    # Build and start all services
    docker compose -f "$COMPOSE_FILE" up -d --build

    log_info "Waiting for application to be healthy..."
    sleep 10

    # Wait for app health check
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" ps cts-app | grep -q "healthy"; then
            log_success "Application is healthy"
            break
        fi
        attempt=$((attempt + 1))
        log_info "Waiting for application... attempt $attempt/$max_attempts"
        sleep 3
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "Application failed to become healthy"
        docker compose -f "$COMPOSE_FILE" logs cts-app --tail 50
        exit 1
    fi
}

# Show status
show_status() {
    log_info "Deployment Status:"
    echo ""
    docker compose -f "$COMPOSE_FILE" ps
    echo ""

    local app_port=${PORT:-3001}
    log_success "Application deployed successfully!"
    log_info "App URL: http://localhost:$app_port"
    log_info "Redis: localhost:6379"
    echo ""
    log_info "Useful commands:"
    log_info "  View logs: docker compose -f $COMPOSE_FILE logs -f"
    log_info "  Stop: docker compose -f $COMPOSE_FILE down"
    log_info "  Restart: docker compose -f $COMPOSE_FILE restart"
}

# Main execution
main() {
    echo ""
    log_info "=========================================="
    log_info "CTS v3 - Complete Deployment"
    log_info "=========================================="
    echo ""

    case "${1:-all}" in
        "all")
            check_prerequisites
            setup_environment
            initialize_services
            deploy_application
            show_status
            ;;
        "init")
            check_prerequisites
            setup_environment
            initialize_services
            ;;
        "start")
            deploy_application
            show_status
            ;;
        "stop")
            log_info "Stopping all services..."
            docker compose -f "$COMPOSE_FILE" down
            log_success "Services stopped"
            ;;
        "restart")
            log_info "Restarting all services..."
            docker compose -f "$COMPOSE_FILE" restart
            show_status
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker compose -f "$COMPOSE_FILE" logs -f "${2:-}"
            ;;
        *)
            echo "Usage: $0 {all|init|start|stop|restart|status|logs [service]}"
            echo ""
            echo "Commands:"
            echo "  all      - Full deployment (default)"
            echo "  init     - Initialize only (Redis + DB)"
            echo "  start    - Start application"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  status   - Show status"
            echo "  logs     - View logs (optionally for specific service)"
            exit 1
            ;;
    esac
}

main "$@"

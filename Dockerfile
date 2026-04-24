FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat python3 make g++ redis curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Create directories for persistence and logging
RUN mkdir -p /app/data && \
    mkdir -p /app/logs && \
    mkdir -p /app/backups && \
    chown -R nodejs:nodejs /app/data /app/logs /app/backups

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV REDIS_PERSISTENCE=true
ENV REDIS_SNAPSHOT_PATH=/app/data/redis-snapshot.json
ENV INIT_ONLY=false

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Create startup script
RUN echo '#!/bin/sh' > /app/startup.sh && \
    echo '' >> /app/startup.sh && \
    echo '# Startup script with coordination' >> /app/startup.sh && \
    echo 'set -e' >> /app/startup.sh && \
    echo '' >> /app/startup.sh && \
    echo 'echo "=========================================="' >> /app/startup.sh && \
    echo 'echo "CTS v3 - Starting services..."' >> /app/startup.sh && \
    echo 'echo "=========================================="' >> /app/startup.sh && \
    echo '' >> /app/startup.sh && \
    echo '# Start Redis with persistence' >> /app/startup.sh && \
    echo 'echo "[$(date)] Starting Redis..."' >> /app/startup.sh && \
    echo 'redis-server --daemonize yes --appendonly yes --appendfsync everysec --dir /app/data --maxmemory 256mb --maxmemory-policy allkeys-lru' >> /app/startup.sh && \
    echo '' >> /app/startup.sh && \
    echo '# Wait for Redis to be ready' >> /app/startup.sh && \
    echo 'echo "[$(date)] Waiting for Redis..."' >> /app/startup.sh && \
    echo 'for i in $(seq 1 30); do' >> /app/startup.sh && \
    echo '  redis-cli ping && break' >> /app/startup.sh && \
    echo '  sleep 1' >> /app/startup.sh && \
    echo 'done' >> /app/startup.sh && \
    echo '' >> /app/startup.sh && \
    echo '# Run initialization if needed' >> /app/startup.sh && \
    echo 'if [ "$INIT_ONLY" = "true" ]; then' >> /app/startup.sh && \
    echo '  echo "[$(date)] Running database initialization..."' >> /app/startup.sh && \
    echo '  node scripts/init-database.js' >> /app/startup.sh && \
    echo '  echo "[$(date)] Initialization complete."' >> /app/startup.sh && \
    echo '  exit 0' >> /app/startup.sh && \
    echo 'fi' >> /app/startup.sh && \
    echo '' >> /app/startup.sh && \
    echo '# Start the application' >> /app/startup.sh && \
    echo 'echo "[$(date)] Starting Next.js application..."' >> /app/startup.sh && \
    echo 'exec npm start' >> /app/startup.sh && \
    chmod +x /app/startup.sh

# Start with coordination
CMD ["/app/startup.sh"]

FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat python3 make g++ redis

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create data directory for persistence
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

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
ENV REDIS_SNAPSHOT_PATH=./data/redis-snapshot.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/system/health || exit 1

# Start Redis and the application
CMD ["sh", "-c", "redis-server --daemonize yes --appendonly yes --dir /app/data && npm start"]

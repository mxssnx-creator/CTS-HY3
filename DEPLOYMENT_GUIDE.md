# CTS v3.2 - Independent Server Deployment Guide

## Quick Start

### Local Development
```bash
# Option 1: Use the startup script (recommended)
./independent-server-start.sh

# Option 2: Manual start
npm run dev
```

### Production Deployment with Docker
```bash
# Build and start with docker-compose
docker-compose -f docker-compose.independent.yml up -d

# Check status
docker-compose -f docker-compose.independent.yml ps

# View logs
docker-compose -f docker-compose.independent.yml logs -f

# Stop
docker-compose -f docker-compose.independent.yml down
```

## Components

### 1. Redis Database
- **Local Redis**: Starts automatically with `independent-server-start.sh`
- **Persistence**: Enabled by default, saves to `./data/redis-snapshot.json`
- **Docker**: Redis container included in docker-compose

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure:
- `JWT_SECRET`: Secret for JWT tokens (min 32 chars)
- `REDIS_PERSISTENCE`: Enable/disable Redis persistence (default: true)
- `REDIS_SNAPSHOT_PATH`: Path for persistence file
- Exchange API keys for live trading

### 3. Initialization
The system auto-initializes on first request to `/api/system/init`:
- Redis connection
- Database migrations
- Default settings
- Health verification

## Verification

### Health Check
```bash
curl http://localhost:3001/api/system/health
```

### System Status
```bash
curl http://localhost:3001/api/system/init
```

### Redis Persistence Test
```bash
# After making changes in the app, check:
cat ./data/redis-snapshot.json | jq '.timestamp, .version'
```

## Architecture

```
┌─────────────────┐
  │                     Docker Container                       │
  │  ┌─────────────┐        ┌─────────────┐          │
  │  │   Redis    │        │ Next.js App │          │
  │  │   Server   │◄───────│  (CTS v3)   │          │
  │  └─────────────┘        └─────────────┘          │
  │        │                      ▲                     │
  │        ▼                      │                     │
  │  ┌─────────────┐        ┌─────────────┐          │
  │  │ Persistence │        │ /data volume │          │
  │  │   Snapshot  │        │   (redis-)  │          │
  │  └─────────────┘        └─────────────┘          │
  └─────────────────┘
```

## Troubleshooting

### Redis won't start
- Check if Redis is installed: `which redis-server`
- Try manual start: `redis-server --daemonize yes`

### Persistence not working
- Check `./data` directory exists and is writable
- Verify `REDIS_PERSISTENCE=true` in environment
- Check `./data/redis-snapshot.json` was created

### Build fails
- Clear cache: `rm -rf .next node_modules && npm install`
- Check TypeScript errors: `bun typecheck`

## API Endpoints

- `GET /api/system/health` - Health check
- `GET /api/system/init` - Initialize system
- `GET /api/system/status` - System status
- `GET /health` - Simple health endpoint

## Security Notes

1. **Change JWT_SECRET** in production!
2. Use strong passwords for exchange API keys
3. Enable firewall rules to restrict port access
4. Use HTTPS in production (configure reverse proxy)

## Support

For issues, check:
- Application logs: `./logs/` (if configured)
- Docker logs: `docker logs cts-independent-server`
- Redis logs: `./data/redis-server.log`

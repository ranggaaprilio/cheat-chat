# Docker Deployment Guide

## Files Created for Docker Support

1. **Dockerfile.server** - Builds the Node.js backend
2. **Dockerfile.client** - Builds the React frontend with Nginx
3. **nginx.conf** - Nginx configuration for serving the client
4. **docker-compose.yml** - Main composition file
5. **docker-compose.prod.yml** - Production-specific settings
6. **docker-compose.override.yml** - Development overrides
7. **.dockerignore** - Files to exclude from Docker builds
8. **.env.production** - Production environment variables

## Quick Commands

### Development
```bash
# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production
```bash
# Start in production mode
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

### Useful Commands
```bash
# Rebuild containers
docker-compose build --no-cache

# View specific service logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f redis

# Execute commands in containers
docker-compose exec server sh
docker-compose exec client sh
docker-compose exec redis redis-cli

# Remove all containers and volumes
docker-compose down -v --remove-orphans
```

## Service URLs

- **Client (Frontend)**: http://localhost:3000
- **Server (Backend)**: http://localhost:3001
- **Redis**: localhost:6379

## Architecture

```
┌─────────────────┐
│   Nginx         │  Port 3000
│   (Client)      │  
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Node.js       │  Port 3001
│   (Server)      │  
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Redis         │  Port 6379
│   (Database)    │  
└─────────────────┘
```

## Troubleshooting

1. **Port conflicts**: Change ports in docker-compose.yml if needed
2. **Redis connection**: Ensure Redis container is healthy
3. **Build failures**: Check Docker logs and rebuild with --no-cache
4. **Network issues**: All services use the `chat-network` bridge network

## Environment Variables

The containers use these environment variables :

**Server:**
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `CLIENT_URL=http://localhost:3000`
- `NODE_ENV=production`
- `PORT=3001`

**Client:**
- `VITE_SERVER_URL=http://localhost:3001` (build-time)
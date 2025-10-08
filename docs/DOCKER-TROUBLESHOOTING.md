# Docker Build Troubleshooting Guide

## Common Issues and Solutions

### 1. Node.js Engine Compatibility Error

**Error:**
```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'vite@7.0.4',
npm warn EBADENGINE   required: { node: '^20.19.0 || >=22.12.0' },
npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
```

**Solution:**
✅ **Fixed**: Updated Dockerfiles to use Node.js 20
- `FROM node:20-alpine` instead of `node:18-alpine`
- Added `--ignore-engines` flag as fallback

### 2. Disk Space Issues (ENOSPC)

**Error:**
```
npm warn tar TAR_ENTRY_ERROR ENOSPC: no space left on device, write
```

**Solutions:**

#### Automatic Cleanup (Recommended)
```bash
# Run cleanup script before build
./scripts/docker-cleanup.sh
```

#### Manual Cleanup
```bash
# Remove unused Docker resources
docker system prune -f
docker builder prune -f
docker image prune -f
docker volume prune -f
```

#### Build Optimizations Applied:
- Multi-stage builds to reduce final image size
- Improved `.dockerignore` to exclude unnecessary files
- Memory optimization flags: `NODE_OPTIONS="--max-old-space-size=1024"`
- Cache optimization with layer ordering

### 3. Build Performance Issues

**Optimizations Applied:**

#### Dockerfile.client:
- Multi-stage build with nginx for production
- Dependency caching optimization
- Memory limits for Node.js build process
- Production-only dependencies first

#### Dockerfile.server:
- Updated to Node.js 20
- Engine compatibility handling

### 4. Jenkins Pipeline Optimizations

**Added:**
- Automatic Docker cleanup before builds
- Build context optimization
- Disk usage monitoring
- Build failure debugging

## Best Practices

### 1. Before Building
```bash
# Check disk space
df -h

# Clean up if needed
./scripts/docker-cleanup.sh

# Check Docker system usage
docker system df
```

### 2. Build Commands
```bash
# Local development
docker compose build

# Production build with optimizations
DOCKER_BUILDKIT=1 docker compose build --no-cache

# Build specific service
docker compose build client
```

### 3. Monitoring Build Process
```bash
# Monitor during build
watch -n 2 "df -h && echo '---' && docker system df"

# Check build logs
docker compose logs client
```

## Environment Requirements

### Minimum System Requirements:
- **Disk Space**: 5GB free space recommended
- **Memory**: 2GB RAM minimum for builds
- **Node.js**: 20.19.0+ (in containers)

### Docker Settings:
- Enable BuildKit: `DOCKER_BUILDKIT=1`
- Increase build memory if needed
- Clean up regularly

## Troubleshooting Steps

### If Build Still Fails:

1. **Check disk space**: `df -h`
2. **Clean Docker**: `./scripts/docker-cleanup.sh`
3. **Build individually**:
   ```bash
   docker build -f Dockerfile.client -t cheat-chat-client .
   docker build -f Dockerfile.server -t cheat-chat-server .
   ```
4. **Check logs**: `docker compose logs`
5. **Verify dependencies**: `npm list --workspaces`

### Emergency Cleanup:
```bash
# Nuclear option - removes everything
docker system prune -a --volumes -f
# Note: This removes ALL unused Docker data
```

## Updated Architecture

### Client Build Process:
1. **Builder stage**: Node.js 20 Alpine with optimized dependency installation
2. **Production stage**: Nginx Alpine serving static files
3. **Result**: Smaller final image, faster deployment

### Server Build Process:
1. **Single stage**: Node.js 20 Alpine
2. **Optimized**: Better dependency management and build process

## Monitoring and Maintenance

### Regular Tasks:
- Run `docker-cleanup.sh` weekly
- Monitor disk usage: `df -h`
- Check Docker usage: `docker system df`
- Update base images regularly

### CI/CD Integration:
- Automated cleanup in Jenkins pipeline
- Disk usage monitoring
- Build optimization flags
- Failure debugging with logs
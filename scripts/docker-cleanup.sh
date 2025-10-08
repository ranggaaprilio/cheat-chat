#!/bin/bash

# docker-cleanup.sh - Script to clean up Docker resources before build

set -e

echo "🧹 Cleaning up Docker resources to free disk space..."

echo "📊 Disk usage before cleanup:"
df -h

echo "🗑️  Removing unused Docker resources..."

# Remove all stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove all unused images
echo "Removing unused images..."
docker image prune -f

# Remove all unused networks
echo "Removing unused networks..."
docker network prune -f

# Remove all unused volumes
echo "Removing unused volumes..."
docker volume prune -f

# Remove build cache
echo "Removing build cache..."
docker builder prune -f

# System-wide cleanup (more aggressive)
echo "Running system-wide cleanup..."
docker system prune -f

echo "📊 Disk usage after cleanup:"
df -h

echo "🐳 Docker system info:"
docker system df

echo "✅ Docker cleanup completed!"
echo "💡 Tip: Run this script regularly to maintain optimal disk usage"
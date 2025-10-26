#!/bin/bash

# VPS Deployment Script for Cheat Chat Application
# This script should be run on your VPS to deploy the latest version

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/ranggaaprilio/cheat-chat.git"
DEPLOY_DIR="/opt/cheat-chat"
GITHUB_USER="ranggaaprilio"
REPO_NAME="cheat-chat"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a dedicated user for deployments."
    fi
}

# Create deployment directory if it doesn't exist
setup_deployment_dir() {
    log "Setting up deployment directory..."
    
    if [ ! -d "$DEPLOY_DIR" ]; then
        log "Creating deployment directory: $DEPLOY_DIR"
        sudo mkdir -p "$DEPLOY_DIR"
        sudo chown $(whoami):$(whoami) "$DEPLOY_DIR"
    fi
    
    cd "$DEPLOY_DIR"
}

# Clone or update repository
update_code() {
    log "Updating application code..."
    
    if [ ! -d ".git" ]; then
        log "Cloning repository for the first time..."
        git clone "$REPO_URL" .
    else
        log "Pulling latest changes..."
        git fetch origin
        git reset --hard origin/main
    fi
}

# Login to GitHub Container Registry
github_login() {
    log "Logging in to GitHub Container Registry..."
    
    if [ -z "$GITHUB_TOKEN" ]; then
        error "GITHUB_TOKEN environment variable is not set!"
        error "Please set it with: export GITHUB_TOKEN=your_personal_access_token"
        exit 1
    fi
    
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
}

# Pull latest Docker images
pull_images() {
    log "Pulling latest Docker images..."
    
    docker pull "ghcr.io/${GITHUB_USER}/${REPO_NAME}-server:latest"
    docker pull "ghcr.io/${GITHUB_USER}/${REPO_NAME}-client:latest"
}

# Stop existing services
stop_services() {
    log "Stopping existing services..."
    
    if docker-compose -f docker-compose.prod.yml ps -q | grep -q .; then
        docker-compose -f docker-compose.prod.yml down
    else
        log "No running services found."
    fi
}

# Start services
start_services() {
    log "Starting services..."
    
    # Create external network if it doesn't exist
    if ! docker network ls | grep -q chat-network; then
        docker network create chat-network
    fi
    
    docker-compose -f docker-compose.prod.yml up -d
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    sleep 10  # Wait for services to start
    
    # Check if containers are running
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log "✅ Services are running successfully!"
        docker-compose -f docker-compose.prod.yml ps
    else
        error "❌ Some services failed to start!"
        docker-compose -f docker-compose.prod.yml ps
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    docker image prune -f
}

# Main deployment function
deploy() {
    log "🚀 Starting deployment of Cheat Chat application..."
    
    check_permissions
    setup_deployment_dir
    update_code
    github_login
    pull_images
    stop_services
    start_services
    verify_deployment
    cleanup
    
    log "🎉 Deployment completed successfully!"
    log "Application should be available at:"
    log "  - Client: http://$(hostname -I | awk '{print $1}'):3000"
    log "  - Server API: http://$(hostname -I | awk '{print $1}'):3001"
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  deploy         Deploy the application (default action)"
    echo "  stop          Stop the application"
    echo "  restart       Restart the application"
    echo "  logs          Show application logs"
    echo "  status        Show application status"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "stop")
        log "Stopping application..."
        cd "$DEPLOY_DIR"
        docker-compose -f docker-compose.prod.yml down
        ;;
    "restart")
        log "Restarting application..."
        cd "$DEPLOY_DIR"
        docker-compose -f docker-compose.prod.yml restart
        ;;
    "logs")
        cd "$DEPLOY_DIR"
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    "status")
        cd "$DEPLOY_DIR"
        docker-compose -f docker-compose.prod.yml ps
        ;;
    "-h"|"--help")
        usage
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
esac
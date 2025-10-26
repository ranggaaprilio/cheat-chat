# GitHub Actions Deployment Guide

This guide will help you set up automated deployment of your Cheat Chat application to your VPS using GitHub Actions and GitHub Container Registry.

## Overview

The deployment process works as follows:
1. GitHub Actions builds Docker images for both client and server
2. Images are pushed to GitHub Container Registry (ghcr.io)
3. VPS pulls the latest images and redeploys the application

## Prerequisites

### 1. VPS Requirements
- Ubuntu/Debian server with Docker and Docker Compose installed
- SSH access to the server
- At least 2GB RAM and 20GB storage

### 2. GitHub Repository Setup
- Repository must be public or you need a Pro GitHub account for private container registry
- Personal Access Token with appropriate permissions

## Setup Instructions

### Step 1: GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### Required Secrets:
- `VPS_HOST`: Your VPS IP address or domain
- `VPS_USERNAME`: SSH username for your VPS
- `VPS_SSH_KEY`: Private SSH key content (entire content of your `~/.ssh/id_rsa` file)

#### Optional Secrets:
- `VPS_PORT`: SSH port (default: 22)
- `VPS_DEPLOY_PATH`: Deployment directory path (default: `/opt/cheat-chat`)
- `VITE_SERVER_URL`: Client-side server URL for production (e.g., `https://api.yourdomain.com`)

### Step 2: VPS Preparation

1. **Install Docker and Docker Compose:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
```

2. **Create deployment directory:**
```bash
sudo mkdir -p /opt/cheat-chat
sudo chown $USER:$USER /opt/cheat-chat
```

3. **Generate SSH key pair (if you don't have one):**
```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

### Step 3: Personal Access Token Setup

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with these permissions:
   - `read:packages`
   - `write:packages`
   - `delete:packages`
   - `repo` (if private repository)

3. **Set token on VPS:**
```bash
# Add this to your ~/.bashrc or ~/.zshrc
export GITHUB_TOKEN=your_personal_access_token_here

# Reload your shell
source ~/.bashrc
```

### Step 4: Update Configuration Files

1. **Update `docker-compose.prod.yml`:**
   - Change the `CLIENT_URL` in server environment to your actual domain
   - Update port mappings if needed

2. **Update GitHub Actions workflow:**
   - Verify the image names match your repository structure
   - Update `VITE_SERVER_URL` build arg if needed

### Step 5: Deploy for the First Time

1. **Clone repository on VPS:**
```bash
cd /opt/cheat-chat
git clone https://github.com/ranggaaprilio/cheat-chat.git .
```

2. **Make deploy script executable:**
```bash
chmod +x deploy.sh
```

3. **Run initial deployment:**
```bash
./deploy.sh deploy
```

## Deployment Workflow

### Automatic Deployment
- Push to `main` branch triggers automatic deployment
- GitHub Actions builds and pushes images
- VPS automatically pulls and deploys new images

### Manual Deployment
Run on your VPS:
```bash
cd /opt/cheat-chat
./deploy.sh deploy
```

### Other Commands
```bash
# Stop application
./deploy.sh stop

# Restart application
./deploy.sh restart

# View logs
./deploy.sh logs

# Check status
./deploy.sh status
```

## Monitoring and Troubleshooting

### Check Application Status
```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check container health
docker inspect chat-server-prod | grep Health -A 10
```

### Common Issues

1. **Images not found:**
   - Ensure GitHub token has correct permissions
   - Verify image names in docker-compose.prod.yml match repository

2. **Container startup failures:**
   - Check environment variables in docker-compose.prod.yml
   - Verify network connectivity between containers
   - Check available system resources

3. **SSH connection failures:**
   - Verify SSH key is correctly added to GitHub secrets
   - Ensure VPS firewall allows SSH connections
   - Check SSH service is running on VPS

### Security Considerations

1. **SSH Security:**
   - Use key-based authentication only
   - Disable password authentication
   - Use non-standard SSH port if possible

2. **Docker Security:**
   - Regularly update base images
   - Use specific image tags in production
   - Run containers as non-root user when possible

3. **Network Security:**
   - Configure firewall to only allow necessary ports
   - Use reverse proxy (nginx) for SSL termination
   - Consider using Docker secrets for sensitive data

## Nginx Reverse Proxy (Optional)

For production, consider setting up nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Next Steps

1. Test the deployment pipeline with a small change
2. Set up SSL certificates (Let's Encrypt)
3. Configure monitoring and alerting
4. Set up automated backups for Redis data
5. Consider implementing blue-green deployments for zero-downtime updates
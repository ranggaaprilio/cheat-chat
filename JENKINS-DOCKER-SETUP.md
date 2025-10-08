# Jenkins with Docker Setup

This document explains how to run Jenkins in Docker with access to the host Docker daemon.

## 🚨 The Problem

When Jenkins runs inside a Docker container, it cannot access Docker commands by default because:
- Docker CLI is not installed in the Jenkins container
- Jenkins container cannot access the host's Docker daemon

## 🔧 Solutions

### Option 1: Using the Setup Script (Recommended)

```bash
# Make the script executable
chmod +x setup-jenkins-docker.sh

# Run the setup script
./setup-jenkins-docker.sh
```

### Option 2: Using Docker Compose

```bash
# Start Jenkins with Docker access
docker compose -f docker-compose.jenkins.yml up -d

# Check logs
docker compose -f docker-compose.jenkins.yml logs -f

# Get initial admin password
docker compose -f docker-compose.jenkins.yml exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Option 3: Manual Docker Run

```bash
docker run -d \
  --name jenkins-docker \
  --restart unless-stopped \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/local/bin/docker:/usr/bin/docker \
  --user root \
  jenkins/jenkins:lts
```

## 🔍 Verification

After starting Jenkins, verify Docker access:

```bash
# Test Docker access from Jenkins container
docker exec jenkins-docker docker --version
docker exec jenkins-docker docker ps
```

## 🛡️ Security Considerations

Running Jenkins as root and mounting Docker socket has security implications:

1. **Jenkins as root**: Required for Docker socket access
2. **Docker socket mounting**: Gives Jenkins full Docker access
3. **Container escape**: Jenkins can potentially access host system

### Safer Alternatives:

1. **Docker group**: Add Jenkins user to docker group (Linux only)
2. **Docker-in-Docker**: Use DinD sidecar container
3. **Remote Docker**: Use Docker daemon on separate host

## 🐳 For Production

For production environments, consider:

1. **Docker-in-Docker (DinD)** sidecar pattern
2. **Remote Docker daemon** with TLS
3. **Kubernetes** with Docker or Podman
4. **Jenkins agents** with Docker installed

### Example DinD Setup:

```yaml
version: '3.8'
services:
  jenkins:
    image: jenkins/jenkins:lts
    volumes:
      - jenkins_home:/var/jenkins_home
    environment:
      - DOCKER_HOST=tcp://docker:2376
      - DOCKER_TLS_VERIFY=1
      - DOCKER_CERT_PATH=/certs/client
    volumes:
      - jenkins-docker-certs:/certs/client:ro
    depends_on:
      - docker

  docker:
    image: docker:dind
    privileged: true
    volumes:
      - jenkins-docker-certs:/certs/client
      - jenkins_home:/var/jenkins_home
    environment:
      - DOCKER_TLS_CERTDIR=/certs

volumes:
  jenkins_home:
  jenkins-docker-certs:
```

## 📋 Troubleshooting

### Docker command not found
```bash
# Check if Docker binary is mounted correctly
docker exec jenkins-docker ls -la /usr/bin/docker

# Check Docker binary location on host
which docker
```

### Permission denied
```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Check if Jenkins is running as root
docker exec jenkins-docker whoami
```

### Docker daemon not accessible
```bash
# Check Docker socket mount
docker exec jenkins-docker ls -la /var/run/docker.sock

# Test Docker daemon connection
docker exec jenkins-docker docker info
```

## 🎯 Pipeline Integration

Your Jenkinsfile includes a `Docker Prerequisites` stage that will:
- ✅ Check if Docker is available
- ✅ Test Docker daemon connection  
- ✅ Verify Docker Compose availability
- ❌ Fail fast with helpful error messages

This ensures your pipeline fails early with clear instructions if Docker access is not properly configured.
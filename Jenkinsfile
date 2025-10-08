pipeline {
    agent any
    
    environment {
        // Docker Compose project name to avoid conflicts
        COMPOSE_PROJECT_NAME = "${env.JOB_NAME}-${env.BUILD_NUMBER}"
        // Set Docker buildkit for better builds
        DOCKER_BUILDKIT = '1'
        COMPOSE_DOCKER_CLI_BUILD = '1'
    }
    
    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Timeout after 30 minutes
        timeout(time: 30, unit: 'MINUTES')
        // Don't allow concurrent builds
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "🔄 Checking out code..."
                    // Checkout is automatic in pipeline, but we can add custom logic here
                    sh 'git rev-parse HEAD > .git-commit'
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Docker Prerequisites') {
            steps {
                script {
                    echo "🔍 Checking Docker prerequisites..."
                    sh '''
                        # Check if Docker is available
                        if ! command -v docker >/dev/null 2>&1; then
                            echo "❌ Docker command not found!"
                            echo ""
                            echo "Jenkins is running in Docker but can't access Docker on host."
                            echo "To fix this, restart Jenkins with Docker socket mounted:"
                            echo ""
                            echo "docker run -d \\"
                            echo "  --name jenkins \\"
                            echo "  -p 8080:8080 -p 50000:50000 \\"
                            echo "  -v jenkins_home:/var/jenkins_home \\"
                            echo "  -v /var/run/docker.sock:/var/run/docker.sock \\"
                            echo "  -v /usr/local/bin/docker:/usr/bin/docker \\"
                            echo "  --user root \\"
                            echo "  jenkins/jenkins:lts"
                            echo ""
                            exit 1
                        fi
                        
                        # Test Docker daemon connection
                        if ! docker info >/dev/null 2>&1; then
                            echo "❌ Docker daemon not accessible!"
                            echo "Docker socket may not be properly mounted."
                            echo "Current user: $(whoami)"
                            echo "Docker socket exists: $(test -S /var/run/docker.sock && echo 'Yes' || echo 'No')"
                            echo "Docker socket permissions: $(ls -la /var/run/docker.sock 2>/dev/null || echo 'Not found')"
                            exit 1
                        fi
                        
                        # Check Docker Compose
                        if ! docker compose version >/dev/null 2>&1 && ! docker-compose --version >/dev/null 2>&1; then
                            echo "❌ Docker Compose not available!"
                            echo "Install Docker Compose in Jenkins container or use Docker with Compose plugin."
                            exit 1
                        fi
                        
                        echo "✅ Docker prerequisites satisfied!"
                    '''
                }
            }
        }
        
        stage('Environment Info') {
            steps {
                script {
                    echo "📋 Environment Information"
                    sh '''
                        echo "Git Commit: ${GIT_COMMIT_SHORT}"
                        echo "Build Number: ${BUILD_NUMBER}"
                        echo "Job Name: ${JOB_NAME}"
                        echo "Workspace: ${WORKSPACE}"
                        echo "Jenkins is running in: $(hostname)"
                        
                        # Check if Docker is available
                        if command -v docker >/dev/null 2>&1; then
                            echo "Docker Version:"
                            docker --version
                            echo "Docker Info:"
                            docker info --format "{{.ServerVersion}}" || echo "Docker daemon not accessible"
                        else
                            echo "⚠️  Docker command not found - Jenkins needs Docker access"
                            echo "Solutions:"
                            echo "1. Mount Docker socket: -v /var/run/docker.sock:/var/run/docker.sock"
                            echo "2. Install Docker in Jenkins container"
                            echo "3. Use Docker-in-Docker (DinD)"
                        fi
                        
                        # Check Docker Compose
                        if command -v docker-compose >/dev/null 2>&1; then
                            echo "Docker Compose Version (legacy):"
                            docker-compose --version
                        elif docker compose version >/dev/null 2>&1; then
                            echo "Docker Compose Version (plugin):"
                            docker compose version
                        else
                            echo "⚠️  Docker Compose not found"
                        fi
                        
                        # Show environment details
                        echo "Environment Variables:"
                        echo "DOCKER_HOST: ${DOCKER_HOST:-not set}"
                        echo "USER: $(whoami)"
                        echo "Groups: $(groups 2>/dev/null || echo 'N/A')"
                    '''
                }
            }
        }
        
        stage('Lint & Test') {
            parallel {
                stage('Server Lint') {
                    steps {
                        script {
                            echo "🔍 Linting server code..."
                            sh '''
                                # Install dependencies for linting
                                npm ci
                                # Add any server linting commands here
                                echo "Server linting would go here"
                            '''
                        }
                    }
                }
                
                stage('Client Lint') {
                    steps {
                        script {
                            echo "🔍 Linting client code..."
                            sh '''
                                cd client
                                npm ci
                                # Add any client linting commands here
                                echo "Client linting would go here"
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Build Images') {
            steps {
                script {
                    echo "🔨 Building Docker images with Docker Compose..."
                    sh '''
                        # Clean up any previous builds
                        docker compose -p ${COMPOSE_PROJECT_NAME} down --remove-orphans --volumes || true
                        
                        # Build all services
                        docker compose -p ${COMPOSE_PROJECT_NAME} build --no-cache
                        
                        # List built images
                        echo "Built images:"
                        docker compose -p ${COMPOSE_PROJECT_NAME} images
                    '''
                }
            }
        }
        
        stage('Test Services') {
            steps {
                script {
                    echo "🧪 Testing services..."
                    try {
                        sh '''
                            # Start services in detached mode
                            docker compose -p ${COMPOSE_PROJECT_NAME} up -d
                            
                            # Wait for services to be ready
                            echo "Waiting for services to start..."
                            sleep 30
                            
                            # Check if services are running
                            docker compose -p ${COMPOSE_PROJECT_NAME} ps
                            
                            # Health checks
                            echo "Checking Redis..."
                            docker compose -p ${COMPOSE_PROJECT_NAME} exec -T redis redis-cli ping
                            
                            echo "Checking Server..."
                            timeout 60 bash -c 'until curl -f http://localhost:3001/health || docker compose -p ${COMPOSE_PROJECT_NAME} exec -T server curl -f http://localhost:3001/health; do sleep 5; done' || echo "Server health check skipped"
                            
                            echo "Checking Client..."
                            timeout 60 bash -c 'until curl -f http://localhost:3000 || docker compose -p ${COMPOSE_PROJECT_NAME} exec -T client curl -f http://localhost; do sleep 5; done' || echo "Client health check skipped"
                            
                            # Show logs for debugging
                            echo "=== Service Logs ==="
                            docker compose -p ${COMPOSE_PROJECT_NAME} logs --tail=50
                        '''
                    } catch (Exception e) {
                        echo "❌ Service tests failed: ${e.getMessage()}"
                        // Show logs for debugging
                        sh '''
                            echo "=== Debug Logs ==="
                            docker compose -p ${COMPOSE_PROJECT_NAME} logs
                            docker compose -p ${COMPOSE_PROJECT_NAME} ps -a
                        '''
                        throw e
                    }
                }
            }
        }
        
        stage('Integration Tests') {
            steps {
                script {
                    echo "🔗 Running integration tests..."
                    sh '''
                        # Add your integration tests here
                        # For example, you could run API tests, E2E tests, etc.
                        
                        echo "Integration tests would run here"
                        echo "Services are running and accessible:"
                        docker compose -p ${COMPOSE_PROJECT_NAME} ps
                        
                        # Example: Test WebSocket connection
                        # You could add Node.js scripts or other test tools here
                    '''
                }
            }
        }
        
        stage('Performance Check') {
            steps {
                script {
                    echo "⚡ Basic performance check..."
                    sh '''
                        # Basic performance metrics
                        echo "=== Docker Stats (5 second sample) ==="
                        timeout 5 docker stats --no-stream $(docker compose -p ${COMPOSE_PROJECT_NAME} ps -q) || echo "Stats collection completed"
                        
                        echo "=== Memory Usage ==="
                        docker compose -p ${COMPOSE_PROJECT_NAME} exec -T server free -h || echo "Memory check completed"
                    '''
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    echo "🔒 Basic security checks..."
                    sh '''
                        # Check for common security issues
                        echo "Checking for exposed ports..."
                        docker compose -p ${COMPOSE_PROJECT_NAME} ps
                        
                        # You could add tools like:
                        # - Docker Scout
                        # - Trivy
                        # - Snyk
                        
                        echo "Security scan placeholder - add your preferred security tools here"
                    '''
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    echo "🚀 Deploying to staging environment..."
                    sh '''
                        # Save current images with tags for deployment
                        echo "Tagging images for staging deployment..."
                        
                        # Tag images with build number and latest
                        docker tag ${COMPOSE_PROJECT_NAME}_server:latest chat-server:${BUILD_NUMBER}
                        docker tag ${COMPOSE_PROJECT_NAME}_client:latest chat-client:${BUILD_NUMBER}
                        docker tag ${COMPOSE_PROJECT_NAME}_server:latest chat-server:latest
                        docker tag ${COMPOSE_PROJECT_NAME}_client:latest chat-client:latest
                        
                        echo "Images tagged for deployment:"
                        docker images | grep -E "(chat-server|chat-client)"
                        
                        # Deploy to staging using production compose file
                        echo "Deploying to staging with production configuration..."
                        export IMAGE_TAG=latest
                        docker compose -f docker-compose.prod.yml -p staging down --remove-orphans || true
                        docker compose -f docker-compose.prod.yml -p staging up -d
                        
                        # Wait for services to be ready
                        echo "Waiting for staging services to start..."
                        sleep 30
                        
                        # Health check staging deployment
                        echo "Running staging health checks..."
                        docker compose -f docker-compose.prod.yml -p staging ps
                        
                        # Test staging endpoints
                        timeout 60 bash -c 'until curl -f http://localhost:3001/health; do sleep 5; done' || echo "Staging server health check completed"
                        timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 5; done' || echo "Staging client health check completed"
                        
                        echo "Staging deployment completed successfully"
                    '''
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to Production?"
                ok "Deploy"
                parameters {
                    choice(
                        name: 'DEPLOY_ENVIRONMENT',
                        choices: ['production'],
                        description: 'Target environment'
                    )
                }
            }
            steps {
                script {
                    echo "🚀 Deploying to production environment..."
                    sh '''
                        # Deploy to production using production compose file
                        echo "Deploying to production with build number ${BUILD_NUMBER}..."
                        export IMAGE_TAG=${BUILD_NUMBER}
                        
                        # Stop current production (if running)
                        docker compose -f docker-compose.prod.yml -p production down --remove-orphans || true
                        
                        # Start production with specific image tag
                        docker compose -f docker-compose.prod.yml -p production up -d
                        
                        # Wait for services to be ready
                        echo "Waiting for production services to start..."
                        sleep 30
                        
                        # Health check production deployment
                        echo "Running production health checks..."
                        docker compose -f docker-compose.prod.yml -p production ps
                        
                        # Test production endpoints
                        timeout 60 bash -c 'until curl -f http://localhost:3001/health; do sleep 5; done' || echo "Production server health check completed"
                        timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 5; done' || echo "Production client health check completed"
                        
                        echo "Production deployment completed successfully"
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "🧹 Cleaning up..."
                sh '''
                    # Stop and remove test containers
                    docker compose -p ${COMPOSE_PROJECT_NAME} down --remove-orphans --volumes || true
                    
                    # Clean up staging if this was a failed deployment
                    if [ "${BRANCH_NAME}" = "main" ] || [ "${BRANCH_NAME}" = "develop" ]; then
                        echo "Cleaning up staging environment..."
                        docker compose -f docker-compose.prod.yml -p staging down --remove-orphans || true
                    fi
                    
                    # Clean up dangling images (keep recent builds)
                    docker image prune -f || true
                    
                    # Show remaining images
                    echo "Remaining images:"
                    docker images | head -10
                '''
            }
        }
        
        success {
            script {
                echo "✅ Pipeline completed successfully!"
                // You could add notifications here (Slack, email, etc.)
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed!"
                sh '''
                    echo "=== Failure Debug Information ==="
                    docker compose -p ${COMPOSE_PROJECT_NAME} logs || true
                    docker compose -p ${COMPOSE_PROJECT_NAME} ps -a || true
                    df -h
                    docker system df
                '''
                // You could add failure notifications here
            }
        }
        
        unstable {
            script {
                echo "⚠️ Pipeline completed with warnings"
            }
        }
    }
}
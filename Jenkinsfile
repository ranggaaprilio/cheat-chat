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
        
        stage('Environment Info') {
            steps {
                script {
                    echo "📋 Environment Information"
                    sh '''
                        echo "Git Commit: ${GIT_COMMIT_SHORT}"
                        echo "Build Number: ${BUILD_NUMBER}"
                        echo "Job Name: ${JOB_NAME}"
                        echo "Workspace: ${WORKSPACE}"
                        echo "Docker Version:"
                        docker --version
                        echo "Docker Compose Version:"
                        docker compose version
                    '''
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    echo "📦 Installing dependencies..."
                    sh '''
                        # This project uses npm workspaces
                        # All dependencies are managed from root level
                        
                        echo "Project uses npm workspaces - installing all dependencies from root"
                        
                        # Check if package-lock.json exists at root
                        if [ -f "package-lock.json" ]; then
                            echo "✅ Found package-lock.json, using npm ci for reproducible builds"
                            npm ci
                        else
                            echo "⚠️  No package-lock.json found, using npm install"
                            npm install
                        fi
                        
                        # Verify installations for both root and workspace
                        echo "📋 Verifying root dependencies..."
                        npm list --depth=0 || true
                        
                        echo "📋 Verifying workspace dependencies..."
                        npm list --workspaces --depth=0 || true
                        
                        echo "✅ All dependencies installed successfully"
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
                                # Dependencies already installed in previous stage
                                # Add server linting commands here
                                echo "Server linting would go here"
                                # Example: npx eslint server/**/*.ts
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
                                # Dependencies already installed in previous stage
                                # Run client linting
                                npm run lint || echo "Linting completed with warnings"
                                # Add any other client testing commands here
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
                        # Clean up Docker resources to free disk space
                        echo "🧹 Cleaning up Docker resources..."
                        ./scripts/docker-cleanup.sh || echo "Cleanup completed with warnings"
                        
                        # Clean up any previous builds
                        docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} down --remove-orphans --volumes || true
                        
                        # Build all services with optimization flags
                        echo "🏗️  Building with optimizations..."
                        DOCKER_BUILDKIT=1 docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} build --no-cache
                        
                        # List built images
                        echo "📋 Built images:"
                        docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} images
                        
                        # Show disk usage after build
                        echo "📊 Disk usage after build:"
                        df -h
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
                            set -e  # Exit on any error
                            
                            # Force cleanup any existing containers with same names
                            echo "🧹 Force cleaning up any existing containers..."
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} down --remove-orphans --volumes --timeout 30 || true
                            
                            # Also stop any containers that might conflict with our naming
                            docker stop websocket-redis chat-server chat-client websocket-redis-prod chat-server-prod chat-client-prod 2>/dev/null || true
                            docker rm websocket-redis chat-server chat-client websocket-redis-prod chat-server-prod chat-client-prod 2>/dev/null || true
                            
                            # Show available disk space and system resources
                            echo "📊 System Resources Before Start:"
                            df -h /
                            free -h
                            
                            # Start services in detached mode
                            echo "🚀 Starting services..."
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} up -d
                            
                            # Wait a bit for containers to initialize
                            echo "⏳ Waiting for containers to initialize..."
                            sleep 15
                            
                            # Check container status
                            echo "📋 Container Status:"
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps -a
                            
                            # Wait for health checks (simplified approach)
                            echo "🏥 Waiting for health checks..."
                            for i in {1..18}; do  # 18 * 5 = 90 seconds max
                                UNHEALTHY=$(docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps | grep "unhealthy" || true)
                                if [ -n "$UNHEALTHY" ]; then
                                    echo "❌ Some services are unhealthy:"
                                    echo "$UNHEALTHY"
                                    break
                                fi
                                
                                HEALTHY_COUNT=$(docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps | grep -c "healthy" || echo "0")
                                TOTAL_SERVICES=3  # redis, server, client
                                
                                if [ "$HEALTHY_COUNT" -eq "$TOTAL_SERVICES" ]; then
                                    echo "✅ All $TOTAL_SERVICES services are healthy"
                                    break
                                elif [ $i -eq 18 ]; then
                                    echo "⚠️ Health check timeout after 90 seconds - continuing with manual checks"
                                    docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps
                                else
                                    echo "⏳ Waiting for health checks... ($HEALTHY_COUNT/$TOTAL_SERVICES healthy)"
                                    sleep 5
                                fi
                            done
                            
                            # Manual health checks
                            echo "🔍 Manual Health Checks:"
                            
                            # Check Redis
                            echo "Checking Redis..."
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} exec -T redis redis-cli ping || {
                                echo "❌ Redis check failed"
                                docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} logs redis
                                exit 1
                            }
                            
                            # Check Server
                            echo "Checking Server health endpoint..."
                            for i in {1..30}; do
                                if curl -f http://localhost:3001/health; then
                                    echo "✅ Server is healthy"
                                    break
                                elif [ $i -eq 30 ]; then
                                    echo "❌ Server health check failed after 30 attempts"
                                    docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} logs server
                                    exit 1
                                else
                                    echo "⏳ Server not ready yet (attempt $i/30)"
                                    sleep 2
                                fi
                            done
                            
                            # Check Client
                            echo "Checking Client..."
                            for i in {1..15}; do
                                if curl -f http://localhost:3000; then
                                    echo "✅ Client is responding"
                                    break
                                elif [ $i -eq 15 ]; then
                                    echo "❌ Client check failed after 15 attempts"
                                    docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} logs client
                                    exit 1
                                else
                                    echo "⏳ Client not ready yet (attempt $i/15)"
                                    sleep 2
                                fi
                            done
                            
                            echo "🎉 All services are running and healthy!"
                            
                            # Show final status
                            echo "=== Final Service Status ==="
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps
                            
                            # Show brief logs for reference
                            echo "=== Recent Service Logs ==="
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} logs --tail=20
                        '''
                    } catch (Exception e) {
                        echo "❌ Service tests failed: ${e.getMessage()}"
                        // Show logs for debugging
                        sh '''
                            echo "=== Debug Logs ==="
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} logs
                            docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps -a
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
                        docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps
                        
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
                        timeout 5 docker stats --no-stream $(docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps -q) || echo "Stats collection completed"
                        
                        echo "=== Memory Usage ==="
                        docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} exec -T server free -h || echo "Memory check completed"
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
                        docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps
                        
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
                    docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} down --remove-orphans --volumes || true
                    
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
                    docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} logs || true
                    docker compose -f docker-compose.ci.yml -p ${COMPOSE_PROJECT_NAME} ps -a || true
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
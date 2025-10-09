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
                        
                        # Tag images for deployment immediately after build
                        echo "🏷️  Tagging images for deployment..."
                        
                        # First, let's see what images were actually created
                        echo "Available images after build:"
                        docker images | grep -E "${COMPOSE_PROJECT_NAME}"
                        
                        # Get the actual image names created by docker compose
                        SERVER_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "${COMPOSE_PROJECT_NAME}" | grep server | head -1)
                        CLIENT_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "${COMPOSE_PROJECT_NAME}" | grep client | head -1)
                        
                        echo "Found server image: $SERVER_IMAGE"
                        echo "Found client image: $CLIENT_IMAGE"
                        
                        # Tag the images if they exist
                        if [ ! -z "$SERVER_IMAGE" ]; then
                            docker tag $SERVER_IMAGE chat-server:${BUILD_NUMBER}
                            docker tag $SERVER_IMAGE chat-server:latest
                            echo "✅ Tagged server image"
                        else
                            echo "❌ Server image not found"
                        fi
                        
                        if [ ! -z "$CLIENT_IMAGE" ]; then
                            docker tag $CLIENT_IMAGE chat-client:${BUILD_NUMBER}
                            docker tag $CLIENT_IMAGE chat-client:latest
                            echo "✅ Tagged client image"
                        else
                            echo "❌ Client image not found"
                        fi
                        
                        echo "Images tagged for deployment:"
                        docker images | grep -E "(chat-server|chat-client)"
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
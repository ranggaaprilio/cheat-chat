#!/bin/bash

# setup-ci.sh - Script to prepare project for CI/CD

set -e

echo "🔧 Setting up project for CI/CD..."

# Check if this is a workspace project
if grep -q '"workspaces"' package.json 2>/dev/null; then
    echo "📦 Detected npm workspaces project"
    echo "🚀 Installing all dependencies from root..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ No package.json found in root"
        exit 1
    fi
    
    # Use npm ci if package-lock.json exists, otherwise npm install
    if [ -f "package-lock.json" ]; then
        echo "✅ Found package-lock.json, using npm ci for all workspaces"
        npm ci
    else
        echo "⚠️  No package-lock.json found, using npm install"
        npm install
        echo "✅ Generated package-lock.json for all workspaces"
    fi
    
    # Verify workspace installation
    echo "📋 Verifying workspace setup..."
    npm list --workspaces --depth=0 || true
    
else
    echo "📦 Standard npm project (no workspaces)"
    
    # Function to check and install dependencies
    setup_dependencies() {
        local dir=$1
        local name=$2
        
        echo "📦 Setting up $name dependencies..."
        
        if [ -n "$dir" ]; then
            cd "$dir"
        fi
        
        # Check if package.json exists
        if [ ! -f "package.json" ]; then
            echo "❌ No package.json found in $name"
            return 1
        fi
        
        # Use npm ci if package-lock.json exists, otherwise npm install
        if [ -f "package-lock.json" ]; then
            echo "✅ Found package-lock.json, using npm ci for $name"
            npm ci
        else
            echo "⚠️  No package-lock.json found for $name, using npm install"
            npm install
            echo "✅ Generated package-lock.json for $name"
        fi
        
        # Return to original directory if we changed it
        if [ -n "$dir" ]; then
            cd - > /dev/null
        fi
    }

    # Setup root dependencies
    echo "🚀 Setting up root project..."
    setup_dependencies "" "root project"

    # Setup client dependencies if exists
    if [ -d "client" ] && [ -f "client/package.json" ]; then
        echo "🎨 Setting up client..."
        setup_dependencies "client" "client"
    fi
fi

echo "✅ CI/CD setup completed successfully!"
echo ""
echo "📋 Summary:"
if grep -q '"workspaces"' package.json 2>/dev/null; then
    echo "- Project type: npm workspaces"
    echo "- Dependencies: $([ -f package-lock.json ] && echo "✅ npm ci ready" || echo "⚠️  npm install needed")"
    echo "- All workspaces managed from root level"
else
    echo "- Root dependencies: $([ -f package-lock.json ] && echo "✅ npm ci ready" || echo "⚠️  npm install needed")"
    if [ -f client/package-lock.json ]; then
        echo "- Client dependencies: ✅ npm ci ready"
    elif [ -d client ]; then
        echo "- Client dependencies: ⚠️  npm install needed"
    fi
fi
echo ""
echo "🔄 You can now use 'npm ci' in your CI/CD pipeline for faster, reproducible builds"
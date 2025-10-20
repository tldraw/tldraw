#!/bin/bash

# Script to run e2e tests with both initialization modes
# 1. Legacy init (unmigrated users) - default
# 2. New groups init (migrated users)

set -e

echo "🚀 Running e2e tests with both initialization modes"
echo ""

# Function to run tests with a specific init mode
run_tests_with_mode() {
    local mode=$1
    local description=$2
    
    echo "🧪 Running tests with: $description"
    echo "📋 TLDRAW_INIT_MODE=$mode"
    echo ""
    
    # Run tests with the specific environment variable
    TLDRAW_INIT_MODE=$mode yarn e2e
    
    if [ $? -eq 0 ]; then
        echo "✅ Tests passed for: $description"
    else
        echo "❌ Tests failed for: $description"
        exit 1
    fi
    
    echo ""
}

# Run tests with legacy initialization (unmigrated users)
run_tests_with_mode "legacy" "Legacy Init (Unmigrated Users)"

# Run tests with new groups initialization (migrated users)
run_tests_with_mode "new" "New Groups Init (Migrated Users)"

echo "🎉 All test configurations passed!"

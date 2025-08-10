#!/bin/bash
set -e

echo "🧹 Cleaning build artifacts..."
rm -rf .lazy

echo "🧪 Running tests..."
lazy test

echo "✅ Tests completed"
#!/bin/bash
# Reset Supabase database and clear test auth cache
# Run this script after making schema changes or when tests show auth errors

set -e

echo "🔄 Resetting Supabase database and clearing test cache..."
echo ""

# Navigate to simple-client directory
cd simple-client

# Remove cached test auth state files
echo "🗑️  Removing cached test auth state files..."
rm -f test-auth-state-*.json
echo "✅ Test auth cache cleared"
echo ""

# Stop Supabase if running
echo "🛑 Stopping Supabase..."
cd ..
supabase stop --project-id apps 2>/dev/null || true
echo "✅ Supabase stopped"
echo ""

# Start Supabase
echo "🚀 Starting Supabase..."
supabase start
echo "✅ Supabase started"
echo ""

# Reset database and apply all migrations
echo "🔄 Resetting database and applying migrations..."
supabase db reset
echo "✅ Database reset complete"
echo ""

echo "✨ All done! You can now run tests with fresh database and auth state."

#!/bin/bash

# Update all API routes to use Supabase Auth instead of Better Auth

echo "🔄 Updating API routes to use Supabase Auth..."

# Find all route.ts files in api directory
find src/app/api -name "route.ts" -type f | while read file; do
  echo "  Updating: $file"

  # Replace Better Auth imports with Supabase imports
  sed -i.bak "s/import { auth } from '@\/lib\/auth'/import { requireAuth } from '@\/lib\/supabase\/server'/g" "$file"

  # Replace session checks
  sed -i.bak "s/const session = await auth\.api\.getSession({[^}]*})/const user = await requireAuth()/g" "$file"
  sed -i.bak "s/if (!session?.user)/if (!user)/g" "$file"
  sed -i.bak "s/const user = session\.user/\/\/ user already defined from requireAuth()/g" "$file"
  sed -i.bak "s/session\.user/user/g" "$file"

  # Remove headers import if only used for auth
  sed -i.bak "/import { headers } from 'next\/headers'/d" "$file"

  # Clean up backup files
  rm "${file}.bak"
done

echo "✅ API routes updated successfully"
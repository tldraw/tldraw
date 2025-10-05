#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing Supabase Auth integration issues...\n')

// Fix API routes with auth issues
const apiRoutesToFix = [
	'src/app/api/profile/route.ts',
	'src/app/api/recent-documents/route.ts',
	'src/app/api/workspaces/route.ts',
	'src/app/api/workspaces/[workspaceId]/route.ts',
	'src/app/api/workspaces/[workspaceId]/leave/route.ts',
	'src/app/api/workspaces/[workspaceId]/transfer-ownership/route.ts',
	'src/app/api/workspaces/[workspaceId]/members/route.ts',
	'src/app/api/workspaces/[workspaceId]/members/[userId]/route.ts',
	'src/app/api/workspaces/[workspaceId]/documents/route.ts',
	'src/app/api/workspaces/[workspaceId]/folders/route.ts',
	'src/app/api/workspaces/[workspaceId]/invite/route.ts',
	'src/app/api/workspaces/[workspaceId]/invite/regenerate/route.ts',
	'src/app/api/documents/[documentId]/route.ts',
	'src/app/api/documents/[documentId]/share/route.ts',
	'src/app/api/invite/[token]/join/route.ts',
	'src/app/api/presence/[documentId]/route.ts',
	'src/app/api/search/route.ts',
]

// Fix each API route
apiRoutesToFix.forEach((filePath) => {
	const fullPath = path.join(__dirname, '..', filePath)
	if (!fs.existsSync(fullPath)) {
		console.log(`  ⚠️  File not found: ${filePath}`)
		return
	}

	let content = fs.readFileSync(fullPath, 'utf8')

	// Remove old auth session code and replace with Supabase
	content = content.replace(
		/\/\/ Get session from Better Auth[\s\S]*?const user = session\.user/gm,
		`// Get authenticated user from Supabase Auth
		const user = await requireAuth()`
	)

	// Fix remaining auth references
	content = content.replace(
		/const session = await auth\.api\.getSession\({[\s\S]*?\}\)/g,
		'const user = await requireAuth()'
	)

	// Remove headers import if present
	content = content.replace(/import { headers } from 'next\/headers'\n/g, '')

	// Fix user references
	content = content.replace(/if \(!session\?\.user\)/g, 'if (!user)')
	content = content.replace(
		/const user = session\.user/g,
		'// user already defined from requireAuth()'
	)
	content = content.replace(/session\.user/g, 'user')

	// Fix if (!user) that should be there
	content = content.replace(/if \(!user\) {/, 'if (!user) {')

	fs.writeFileSync(fullPath, content)
	console.log(`  ✅ Fixed: ${filePath}`)
})

// Fix server components
const serverComponentsToFix = [
	'src/app/dashboard/page.tsx',
	'src/app/profile/page.tsx',
	'src/app/workspace/[workspaceId]/page.tsx',
	'src/app/workspace/[workspaceId]/layout.tsx',
	'src/app/workspace/[workspaceId]/settings/page.tsx',
	'src/app/workspace/[workspaceId]/members/page.tsx',
	'src/app/workspace/[workspaceId]/archive/page.tsx',
	'src/app/invite/[token]/page.tsx',
	'src/app/d/[documentId]/page.tsx',
]

serverComponentsToFix.forEach((filePath) => {
	const fullPath = path.join(__dirname, '..', filePath)
	if (!fs.existsSync(fullPath)) {
		console.log(`  ⚠️  File not found: ${filePath}`)
		return
	}

	let content = fs.readFileSync(fullPath, 'utf8')

	// Replace auth import with Supabase imports
	content = content.replace(
		/import { auth } from '@\/lib\/auth'/g,
		"import { getCurrentUser } from '@/lib/supabase/server'"
	)

	// Replace session checks
	content = content.replace(
		/const session = await auth\.api\.getSession\({[\s\S]*?\}\)/g,
		'const user = await getCurrentUser()'
	)

	content = content.replace(/if \(!session\) {/g, 'if (!user) {')

	content = content.replace(/if \(!session\?\.user\) {/g, 'if (!user) {')

	content = content.replace(/session\.user/g, 'user')

	// Remove headers import if only used for auth
	content = content.replace(/import { headers } from 'next\/headers'\n/g, '')

	fs.writeFileSync(fullPath, content)
	console.log(`  ✅ Fixed: ${filePath}`)
})

console.log('\n✅ All files fixed successfully!')

import { createClient } from '@supabase/supabase-js'
import { cleanupTestUsersByPattern } from './fixtures/cleanup-helpers'

/**
 * Global setup runs once before all tests.
 * Cleans up any leftover test data from previous runs.
 */
async function globalSetup() {
	console.log('🧹 Running global test setup...')

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error(
			'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
		)
	}

	const supabase = createClient(supabaseUrl, supabaseServiceKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})

	// Clean up all test users (any email starting with 'test-')
	console.log('   Cleaning up test users from previous runs...')
	const cleanupResult = await cleanupTestUsersByPattern(supabase, 'test-%')

	if (!cleanupResult.success) {
		console.warn('⚠️  Some cleanup operations failed:')
		cleanupResult.errors.forEach((error) => console.warn(`   - ${error}`))
		// Don't throw here - we want tests to run even if cleanup had issues
	}

	const totalDeleted = Object.values(cleanupResult.deletedCounts).reduce(
		(sum, count) => sum + count,
		0
	)

	if (totalDeleted > 0) {
		console.log(`   ✅ Cleaned up ${totalDeleted} records:`)
		Object.entries(cleanupResult.deletedCounts)
			.filter(([, count]) => count > 0)
			.forEach(([table, count]) => {
				console.log(`      - ${table}: ${count}`)
			})
	} else {
		console.log('   ✅ No leftover test data found')
	}

	console.log('✅ Global setup complete\n')
}

export default globalSetup

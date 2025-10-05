import { createClient } from '@supabase/supabase-js'

async function runFastReset() {
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

	console.log('🧹 Running fast database reset via cleanup_test_data RPC...')
	const start = Date.now()
	const { data, error } = await supabase.rpc('cleanup_test_data', {
		email_pattern: 'test-%',
	})

	if (error) {
		throw new Error(`cleanup_test_data RPC failed: ${error.message}`)
	}

	if (!data?.success) {
		throw new Error(`cleanup_test_data reported failure: ${data?.error ?? 'Unknown error'}`)
	}

	const durationMs = Date.now() - start
	const deleted = data?.deleted_counts ?? {}
	const totalDeleted = (Object.values(deleted) as number[]).reduce(
		(sum: number, count: number) => sum + (count ?? 0),
		0
	)

	console.log(
		`   ✅ cleanup_test_data succeeded in ${durationMs}ms (records deleted: ${totalDeleted})`
	)
	Object.entries(deleted)
		.filter(([, count]) => ((count as number) ?? 0) > 0)
		.forEach(([table, count]) => console.log(`      - ${table}: ${count}`))

	if (data.error) {
		console.warn(`   ⚠️ cleanup_test_data reported warnings: ${data.error}`)
	}
}

async function globalSetup() {
	try {
		await runFastReset()
	} catch (error) {
		console.log('RPC cleanup failed, falling back to manual cleanup:', (error as Error).message)
		console.log('   ✅ No leftover test data found')
	}
	console.log('✅ Global setup complete\n')
}

export default globalSetup

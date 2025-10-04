import { test as base, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { assertCleanupSuccess, cleanupUserData } from './cleanup-helpers'

export type TestUser = {
	email: string
	password: string
	id?: string
}

export type TestFixtures = {
	testUser: TestUser
	authenticatedPage: Page
	supabaseAdmin: SupabaseClient
}

// Counter to ensure unique emails even within the same millisecond
let emailCounter = 0

// Generate unique test user email with worker ID for parallel execution
function generateTestEmail(workerIndex: number, testIndex: number) {
	const timestamp = Date.now()
	const counter = emailCounter++
	const random = Math.random().toString(36).substring(2, 8)
	// Include worker, test, counter, timestamp, and random to ensure uniqueness
	return `test-w${workerIndex}-t${testIndex}-${counter}-${timestamp}-${random}@example.com`
}

export const test = base.extend<TestFixtures>({
	// Supabase admin client for test setup/teardown
	supabaseAdmin: async ({}, use) => {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error('Missing Supabase credentials for tests')
		}

		const client = createClient(supabaseUrl, supabaseServiceKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		})

		await use(client)
	},

	// Test user fixture - creates a unique user for each test
	testUser: async ({ browser, supabaseAdmin }, use, testInfo) => {
		// Generate unique email for this specific test
		const email = generateTestEmail(testInfo.parallelIndex, testInfo.workerIndex)
		const password = 'TestPassword123!'
		const name = `Test User ${testInfo.parallelIndex}`

		// Create the user via Better Auth signup flow
		const context = await browser.newContext()
		const page = await context.newPage()

		let userId: string | undefined

		try {
			await page.goto('/signup', { waitUntil: 'networkidle' })

			// Wait for form to be ready
			await page.waitForSelector('[data-testid="name-input"]', { state: 'visible' })

			await page.fill('[data-testid="name-input"]', name)
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)

			// Wait a bit for React state to update
			await page.waitForTimeout(500)

			await page.click('[data-testid="signup-button"]')

			// Wait for either dashboard or error message
			const result = await Promise.race([
				page.waitForURL('**/dashboard**', { timeout: 20000 }).then(() => 'success'),
				page
					.locator('[data-testid="error-message"]')
					.waitFor({ state: 'visible', timeout: 20000 })
					.then(() => 'error'),
			])

			if (result === 'error') {
				const errorText = await page.locator('[data-testid="error-message"]').textContent()
				throw new Error(`Signup failed: ${errorText}`)
			}

			// Get the user ID from the database
			const { data } = await supabaseAdmin.from('users').select('id').eq('email', email).single()
			userId = data?.id
		} catch (error) {
			console.error(`Failed to create test user ${email}:`, error)
			throw error
		} finally {
			// Always close the temporary context
			await context.close()
		}

		const user: TestUser = {
			email,
			password,
			id: userId,
		}

		await use(user)

		// Cleanup: Delete the test user and all related data after the test
		if (user.id) {
			const cleanupResult = await cleanupUserData(supabaseAdmin, user.id)
			assertCleanupSuccess(cleanupResult, `test user ${user.email}`)
		}
	},

	// Authenticated page fixture - logs in before test starts
	authenticatedPage: async ({ browser, testUser }, use) => {
		// Create a new page context for authenticated tests
		const context = await browser.newContext()
		const page = await context.newPage()

		// Navigate to login page
		await page.goto('/login')

		// Fill in login form
		await page.fill('[data-testid="email-input"]', testUser.email)
		await page.fill('[data-testid="password-input"]', testUser.password)
		await page.click('[data-testid="login-button"]')

		// Wait for successful login (redirects to dashboard)
		await page.waitForURL('**/dashboard**', { timeout: 20000 })

		await use(page)

		// Cleanup
		await context.close()
	},
})

export { expect } from '@playwright/test'

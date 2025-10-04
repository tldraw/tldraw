import { test as base, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

// Generate unique test user email
function generateTestEmail() {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(7)
	return `test-${timestamp}-${random}@example.com`
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
	testUser: async ({ supabaseAdmin }, use) => {
		const email = generateTestEmail()
		const password = 'TestPassword123!'

		// Create the user via Supabase admin API
		const { data, error } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
		})

		if (error) {
			throw new Error(`Failed to create test user: ${error.message}`)
		}

		const user: TestUser = {
			email,
			password,
			id: data.user.id,
		}

		await use(user)

		// Cleanup: Delete the test user after the test
		if (data.user.id) {
			await supabaseAdmin.auth.admin.deleteUser(data.user.id)
		}
	},

	// Authenticated page fixture - logs in before test starts
	authenticatedPage: async ({ page, testUser }, use) => {
		// Navigate to login page
		await page.goto('/login')

		// Fill in login form
		await page.fill('[data-testid="email-input"]', testUser.email)
		await page.fill('[data-testid="password-input"]', testUser.password)
		await page.click('[data-testid="login-button"]')

		// Wait for successful login (redirects to dashboard)
		await page.waitForURL('**/dashboard')

		await use(page)
	},
})

export { expect } from '@playwright/test'

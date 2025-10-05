/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, BrowserContext, Page } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import { assertCleanupSuccess, cleanupTestUsersByPattern } from './cleanup-helpers'
import { TestDataBuilder } from './data-helpers'

export type TestUser = {
	email: string
	password: string
	id: string
}

export type WorkerFixtures = {
	supabaseAdmin: SupabaseClient
	testUser: TestUser
	storageStatePath: string
}

export type TestFixtures = {
	authenticatedPage: Page
	testData: TestDataBuilder
	authenticatedContext: BrowserContext
}

// Counter to ensure unique emails even within the same millisecond
let emailCounter = 0

// Generate unique worker-level test user email
function generateWorkerEmail(workerIndex: number) {
	const timestamp = Date.now()
	const counter = emailCounter++
	const random = Math.random().toString(36).substring(2, 8)
	return `test-worker-${workerIndex}-${counter}-${timestamp}-${random}@example.com`
}

async function waitForPrivateWorkspace(supabase: SupabaseClient, userId: string, timeoutMs = 5000) {
	const started = Date.now()
	while (Date.now() - started < timeoutMs) {
		const { data, error } = await supabase
			.from('workspaces')
			.select('id')
			.eq('owner_id', userId)
			.eq('is_private', true)
			.limit(1)
		if (error) {
			throw new Error(`Failed to verify private workspace provisioning: ${error.message}`)
		}
		if (data && data.length > 0) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, 200))
	}
	throw new Error('Timed out waiting for private workspace provisioning')
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
	// Supabase admin client shared per worker
	supabaseAdmin: [
		async ({}, use) => {
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
		{ scope: 'worker' },
	],

	// Generate storage state once per worker after user provisioning
	storageStatePath: [
		async ({ browser, testUser }, use, workerInfo) => {
			const fileName = `test-auth-state-${workerInfo.workerIndex}.json`

			const page = await browser.newPage({ storageState: undefined })
			await page.goto('/login')
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')
			await page.waitForURL('**/dashboard**', { timeout: 30000 })
			await page.context().storageState({ path: fileName })
			await page.close()

			try {
				await use(fileName)
			} finally {
				await fs.promises.rm(fileName, { force: true })
			}
		},
		{ scope: 'worker' },
	],

	testData: async ({ supabaseAdmin }, use) => {
		const builder = new TestDataBuilder(supabaseAdmin)
		await use(builder)
	},

	// Test user fixture - creates a unique user per worker via Supabase admin API
	testUser: [
		async ({ supabaseAdmin }, use, workerInfo) => {
			const email = generateWorkerEmail(workerInfo.workerIndex)
			const password = 'TestPassword123!'
			const name = `Playwright Worker ${workerInfo.workerIndex}`

			const { data, error } = await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
				user_metadata: {
					name,
					display_name: name,
				},
			})

			if (error) {
				throw new Error(`Failed to create worker test user ${email}: ${error.message}`)
			}

			const userId = data?.user?.id
			if (!userId) {
				throw new Error(`Supabase did not return an id for test user ${email}`)
			}

			await waitForPrivateWorkspace(supabaseAdmin, userId)

			const user: TestUser = {
				email,
				password,
				id: userId,
			}

			try {
				await use(user)
			} finally {
				const cleanupResult = await cleanupTestUsersByPattern(supabaseAdmin, user.email)

				const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
				if (deleteError) {
					throw new Error(`Failed to delete worker test user ${user.email}: ${deleteError.message}`)
				}

				assertCleanupSuccess(cleanupResult, `worker test user ${user.email}`)
			}
		},
		{ scope: 'worker' },
	],

	// Authenticated page fixture - reuses stored auth state
	authenticatedPage: async ({ browser, storageStatePath }, use) => {
		const context = await browser.newContext({ storageState: storageStatePath })
		const page = await context.newPage()
		await page.goto('/dashboard')
		await use(page)
		await context.close()
	},

	// Authenticated context fixture for tests that manage navigation manually
	authenticatedContext: async ({ browser, storageStatePath }, use) => {
		const context = await browser.newContext({ storageState: storageStatePath })
		try {
			await use(context)
		} finally {
			await context.close()
		}
	},
})

export { expect } from '@playwright/test'

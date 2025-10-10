import { expect, test } from '../fixtures/tla-test'

/**
 * Simple test to verify that the init mode environment variable works correctly
 */

test.describe('Init Mode Verification', () => {
	test('should create user with correct migration state', async ({
		database,
		sidebar,
		editor,
		page,
	}) => {
		// Get the init mode from environment
		const initMode = process.env.TLDRAW_INIT_MODE || 'legacy'
		const shouldUseNewInit = initMode === 'new'

		// Verify localStorage was set correctly
		// eslint-disable-next-line no-restricted-syntax
		const localStorageValue = await page.evaluate(() => localStorage.getItem('tldraw_groups_init'))

		expect(localStorageValue).toBe(shouldUseNewInit ? 'true' : null)

		// Reset to ensure fresh user creation
		await database.reset()

		// Navigate to trigger user creation
		await page.goto('http://localhost:3000/')
		await editor.isLoaded()
		await editor.ensureSidebarOpen()
		await sidebar.createNewDocument()

		// Check the user's migration state
		const isMigrated = await database.isUserMigrated()

		if (shouldUseNewInit) {
			expect(isMigrated).toBe(true)
		} else {
			expect(isMigrated).toBe(false)
		}
	})
})

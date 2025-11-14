import { getRandomName } from '../fixtures/helpers'
import { test } from '../fixtures/tla-test'

test.describe('Groups', () => {
	test.beforeEach(async ({ database, editor }) => {
		// Migrate user to groups backend and enable frontend flag
		await database.migrateUser()
		await database.enableGroupsFrontend()
		await editor.isLoaded()
		await editor.ensureSidebarOpen()
	})

	test.describe('Group creation & basic operations', () => {
		test('can create new group', async ({ page, sidebar, editor }) => {
			const groupName = getRandomName()

			// Create group
			await sidebar.createGroup(groupName)

			// Verify group appears in sidebar
			await sidebar.expectGroupVisible(groupName)

			// Verify persists after reload
			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectGroupVisible(groupName)
		})
	})
})

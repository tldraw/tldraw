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

	test.describe('Group expansion & collapse', () => {
		test('can expand and collapse, independent state, resets on reload', async ({
			page,
			sidebar,
			editor,
		}) => {
			const group1 = getRandomName()
			const group2 = getRandomName()
			const homeFileName = getRandomName()
			const file1 = getRandomName()
			const file2 = getRandomName()

			// Create a file in home group first
			await sidebar.createNewDocument(homeFileName)
			await sidebar.expectFileVisible(homeFileName)

			// Create two groups (they start expanded by default)
			await sidebar.createGroup(group1)
			await sidebar.createGroup(group2)
			await sidebar.expectGroupExpanded(group1)
			await sidebar.expectGroupExpanded(group2)

			// Create files in each group
			await sidebar.createFileInGroup(group1, file1)
			await sidebar.createFileInGroup(group2, file2)

			// Files should be visible when groups are expanded
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			// Collapse first group - its file should not be visible
			await sidebar.toggleGroup(group1)
			await sidebar.expectGroupCollapsed(group1)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			// Collapse second group - its file should not be visible
			await sidebar.toggleGroup(group2)
			await sidebar.expectGroupCollapsed(group2)
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			// Expand first group again - its file should be visible
			await sidebar.toggleGroup(group1)
			await sidebar.expectGroupExpanded(group1)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			// Expand second group - both files visible
			await sidebar.toggleGroup(group2)
			await sidebar.expectGroupExpanded(group2)
			await sidebar.expectFileVisible(file1)
			await sidebar.expectFileVisible(file2)
			await sidebar.expectFileVisible(homeFileName)

			// Navigate to home file so we're not on a group file before reload
			await sidebar.getFileByName(homeFileName).click()
			await editor.isLoaded()

			// Reload - expansion state resets to collapsed
			await page.reload()
			await editor.isLoaded()
			await editor.ensureSidebarOpen()
			await sidebar.expectGroupCollapsed(group1)
			await sidebar.expectGroupCollapsed(group2)

			// Group files should not be visible, home file should be
			await sidebar.expectFileNotVisible(file1)
			await sidebar.expectFileNotVisible(file2)
			await sidebar.expectFileVisible(homeFileName)
		})
	})
})

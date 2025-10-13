import { MAX_NUMBER_OF_FILES } from '@tldraw/dotcom-shared'
import { expect, test } from '../fixtures/tla-test'

test.describe('File Limits', () => {
	test.beforeEach(async ({ database }) => {
		// Start fresh for each test
		await database.reset()
	})

	test('unmigrated user respects file limit', async ({ sidebar, editor, database, page }) => {
		// Ensure user is NOT migrated
		const isMigrated = await database.isUserMigrated()
		if (isMigrated) {
			test.skip()
			return
		}

		await editor.isLoaded()
		await editor.ensureSidebarOpen()

		// Create files up to the limit
		for (let i = 0; i < MAX_NUMBER_OF_FILES; i++) {
			await sidebar.createNewDocument(`File ${i + 1}`)
			// Brief wait to ensure file is created
			await page.waitForTimeout(200)
		}

		// Verify we have exactly MAX_NUMBER_OF_FILES
		const count = await sidebar.getNumberOfFiles()
		expect(count).toBe(MAX_NUMBER_OF_FILES)

		// Try to create one more - should show error toast
		await sidebar.createFileButton.click()

		// Check for error toast
		await expect(page.getByText('File limit reached')).toBeVisible({ timeout: 5000 })

		// Verify file count hasn't increased
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(MAX_NUMBER_OF_FILES)
	})

	test('migrated user respects file limit', async ({ sidebar, editor, database, page }) => {
		// Ensure user IS migrated
		const isMigrated = await database.isUserMigrated()
		if (!isMigrated) {
			// Migrate the user first
			await database.migrateUser()
			await page.reload()
		}

		await editor.isLoaded()
		await editor.ensureSidebarOpen()

		// Create files up to the limit
		for (let i = 0; i < MAX_NUMBER_OF_FILES; i++) {
			await sidebar.createNewDocument(`File ${i + 1}`)
			// Brief wait to ensure file is created
			await page.waitForTimeout(200)
		}

		// Verify we have exactly MAX_NUMBER_OF_FILES
		const count = await sidebar.getNumberOfFiles()
		expect(count).toBe(MAX_NUMBER_OF_FILES)

		// Try to create one more - should show error toast
		await sidebar.createFileButton.click()

		// Check for error toast
		await expect(page.getByText('File limit reached')).toBeVisible({ timeout: 5000 })

		// Verify file count hasn't increased
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(MAX_NUMBER_OF_FILES)
	})

	test('migrated user file limit counts correctly after migration', async ({
		sidebar,
		editor,
		database,
		page,
	}) => {
		// Start as unmigrated and create some files
		const isMigrated = await database.isUserMigrated()
		if (isMigrated) {
			test.skip()
			return
		}

		await editor.isLoaded()
		await editor.ensureSidebarOpen()

		// Create MAX_NUMBER_OF_FILES - 1 files before migration
		const filesToCreate = MAX_NUMBER_OF_FILES - 1
		for (let i = 0; i < filesToCreate; i++) {
			await sidebar.createNewDocument(`Pre-migration File ${i + 1}`)
			await page.waitForTimeout(200)
		}

		// Verify count before migration
		const countBeforeMigration = await sidebar.getNumberOfFiles()
		expect(countBeforeMigration).toBe(filesToCreate)

		// Migrate the user
		await database.migrateUser()
		await page.reload()
		await editor.isLoaded()
		await editor.ensureSidebarOpen()

		// Verify count after migration (should be the same)
		const countAfterMigration = await sidebar.getNumberOfFiles()
		expect(countAfterMigration).toBe(filesToCreate)

		// Should be able to create exactly 1 more file
		await sidebar.createNewDocument('Post-migration File')
		await page.waitForTimeout(200)

		const finalCount = await sidebar.getNumberOfFiles()
		expect(finalCount).toBe(MAX_NUMBER_OF_FILES)

		// Now trying to create one more should fail
		await sidebar.createFileButton.click()
		await expect(page.getByText('File limit reached')).toBeVisible({ timeout: 5000 })
	})

	test('deleted files do not count toward limit', async ({
		sidebar,
		editor,
		database: _,
		page,
	}) => {
		await editor.isLoaded()
		await editor.ensureSidebarOpen()

		// Create 3 files
		await sidebar.createNewDocument('File 1')
		await page.waitForTimeout(200)
		await sidebar.createNewDocument('File 2')
		await page.waitForTimeout(200)
		await sidebar.createNewDocument('File 3')
		await page.waitForTimeout(200)

		// Verify we have 3 files
		let count = await sidebar.getNumberOfFiles()
		expect(count).toBe(3)

		// Delete one file
		const fileLink = page.getByTestId('tla-file-link-today-0')
		await fileLink.hover()
		await fileLink.getByTestId('tla-file-link-menu-button').click()
		await page.getByTestId('file-menu-delete').click()
		// Confirm deletion in dialog
		await page.getByRole('button', { name: /delete/i }).click()
		await page.waitForTimeout(500)

		// Verify we now have 2 files
		count = await sidebar.getNumberOfFiles()
		expect(count).toBe(2)

		// Should be able to create another file (deleted file doesn't count)
		await sidebar.createNewDocument('File 4')
		await page.waitForTimeout(200)

		count = await sidebar.getNumberOfFiles()
		expect(count).toBe(3)
	})
})

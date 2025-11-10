import { expectBeforeAndAfterReload, getRandomName } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ editor }) => {
	await editor.isLoaded()
})

test.describe('sidebar search', () => {
	test('can search for files by name', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		// Create three files with distinct names
		const fileName1 = getRandomName()
		const fileName2 = getRandomName()
		const fileName3 = getRandomName()

		await sidebar.createNewDocument(fileName1)
		await sidebar.createNewDocument(fileName2)
		await sidebar.createNewDocument(fileName3)

		// Verify all files are visible
		await expect(page.getByText(fileName1, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName3, { exact: true })).toBeVisible()

		// Search for the first file
		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()
		await searchInput.fill(fileName1)

		// Only the first file should be visible
		await expect(page.getByText(fileName1, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).not.toBeVisible()
		await expect(page.getByText(fileName3, { exact: true })).not.toBeVisible()

		// Search for the second file
		await searchInput.fill(fileName2)

		// Only the second file should be visible
		await expect(page.getByText(fileName1, { exact: true })).not.toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName3, { exact: true })).not.toBeVisible()
	})

	test('can clear search with clear button', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName1 = getRandomName()
		const fileName2 = getRandomName()

		await sidebar.createNewDocument(fileName1)
		await sidebar.createNewDocument(fileName2)

		// Search for a file
		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()
		await searchInput.fill(fileName1)

		// Only the searched file should be visible
		await expect(page.getByText(fileName1, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).not.toBeVisible()

		// Clear button should be visible
		const clearButton = page.getByTestId('tla-sidebar-search-clear')
		await expect(clearButton).toBeVisible()

		// Click the clear button
		await clearButton.click()

		// All files should be visible again
		await expect(page.getByText(fileName1, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).toBeVisible()

		// Clear button should not be visible
		await expect(clearButton).not.toBeVisible()

		// Search input should be empty
		await expect(searchInput).toHaveValue('')
	})

	test('search is case insensitive', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName = 'TestFile123'
		await sidebar.createNewDocument(fileName)

		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()

		// Search with lowercase
		await searchInput.fill('testfile')
		await expect(page.getByText(fileName, { exact: true })).toBeVisible()

		// Search with uppercase
		await searchInput.fill('TESTFILE')
		await expect(page.getByText(fileName, { exact: true })).toBeVisible()

		// Search with mixed case
		await searchInput.fill('TeStFiLe')
		await expect(page.getByText(fileName, { exact: true })).toBeVisible()
	})

	test('search ignores whitespace', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName = 'My Test File'
		await sidebar.createNewDocument(fileName)

		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()

		// Search without spaces
		await searchInput.fill('mytestfile')
		await expect(page.getByText(fileName, { exact: true })).toBeVisible()

		// Search with different spacing
		await searchInput.fill('my  test   file')
		await expect(page.getByText(fileName, { exact: true })).toBeVisible()
	})

	test('search shows "No results" when no files match', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName = getRandomName()
		await sidebar.createNewDocument(fileName)

		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()
		await searchInput.fill('nonexistentfile12345')

		// File should not be visible
		await expect(page.getByText(fileName, { exact: true })).not.toBeVisible()

		// "No results" message should be shown
		await expect(page.getByText('No results.')).toBeVisible()
	})

	test('search persists after reload', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName1 = getRandomName()
		const fileName2 = getRandomName()

		await sidebar.createNewDocument(fileName1)
		await sidebar.createNewDocument(fileName2)

		// Search for a file
		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()
		await searchInput.fill(fileName1)

		await expectBeforeAndAfterReload(async () => {
			// Only the searched file should be visible
			await expect(page.getByText(fileName1, { exact: true })).toBeVisible()
			await expect(page.getByText(fileName2, { exact: true })).not.toBeVisible()

			// Search input should still have the search query
			const searchInputAfterReload = page.getByTestId('tla-sidebar-search-input')
			await expect(searchInputAfterReload).toHaveValue(fileName1)
		}, page)
	})

	test('search works with pinned files', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName1 = getRandomName()
		const fileName2 = getRandomName()

		await sidebar.createNewDocument(fileName1)
		await sidebar.createNewDocument(fileName2)

		// Pin the first file
		await sidebar.pinFromFileMenu(1)

		// Verify the file is in the pinned section
		await expect(page.getByTestId('tla-file-link-pinned-0').getByText(fileName1)).toBeVisible()

		// Search for the pinned file
		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.click()
		await searchInput.fill(fileName1)

		// Only the pinned file should be visible
		await expect(page.getByText(fileName1, { exact: true })).toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).not.toBeVisible()

		// Clear search
		const clearButton = page.getByTestId('tla-sidebar-search-clear')
		await clearButton.click()

		// Both files should be visible again, with the first one in pinned section
		await expect(page.getByTestId('tla-file-link-pinned-0').getByText(fileName1)).toBeVisible()
		await expect(page.getByText(fileName2, { exact: true })).toBeVisible()
	})

	test('search input focuses and selects all on focus', async ({ editor, sidebar, page }) => {
		await editor.ensureSidebarOpen()

		const fileName = getRandomName()
		await sidebar.createNewDocument(fileName)

		const searchInput = page.getByTestId('tla-sidebar-search-input')
		await searchInput.fill(fileName)

		// Blur the input
		await page.keyboard.press('Escape')

		// Focus again
		await searchInput.click()

		// Input should be focused
		await expect(searchInput).toBeFocused()

		// Type something - if text was selected, it should be replaced
		await page.keyboard.type('new')
		await expect(searchInput).toHaveValue('new')
	})
})

import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ homePage }) => {
	await homePage.goto()
	await homePage.isLoaded()
})

test.afterEach(async ({ database }) => {
	await database.reset()
})

test('can toggle sidebar', async ({ editor, sidebar }) => {
	await editor.ensureSidebarClosed()
	await expect(sidebar.sidebarLogo).not.toBeVisible()
	await editor.toggleSidebar()
	await expect(sidebar.sidebarLogo).toBeVisible()
})

test('can create new file', async ({ editor, sidebar }) => {
	await editor.ensureSidebarOpen()
	const currentCount = await sidebar.getNumberOfFiles()
	await sidebar.createNewDocument()
	const newCount = await sidebar.getNumberOfFiles()
	expect(newCount).toBe(currentCount + 1)
})

test.fixme('can can double click file name to rename it', async () => {
	// ...
})

// Preferences

test.fixme('can toggle dark mode', async () => {
	// ...
})

// File menu in sidebar

test.fixme('can duplicate a file', async () => {
	// ...
})

test.fixme('can copy a file link from the file menu', async () => {
	// ...
})

test.fixme('can delete a file', async () => {
	// ...
})

// Menu bar

test.fixme('can rename a file name by clicking the name', async () => {
	// ...
})

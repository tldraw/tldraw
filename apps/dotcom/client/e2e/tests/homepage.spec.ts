import { expect, test, todo } from '../fixtures/tla-test'

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

todo('can can double click file name to rename it', async () => {
	// ...
})

// Preferences

todo('can toggle dark mode', async () => {
	// ...
})

// File menu in sidebar

todo('can duplicate a file', async () => {
	// ...
})

todo('can copy a file link from the file menu', async () => {
	// ...
})

todo('can delete a file', async () => {
	// ...
})

// Menu bar

todo('can rename a file name by clicking the name', async () => {
	// ...
})

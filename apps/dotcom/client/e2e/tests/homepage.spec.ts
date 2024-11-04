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

test('can toggle dark mode', async ({ page, editor, sidebar }) => {
	await expect(page.locator('div.tla-theme__light.tl-theme__light')).toBeVisible()
	await expect(page.locator('div.tla-theme__dark.tl-theme__dark')).not.toBeVisible()
	await expect(page.locator('div.tl-background')).toHaveCSS(
		'background-color',
		'rgb(249, 250, 251)'
	)
	await expect(page.locator('div.tla-theme-container')).toHaveCSS(
		'background-color',
		'rgb(252, 252, 252)'
	)
	await editor.ensureSidebarOpen()
	await sidebar.openPreferences()
	await sidebar.setDarkMode()
	await expect(page.locator('div.tla-theme__light.tl-theme__light')).not.toBeVisible()
	await expect(page.locator('div.tla-theme__dark.tl-theme__dark')).toBeVisible()
	await expect(page.locator('div.tl-background')).toHaveCSS('background-color', 'rgb(16, 16, 17)')
	await expect(page.locator('div.tla-theme-container')).toHaveCSS(
		'background-color',
		'rgb(13, 13, 13)'
	)
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

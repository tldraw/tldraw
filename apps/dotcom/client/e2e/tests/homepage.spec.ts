import { expect, test } from '../fixtures/tla-test'

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
	await test.step('is light mode by default', async () => {
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
	})
	await test.step('can toggle dark mode', async () => {
		await editor.ensureSidebarOpen()
		await sidebar.setDarkMode()
	})
	await test.step('is dark mode', async () => {
		await expect(page.locator('div.tla-theme__light.tl-theme__light')).not.toBeVisible()
		await expect(page.locator('div.tla-theme__dark.tl-theme__dark')).toBeVisible()
		await expect(page.locator('div.tl-background')).toHaveCSS('background-color', 'rgb(16, 16, 17)')
		await expect(page.locator('div.tla-theme-container')).toHaveCSS(
			'background-color',
			'rgb(13, 13, 13)'
		)
	})
})

test.fixme('can change language', async () => {
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

test('can rename a file name by clicking the name', async ({ editor, sidebar }) => {
	const originalName = await editor.getCurrentFileName()
	const newName = 'NewFileName'
	await sidebar.expectToContainText(originalName)
	await sidebar.expectNotToContainText(newName)

	await editor.rename(newName)

	const currentName = await editor.getCurrentFileName()
	expect(currentName).toBe(newName)
	expect(currentName).not.toBe(originalName)
	await sidebar.expectToContainText(newName)
	await sidebar.expectNotToContainText(originalName)
})

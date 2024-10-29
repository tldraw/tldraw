import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ homePage }) => {
	await homePage.goto()
	await homePage.isLoaded()
})

test('can toggle sidebar', async ({ editor, sidebar }) => {
	await editor.ensureSidebarClosed()
	await expect(sidebar.sidebarLogo).not.toBeVisible()
	await editor.toggleSidebar()
	await expect(sidebar.sidebarLogo).toBeVisible()
})

test('can create new document', async ({ page, editor, sidebar }) => {
	await editor.ensureSidebarOpen()
	const currentCount = (await page.$$('[data-element="file-link"]')).length
	await sidebar.createNewDocument()
	const newCount = (await page.$$('[data-element="file-link"]')).length
	expect(newCount).toBe(currentCount + 1)
})

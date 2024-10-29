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

test('sidebar file operations', async ({ page, editor, sidebar, deleteFileDialog }) => {
	const randomString = Math.random().toString(36).substring(7)

	await test.step('Create a new document', async () => {
		await editor.ensureSidebarOpen()
		const currentCount = await sidebar.getFileCount()
		await sidebar.createNewDocument()
		const newCount = await sidebar.getFileCount()
		expect(newCount).toBe(currentCount + 1)
	})

	await test.step('rename the document via double click', async () => {
		const firstFileLink = await sidebar.getFirstFileLink()
		await firstFileLink?.dblclick()
		const input = page.getByRole('textbox')
		await input?.fill(randomString)
		await page.keyboard.press('Enter')
		const newFirstFileLink = await sidebar.getFirstFileLink()
		const newName = await newFirstFileLink?.innerText()
		expect(newName).toBe(randomString)
	})

	await test.step('duplicate the document', async () => {
		const firstFileName = await sidebar.getFirstFileLink()
		await sidebar.openFileMenu(firstFileName)
		await page.getByRole('menuitem', { name: 'Duplicate' }).click()
		expect(page.getByText(`${firstFileName} Copy`)).toBeVisible()
	})

	await test.step('delete the document', async () => {
		const initialCount = await sidebar.getFileCount()
		const firstFileLink = await sidebar.getFirstFileLink()
		await sidebar.openFileMenu(firstFileLink)
		await sidebar.deleteFromFileMenu()
		await deleteFileDialog.expectIsVisible()
		await deleteFileDialog.confirmDeletion()
		await deleteFileDialog.expectIsNotVisible()
		const newCount = await sidebar.getFileCount()
		expect(newCount).toBe(initialCount - 1)
	})

	await test.step('change files', async () => {
		const firstFileLink = await sidebar.getFirstFileLink()
		await firstFileLink?.click()
	})
})

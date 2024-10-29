import { sleep } from 'tldraw'
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

test('can create new document', async ({ editor, sidebar }) => {
	await editor.ensureSidebarOpen()
	const currentCount = await sidebar.getNumberOfFiles()
	await sidebar.createNewDocument()
	const newCount = await sidebar.getNumberOfFiles()
	expect(newCount).toBe(currentCount + 1)
})

test('sidebar file operations', async ({ page, sidebar, deleteFileDialog }) => {
	const randomString = Math.random().toString(36).substring(7)

	await test.step('rename the document via double click', async () => {
		const fileLink = await sidebar.getFileLink()
		await fileLink?.dblclick()
		const input = page.getByRole('textbox')
		await input?.fill(randomString)
		await page.keyboard.press('Enter')
		const newFileLink = await sidebar.getFileLink()
		const newName = await newFileLink?.innerText()
		expect(newName).toBe(randomString)
	})

	await test.step('duplicate the document', async () => {
		const fileName = await sidebar.getFileLink()
		await sidebar.openFileMenu(fileName)
		await page.getByRole('menuitem', { name: 'Duplicate' }).click()
		await sleep(1000)
		const copiedFileLink = page.getByRole('link').getByText(`${fileName} Copy`)
		expect(copiedFileLink).toBeVisible()
	})

	await test.step('delete the document', async () => {
		const fileLink = await sidebar.getFileLink()
		await sidebar.openFileMenu(fileLink)
		const currentCount = await sidebar.getNumberOfFiles()
		await sidebar.deleteFromFileMenu()
		await deleteFileDialog.expectIsVisible()
		await deleteFileDialog.confirmDeletion()
		await deleteFileDialog.expectIsNotVisible()
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(currentCount - 1)
	})
	await test.step('change files', async () => {
		const fileLink = await sidebar.getFileLink()
		await fileLink?.click()
	})
})

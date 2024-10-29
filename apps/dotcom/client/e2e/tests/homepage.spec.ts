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

test('sidebar file operations', async ({ page, editor, sidebar, deleteFileDialog }) => {
	const randomString = Math.random().toString(36).substring(7)

	await test.step('Create a new document', async () => {
		await editor.ensureSidebarOpen()
		const currentCount = await sidebar.getNumberOfFiles()
		await sidebar.createNewDocument()
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(currentCount + 1)
	})

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
		const copiedFileLink = page.getByRole('link').getByText(`${fileName} Copy`)
		expect(copiedFileLink).toBeVisible()
	})

	await test.step('delete the document', async () => {
		const fileLink = await sidebar.getFileLink()
		const fileName = await fileLink?.innerText()
		await sidebar.openFileMenu(fileLink)
		await sidebar.deleteFromFileMenu()
		await deleteFileDialog.expectIsVisible()
		await deleteFileDialog.confirmDeletion()
		await deleteFileDialog.expectIsNotVisible()
		const deletedFileLink = page.getByRole('link').getByText(`${fileName}`)
		expect(deletedFileLink).toBeNull()
	})

	await test.step('change files', async () => {
		const fileLink = await sidebar.getFileLink()
		await fileLink?.click()
	})
})

// test('delete file', async ({ page, sidebar, deleteFileDialog }) => {
// 	const numberOfFiles = await sidebar.getNumberOfFiles()
// 	for (let i = 0; i < numberOfFiles - 1; i++) {
// 		const fileLink = await sidebar.getFileLink()
// 		await sidebar.openFileMenu(fileLink)
// 		await sidebar.deleteFromFileMenu()
// 		await deleteFileDialog.expectIsVisible()
// 		await deleteFileDialog.confirmDeletion()
// 		await deleteFileDialog.expectIsNotVisible()
// 		await sleep(1000)
// 	}
// })

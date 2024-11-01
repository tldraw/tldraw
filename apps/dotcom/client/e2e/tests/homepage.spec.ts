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

test('sidebar file operations', async ({ editor, page, sidebar, deleteFileDialog }) => {
	const fileName = Math.random().toString(36).substring(7)

	await test.step('delete the document via the file menu', async () => {
		const fileLink = await sidebar.getFileLink()
		const fileName = await fileLink.innerText()
		await sidebar.openFileMenu(fileLink)
		await sidebar.deleteFromFileMenu()
		await deleteFileDialog.expectIsVisible()
		await deleteFileDialog.confirmDeletion()
		await deleteFileDialog.expectIsNotVisible()
		await expect(page.getByText(fileName)).not.toBeVisible()
	})

	await test.step('rename the document via double click', async () => {
		const initialRandomName = Math.random().toString(36).substring(7)
		const fileLink = await sidebar.getFileLink()
		await fileLink?.dblclick()
		const input = page.getByRole('textbox')
		await input?.fill(initialRandomName)
		await page.keyboard.press('Enter')
		const newFileLink = await sidebar.getFileLink()
		const newName = await newFileLink?.innerText()
		expect(newName).toBe(initialRandomName)
	})

	await test.step('rename the document via file menu', async () => {
		const fileLink = await sidebar.getFileLink()
		await sidebar.openFileMenu(fileLink)
		await sidebar.renameFromFileMenu(fileName)
		expect(page.getByTestId(fileName)).toBeVisible()
	})

	await test.step('duplicate the document via the file menu', async () => {
		const fileLink = await sidebar.getFileLink()
		await sidebar.openFileMenu(fileLink)
		await sidebar.duplicateFromFileMenu()
		await expect(page.getByText(`${fileName} Copy`)).toBeVisible()
	})

	//todo: switch between files
})

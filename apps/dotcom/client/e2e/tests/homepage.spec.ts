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

	// todo: turn this back on after optimistic update fixes
	// test('switch between files', async () => {
	// 	const originalFileLink = await sidebar.getFileLink(fileName)
	// 	const copyFileLink = await sidebar.getFileLink(`${fileName} Copy`)

	// 	await originalFileLink.click()
	// 	expect(page.locator('.tl-background')).toBeVisible()

	// 	const copyFileLinkLocator = page
	// 		.locator(sidebar.fileLink)
	// 		.filter({ hasText: `${fileName} Copy` })
	// 	expect(await sidebar.isHinted(copyFileLinkLocator)).toBe(false)

	// 	await page.getByTestId('tools.rectangle').click()
	// 	await page.locator('.tl-background').click()
	// 	expect(await editor.getNumberOfShapes()).toBe(1)

	// 	await copyFileLink.click()
	// 	expect(page.locator('.tl-background')).toBeVisible()
	// 	expect(await sidebar.isHinted(copyFileLinkLocator)).toBe(true)

	// 	expect(await editor.getNumberOfShapes()).toBe(0)
	// })
})

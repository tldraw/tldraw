import { Editor } from '../fixtures/Editor'
import { sleep } from '../fixtures/helpers'
import { HomePage } from '../fixtures/HomePage'
import { Sidebar } from '../fixtures/Sidebar'
import { expect, test } from '../fixtures/tla-test'

test('correctly clears db ', async ({ page, browser, editor, sidebar, database }) => {
	const documentsToAdd = 3
	await test.step(`create ${documentsToAdd} files file`, async () => {
		await editor.ensureSidebarOpen()
		const currentCount = await sidebar.getNumberOfFiles()
		for (let i = 0; i < documentsToAdd; i++) {
			await sleep(1100)
			await sidebar.createNewDocument()
		}
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(currentCount + documentsToAdd)
	})

	await test.step('close the page and reset db', async () => {
		await page.close()
		await database.reset()
	})

	await test.step('check that files reset', async () => {
		const newPage = await browser.newPage()
		const newSidebar = new Sidebar(newPage)
		const newEditor = new Editor(newPage, newSidebar)
		const newHomePage = new HomePage(newPage, newEditor)
		await newHomePage.goto()
		await newHomePage.isLoaded()
		const afterReset = await newSidebar.getNumberOfFiles()
		expect(afterReset).toBe(1)
	})
})

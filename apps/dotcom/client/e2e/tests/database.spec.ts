import { expect, test } from '../fixtures/tla-test'
test.beforeEach(async ({ homePage }) => {
	await homePage.goto()
	await homePage.isLoaded()
})

test('correctly clears db', async ({ editor, sidebar, database }) => {
	await editor.ensureSidebarOpen()
	const currentCount = await sidebar.getNumberOfFiles()
	const documentsToAdd = 3
	for (let i = 0; i < documentsToAdd; i++) {
		await sidebar.createNewDocument()
	}
	const newCount = await sidebar.getNumberOfFiles()
	expect(newCount).toBe(currentCount + documentsToAdd)

	await database.reset()
	const afterReset = await sidebar.getNumberOfFiles()
	expect(afterReset).toBe(0)
})

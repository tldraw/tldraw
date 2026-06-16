import fs from 'fs'
import { expect, test } from '../fixtures/scenario-test'

test.describe.configure({ mode: 'parallel' })

function validateTldrJson(json: unknown) {
	expect(json).toMatchObject({
		tldrawFileFormatVersion: 1,
		schema: expect.objectContaining({ schemaVersion: expect.any(Number) }),
		records: expect.arrayContaining([expect.objectContaining({ typeName: 'document' })]),
	})
}

test.describe('import and download scenarios', () => {
	test('owner imports a tldr file from a URL into a scenario file', async ({ owner, scenario }) => {
		await owner.editor.ensureSidebarOpen()
		const fileCountBefore = await owner.sidebar.getNumberOfFiles()

		const importedFile = await scenario.importFileFromUrl(owner)

		await expect(async () => {
			expect(await owner.sidebar.getNumberOfFiles()).toBe(fileCountBefore + 1)
		}).toPass()
		expect(importedFile.fileName).toBe('e2e import test')
		expect(importedFile.url).toMatch(/\/f\//)
	})

	test('owner downloads a namespaced scenario file from the sidebar', async ({
		owner,
		scenario,
	}) => {
		const fileName = scenario.name('download file')
		await scenario.createPersonalFile(owner, fileName)

		const download = await scenario.downloadFileFromSidebar(owner, fileName)

		const filePath = await download.path()
		expect(filePath).toBeTruthy()
		const json = JSON.parse(fs.readFileSync(filePath!, 'utf-8'))
		validateTldrJson(json)
		expect(download.suggestedFilename()).toContain(fileName)
		expect(download.suggestedFilename()).toMatch(/\.tldr$/)
	})
})

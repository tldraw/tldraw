import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { expectBeforeAndAfterReload } from '../fixtures/helpers'
import { expect, test } from '../fixtures/staging-test'

const testFilesPath = join(__dirname, '../fixtures/test-files.json')
let testFiles: string[] = []
if (existsSync(testFilesPath)) {
	try {
		testFiles = JSON.parse(readFileSync(testFilesPath, 'utf-8')) as string[]
	} catch (error) {
		console.warn('Failed to read test-files.json:', error)
		testFiles = []
	}
}

testFiles.forEach((fileId, _index) => {
	const fileIdSuffix = fileId.replace('test_', '').substring(0, 4)
	test(`should load test room ${fileIdSuffix} without errors and be able to edit it`, async ({
		page,
		editor,
	}) => {
		await page.goto(`https://staging.tldraw.com/f/${fileId}`)
		await expect(page).toHaveURL(new RegExp(`.*/f/${fileId}`))

		await expect(page.getByTestId('tla-file-name')).toBeVisible({ timeout: 10000 })
		await expect(page.getByText('Something went wrong')).not.toBeVisible()

		const initialShapeCount = await editor.getShapeCount()

		await page.getByTestId('tools.rectangle').click()
		await page.locator('.tl-background').click({ force: true })

		await expectBeforeAndAfterReload(async () => {
			await editor.expectShapesCount(initialShapeCount + 1)
		}, page)
	})
})

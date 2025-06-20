import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { expectBeforeAndAfterReload } from '../fixtures/helpers'
import { expect, test } from '../fixtures/staging-test'

test.describe.configure({ mode: 'serial' })

test.describe('Staging room loading', () => {
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
	for (const fileId of testFiles) {
		test(`should load the rooms without errors and be able to edit them`, async ({
			page,
			editor,
		}) => {
			await page.goto(`https://staging.tldraw.com/f/${fileId}`)
			await expect(page).toHaveURL(new RegExp(`.*/f/${fileId}`))

			await expect(page.getByTestId('tla-editor')).toBeVisible()
			await expect(page.getByText('Something went wrong')).not.toBeVisible()

			const initialShapeCount = await editor.getShapeCount()

			await page.getByTestId('tools.rectangle').click()
			await page.locator('.tl-background').click({ force: true })

			await expectBeforeAndAfterReload(async () => {
				await editor.expectShapesCount(initialShapeCount + 1)
			}, page)
		})
	}
})

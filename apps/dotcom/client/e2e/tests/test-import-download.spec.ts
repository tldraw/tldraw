import fs from 'fs'
import { USERS } from '../consts'
import { expect, test } from '../fixtures/tla-test'

function validateTldrJson(json: unknown) {
	expect(json).toMatchObject({
		tldrawFileFormatVersion: 1,
		schema: expect.objectContaining({ schemaVersion: expect.any(Number) }),
		records: expect.arrayContaining([expect.objectContaining({ typeName: 'document' })]),
	})
}

// ------------------------------------------------------------------ import --

test.describe('import from URL (signed in)', () => {
	test.beforeEach(async ({ editor }) => {
		await editor.isLoaded()
	})

	test('imports file and navigates to it', async ({ page, editor, sidebar, importHelper }) => {
		await importHelper.mockUrl()
		await editor.ensureSidebarOpen()
		const fileCountBefore = await sidebar.getNumberOfFiles()

		await importHelper.navigate()
		await page.waitForURL(/\/f\//)
		await editor.isLoaded()

		await expect(async () => {
			expect(await sidebar.getNumberOfFiles()).toBe(fileCountBefore + 1)
		}).toPass()

		const fileName = await editor.getCurrentFileName()
		expect(fileName).toBe('e2e import test')
	})

	test('redirects to root when no url param is provided', async ({ page }) => {
		await page.goto('http://localhost:3000/import')
		// Should redirect away from /import immediately (signed-in users then get
		// forwarded on to their most-recent file, so we can't assert a specific URL).
		await expect(page).not.toHaveURL(/\/import/)
	})

	test('shows import-failed toast when the url returns a non-200 response', async ({ page }) => {
		const badUrl = 'https://e2e-mock.tldraw.xyz/not-found.tldr'
		await page.route(badUrl, (route) => route.fulfill({ status: 404 }))

		await page.goto(`http://localhost:3000/import?url=${encodeURIComponent(badUrl)}`)
		await expect(page).not.toHaveURL(/\/import/)
		await expect(page.getByText('Import failed', { exact: true })).toBeVisible()
	})

	test('shows import-failed toast when the url returns invalid json', async ({ page }) => {
		const badUrl = 'https://e2e-mock.tldraw.xyz/not-a-tldr-file.txt'
		await page.route(badUrl, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'text/plain',
				headers: { 'Access-Control-Allow-Origin': '*' },
				body: 'this is not a tldraw file',
			})
		)

		await page.goto(`http://localhost:3000/import?url=${encodeURIComponent(badUrl)}`)
		await expect(page).not.toHaveURL(/\/import/)
		await expect(page.getByText('Import failed', { exact: true })).toBeVisible()
	})
})

test.describe('import from URL (signed out)', () => {
	test.use({ storageState: { cookies: [], origins: [] } })

	test('shows sign-in dialog; after email sign-in navigates to the imported file', async ({
		page,
		signInDialog,
		editor,
		importHelper,
	}) => {
		const user = USERS[test.info().parallelIndex]
		await importHelper.mockUrl()

		// Navigate to the import URL while signed out.
		// import.tsx will store the redirect and show the sign-in dialog.
		await importHelper.navigate()

		await signInDialog.expectInitialElements()
		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.fillCode('424242')

		// After sign-in, the import flow runs and navigates to the new file.
		await page.waitForURL(/\/f\//, { timeout: 20000 })
		await editor.isLoaded()
	})
})

// ---------------------------------------------------------------- download --

test.describe('download', () => {
	test.beforeEach(async ({ editor }) => {
		await editor.isLoaded()
	})

	test('can download the currently open file from the sidebar file menu', async ({
		page,
		sidebar,
		editor,
	}) => {
		await editor.ensureSidebarOpen()

		const fileLink = sidebar.getFirstFileLink()
		await fileLink.hover()
		await fileLink.getByRole('button').click()

		const downloadPromise = page.waitForEvent('download')
		await page.getByRole('menuitem', { name: 'Download' }).click()
		const download = await downloadPromise

		const filePath = await download.path()
		expect(filePath).toBeTruthy()
		const json = JSON.parse(fs.readFileSync(filePath!, 'utf-8'))
		validateTldrJson(json)
		expect(download.suggestedFilename()).toMatch(/\.tldr$/)
	})

	test('can download a file that is not currently open from the sidebar', async ({
		page,
		sidebar,
		editor,
	}) => {
		await editor.ensureSidebarOpen()

		// Create a second file so the sidebar has two entries.
		await sidebar.createNewDocument('download-test-secondary')

		// Navigate to the older file (index 1 = the one that was open originally).
		await sidebar.getFileLink('today', 1).click()
		await editor.isLoaded()

		// Download the newer file (index 0) which is not currently open.
		const fileLink = sidebar.getFileLink('today', 0)
		await fileLink.hover()
		await fileLink.getByRole('button').click()

		const downloadPromise = page.waitForEvent('download')
		await page.getByRole('menuitem', { name: 'Download' }).click()
		const download = await downloadPromise

		const filePath = await download.path()
		expect(filePath).toBeTruthy()
		const json = JSON.parse(fs.readFileSync(filePath!, 'utf-8'))
		validateTldrJson(json)
		expect(download.suggestedFilename()).toContain('download-test-secondary')
		expect(download.suggestedFilename()).toMatch(/\.tldr$/)
	})
})

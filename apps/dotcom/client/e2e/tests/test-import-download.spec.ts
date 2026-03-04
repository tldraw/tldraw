import type { Page } from '@playwright/test'
import fs from 'fs'
import { USERS } from '../consts'
import { expect, test } from '../fixtures/tla-test'

// A minimal valid .tldr file for import tests.
// Sequences are set to the current record versions so no migrations run on import,
// which would otherwise overwrite fields (e.g. AddName sets name='').
const MINIMAL_TLDR_FILE = {
	tldrawFileFormatVersion: 1,
	schema: {
		schemaVersion: 2,
		sequences: { 'com.tldraw.document': 2, 'com.tldraw.page': 1 } as Record<string, number>,
	},
	records: [
		{
			typeName: 'document',
			id: 'document:document',
			name: 'e2e import test',
			gridSize: 10,
			meta: {},
		},
		{
			typeName: 'page',
			id: 'page:page',
			index: 'a1',
			meta: {},
			name: 'Page 1',
		},
	],
}

const IMPORT_URL = 'https://example.com/test-tldr.tldr'

async function mockImportUrl(page: Page, url = IMPORT_URL) {
	await page.route(url, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: JSON.stringify(MINIMAL_TLDR_FILE),
		})
	)
}

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

	test('imports file and navigates to it', async ({ page, editor, sidebar }) => {
		await mockImportUrl(page)
		await editor.ensureSidebarOpen()
		const fileCountBefore = await sidebar.getNumberOfFiles()

		await page.goto(`http://localhost:3000/import?url=${encodeURIComponent(IMPORT_URL)}`)
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
		// Should immediately redirect to root; the editor might not be on a file page yet
		// but the URL should be the root
		await expect(page).toHaveURL('http://localhost:3000/')
	})

	test('shows import-failed toast when the url returns a non-200 response', async ({ page }) => {
		const badUrl = 'https://example.com/not-found.tldr'
		await page.route(badUrl, (route) => route.fulfill({ status: 404 }))

		await page.goto(`http://localhost:3000/import?url=${encodeURIComponent(badUrl)}`)
		// Stays at root after the failed import
		await expect(page).toHaveURL('http://localhost:3000/')
		await expect(page.getByText('Import failed')).toBeVisible()
	})

	test('shows import-failed toast when the url returns invalid json', async ({ page }) => {
		const badUrl = 'https://example.com/not-a-tldr-file.txt'
		await page.route(badUrl, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'text/plain',
				headers: { 'Access-Control-Allow-Origin': '*' },
				body: 'this is not a tldraw file',
			})
		)

		await page.goto(`http://localhost:3000/import?url=${encodeURIComponent(badUrl)}`)
		await expect(page).toHaveURL('http://localhost:3000/')
		await expect(page.getByText('Import failed')).toBeVisible()
	})
})

test.describe('import from URL (signed out)', () => {
	test.use({ storageState: { cookies: [], origins: [] } })

	test('shows sign-in dialog; after email sign-in navigates to the imported file', async ({
		page,
		signInDialog,
		editor,
	}) => {
		const user = USERS[test.info().parallelIndex]
		await mockImportUrl(page)

		// Navigate to the import URL while signed out.
		// import.tsx will store the redirect and show the sign-in dialog.
		await page.goto(`http://localhost:3000/import?url=${encodeURIComponent(IMPORT_URL)}`)

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

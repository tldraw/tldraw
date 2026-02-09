import { expect, test } from '../fixtures/tla-test'

// LocalFileHandler is only shown for anonymous users (scratch pad).
// Use empty storage so we get the anon editor with LocalFileHandler.
// Use clock.fastForward only (never runFor).
test.use({ storageState: { cookies: [], origins: [] } })

// Match constants from LocalFileHandler/constants.ts
const MAX_SESSION_TIME_MS = 24 * 60 * 60 * 1000 // 24 hours
const CHECK_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
const ACKNOWLEDGEMENT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
const LOCAL_STORAGE_KEY_FILESIZE = 'localFileLargeSizeAcknowledged'
const LOCAL_STORAGE_KEY_SESSION = 'localFileSessionAcknowledged'

const MIN_SHAPES_FOR_LARGE_FILE = 3600 + 1 // 0.9 * default maxShapesPerPage (4000)
const BATCH_SIZE = 3601

test.describe.configure({ mode: 'parallel' })

// Anon view has no sidebar, so we wait for editor/canvas (homePage.isLoaded()) not sidebar toggle (editor.isLoaded()).
test.beforeEach(async ({ homePage }) => {
	await homePage.isLoaded()
})

async function createManyShapes(
	page: import('@playwright/test').Page,
	count = MIN_SHAPES_FOR_LARGE_FILE
) {
	for (let created = 0; created < count; created += BATCH_SIZE) {
		const batchCount = Math.min(BATCH_SIZE, count - created)
		await page.evaluate(
			({ batchCount, offset }) => {
				const editor = (window as any).editor as import('tldraw').Editor
				if (!editor) throw new Error('Editor not on window')
				const shapes = Array.from({ length: batchCount }, (_, i) => {
					const n = offset + i
					return {
						type: 'geo' as const,
						x: (n % 100) * 30,
						y: Math.floor(n / 100) * 30,
						props: { w: 20, h: 20 },
					}
				})
				editor.createShapes(shapes)
			},
			{ batchCount, offset: created }
		)
	}
	// Wait for TLLocalSyncClient to persist to IndexedDB (throttle 350ms).
	await page.waitForTimeout(500)
}

/** Wait until the editor has at least `minShapes` shapes (e.g. after loading from IndexedDB). */
async function waitForShapeCount(
	page: import('@playwright/test').Page,
	minShapes: number,
	timeoutMs = 8000
) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const count = await page.evaluate(() => {
			const editor = (window as any).editor as import('tldraw').Editor
			if (!editor) return 0
			return editor.getPages().reduce((sum, p) => sum + editor.getPageShapeIds(p).size, 0)
		})
		if (count >= minShapes) return
		await page.waitForTimeout(100)
	}
	throw new Error(`Shape count did not reach ${minShapes} within ${timeoutMs}ms`)
}

test.describe('LocalFileHandler', () => {
	test.setTimeout(60000)

	test('does not show indicators when document is under thresholds', async ({ page }) => {
		await expect(page.getByTestId('tldraw-large-file-indicator')).not.toBeVisible()
		await expect(page.getByTestId('tldraw-session-time-indicator')).not.toBeVisible()
	})

	test('shows large-file indicator when document has many shapes and opens dialog on click', async ({
		page,
		homePage,
	}) => {
		await createManyShapes(page)
		await page.reload()
		await homePage.isLoaded()
		await waitForShapeCount(page, MIN_SHAPES_FOR_LARGE_FILE)

		const largeFileIndicator = page.getByTestId('tldraw-large-file-indicator')
		await expect(largeFileIndicator).toBeVisible({ timeout: 1000 })

		await largeFileIndicator.click()
		await expect(page.getByText('File is getting large')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Got it' })).toBeVisible()

		await page.getByRole('button', { name: 'Got it' }).click()
		await expect(page.getByText('File is getting large')).not.toBeVisible()
		await expect(largeFileIndicator).not.toBeVisible()
	})

	test('shows session-time indicator after long session and opens dialog on click', async ({
		page,
		homePage,
	}) => {
		await page.clock.install({ time: 0 })
		await page.reload()
		await homePage.isLoaded()
		await page.clock.fastForward(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)

		const sessionIndicator = page.getByTestId('tldraw-session-time-indicator')
		await expect(sessionIndicator).toBeVisible({ timeout: 1000 })

		await sessionIndicator.click()
		await expect(page.getByText('Been a long time!')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Got it' })).toBeVisible()

		await page.getByRole('button', { name: 'Got it' }).click()
		await expect(page.getByText('Been a long time!')).not.toBeVisible()
		await expect(sessionIndicator).not.toBeVisible()
	})

	test('large file takes priority over long session', async ({ page, homePage }) => {
		await createManyShapes(page)
		await page.reload()
		await homePage.isLoaded()
		await waitForShapeCount(page, MIN_SHAPES_FOR_LARGE_FILE)

		await page.clock.install({ time: 0 })
		await page.clock.fastForward(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)

		await expect(page.getByTestId('tldraw-large-file-indicator')).toBeVisible({
			timeout: 1000,
		})
		await expect(page.getByTestId('tldraw-session-time-indicator')).not.toBeVisible()
	})

	test('does not show large-file indicator if recently acknowledged', async ({
		page,
		homePage,
	}) => {
		await page.evaluate(
			(key) => localStorage.setItem(key, Date.now().toString()),
			LOCAL_STORAGE_KEY_FILESIZE
		)
		await createManyShapes(page)
		await page.reload()
		await homePage.isLoaded()
		await waitForShapeCount(page, MIN_SHAPES_FOR_LARGE_FILE)

		await page.clock.install({ time: 0 })
		await page.clock.fastForward(CHECK_INTERVAL_MS + 1)

		await expect(page.getByTestId('tldraw-large-file-indicator')).not.toBeVisible()
		await expect(page.getByTestId('tldraw-session-time-indicator')).not.toBeVisible()
	})

	test('does not show session-time indicator if recently acknowledged', async ({
		page,
		homePage,
	}) => {
		await page.clock.install({ time: 0 })
		await page.reload()
		await homePage.isLoaded()

		// Advance 11min, then set acknowledgement to "now" (still recent within 24h)
		await page.clock.fastForward(11 * 60 * 1000)
		await page.evaluate(
			(key) => localStorage.setItem(key, Date.now().toString()),
			LOCAL_STORAGE_KEY_SESSION
		)
		// Advance to past MAX_SESSION_TIME_MS; acknowledgement is still within 24h
		await page.clock.fastForward(MAX_SESSION_TIME_MS - 11 * 60 * 1000 + CHECK_INTERVAL_MS + 1)

		await expect(page.getByTestId('tldraw-session-time-indicator')).not.toBeVisible()
	})

	test('large-file indicator reappears after acknowledgement expires', async ({
		page,
		homePage,
	}) => {
		await createManyShapes(page)
		await page.reload()
		await homePage.isLoaded()
		await waitForShapeCount(page, MIN_SHAPES_FOR_LARGE_FILE)

		await page.clock.install({ time: 0 })
		await page.reload()
		await homePage.isLoaded()
		await waitForShapeCount(page, MIN_SHAPES_FOR_LARGE_FILE)

		// Acknowledge at t=0 (clock time), so indicator is hidden when interval runs
		await page.evaluate(
			(key) => localStorage.setItem(key, Date.now().toString()),
			LOCAL_STORAGE_KEY_FILESIZE
		)
		await page.clock.fastForward(CHECK_INTERVAL_MS + 1)
		await expect(page.getByTestId('tldraw-large-file-indicator')).not.toBeVisible({ timeout: 1000 })

		// Advance past acknowledgement expiry so next interval run shows the indicator again
		await page.clock.fastForward(ACKNOWLEDGEMENT_EXPIRY_MS + CHECK_INTERVAL_MS + 1)

		await expect(page.getByTestId('tldraw-large-file-indicator')).toBeVisible({
			timeout: 1000,
		})
	})

	test('session-time indicator reappears after acknowledgement expires', async ({
		page,
		homePage,
	}) => {
		await page.clock.install({ time: 0 })
		await page.reload()
		await homePage.isLoaded()

		await page.clock.fastForward(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)
		await expect(page.getByTestId('tldraw-session-time-indicator')).toBeVisible({
			timeout: 1000,
		})

		await page.getByTestId('tldraw-session-time-indicator').click()
		await page.getByRole('button', { name: 'Got it' }).click()
		await expect(page.getByTestId('tldraw-session-time-indicator')).not.toBeVisible()

		// Advance past acknowledgement expiry and next interval
		await page.clock.fastForward(ACKNOWLEDGEMENT_EXPIRY_MS + CHECK_INTERVAL_MS + 1)

		await expect(page.getByTestId('tldraw-session-time-indicator')).toBeVisible({
			timeout: 1000,
		})
	})
})

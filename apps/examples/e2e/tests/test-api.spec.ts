import test from '../fixtures/fixtures'
import { hardResetWithShapes, setupWithShapes } from '../shared-e2e'

test.beforeEach(async ({ page, context }) => {
	const url = page.url()
	if (!url.includes('end-to-end')) {
		await setupWithShapes({ page, context } as any)
	} else {
		await hardResetWithShapes(page)
	}
})

test.describe('api', () => {
	for (const format of ['svg', 'png', 'jpeg', 'webp'] as const) {
		test(`export as ${format}`, async ({ page, api }) => {
			const downloadEvent = page.waitForEvent('download')
			await api.exportAsFormat(format)
			await downloadEvent
		})
	}
})

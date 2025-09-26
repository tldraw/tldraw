import test from '../fixtures/fixtures'
import { setupWithShapes } from '../shared-e2e'

test.beforeEach(setupWithShapes)

test.describe('api', () => {
	for (const format of ['svg', 'png', 'jpeg', 'webp'] as const) {
		test(`export as ${format}`, async ({ page, api }) => {
			const downloadEvent = page.waitForEvent('download')
			await api.exportAsFormat(format)
			await downloadEvent
		})
	}
})

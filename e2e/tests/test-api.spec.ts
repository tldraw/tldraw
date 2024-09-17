import { setupWithShapes } from '../shared-e2e'
import test from './fixtures/fixtures'

test.beforeEach(setupWithShapes)

test.describe('api', () => {
	for (const format of ['svg', 'png', 'jpeg', 'webp', 'json'] as const) {
		test(`export as ${format}`, async ({ page, api }) => {
			const downloadEvent = page.waitForEvent('download')
			await api.exportAsFormat(format)
			await downloadEvent
		})
	}
})

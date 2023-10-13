import test from '@playwright/test'
import { setup } from '../shared-e2e'

test.describe('ui', () => {
	test.beforeEach(setup)

	test('mobile style panel opens and closes when tapped', async ({ isMobile }) => {
		test.skip(!isMobile, 'only run on mobile')
	})
})

import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('page menu', () => {
	test.beforeEach(setup)

	test('you can open and close the page menu', async ({ pageMenu }) => {
		const { pagemenuButton, header } = pageMenu
		await expect(header).toBeHidden()
		await pagemenuButton.click()
		await expect(header).toBeVisible()
		await pagemenuButton.click()
		await expect(header).toBeHidden()
	})

	// ...
	// More tests here
	// ...
})

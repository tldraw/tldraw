import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('actions menu', () => {
	test.beforeEach(setup)

	test('you can open and close the actions menu', async ({ actionsMenu }) => {
		const { actionsMenuButton, actionsMenuContent } = actionsMenu
		await expect(actionsMenuContent).toBeHidden()
		await actionsMenuButton.click()
		await expect(actionsMenuContent).toBeVisible()
		await actionsMenuButton.click()
		await expect(actionsMenuContent).toBeHidden()
	})

	// ...
	// More tests here
	// ...
})

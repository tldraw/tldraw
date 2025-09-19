import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { setup } from '../shared-e2e'

test.describe('actions menu', () => {
	test.beforeEach(setup)

	test('you can open and close the actions menu', async ({ actionsMenu, menuClickCapture }) => {
		const { actionsMenuButton, actionsMenuContent } = actionsMenu
		await expect(actionsMenuContent).toBeHidden()
		await actionsMenuButton.click()
		await expect(actionsMenuContent).toBeVisible()
		await menuClickCapture.content.click()
		await expect(actionsMenuContent).toBeHidden()
	})

	// ...
	// More tests here
	// ...
})

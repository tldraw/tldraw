import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('help menu', () => {
	test.beforeEach(setup)

	test('you can open and close the menus', async ({ helpMenu, isMobile }) => {
		// No help menu on mobile

		const { helpMenuButton, languagesButton, keyboardShortcutsMenu, languagesContent } = helpMenu

		test.skip(isMobile, 'only run on desktop')
		await test.step('open help menu', async () => {
			await expect(languagesButton).toBeHidden()
			await expect(keyboardShortcutsMenu.button).toBeHidden()
			await helpMenuButton.click()
			await expect(languagesButton).toBeVisible()
			await expect(keyboardShortcutsMenu.button).toBeVisible()
		})
		await test.step('hover languages submenu', async () => {
			await expect(languagesContent).toBeHidden()
			await languagesButton.hover()
			await expect(languagesContent).toBeVisible()
		})
		await test.step('open the keyboard shortcuts menu', async () => {
			await expect(keyboardShortcutsMenu.heading).toBeHidden()
			await keyboardShortcutsMenu.button.click()
			await expect(keyboardShortcutsMenu.heading).toBeVisible()
		})
		await test.step('close the keyboard shortcuts menu', async () => {
			await keyboardShortcutsMenu.closeButton.click()
			await expect(keyboardShortcutsMenu.heading).toBeHidden()
			await expect(languagesButton).toBeHidden()
		})
	})

	// ...
	// More tests here
	// ...
})

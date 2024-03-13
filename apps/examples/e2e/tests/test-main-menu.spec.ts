import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('help menu', () => {
	test.beforeEach(setup)

	test('you can open and close the menu', async ({ mainMenu, page }) => {
		const { mainMenuButton, buttons } = mainMenu
		const { editSubmenu, viewSubmenu, preferencesSubmenu } = mainMenu.subMenus
		const submenus = [
			{ name: 'preferences', submenu: preferencesSubmenu, button: buttons.preferences },
			{ name: 'view', submenu: viewSubmenu, button: buttons.view },
			{ name: 'edit', submenu: editSubmenu, button: buttons.edit },
		]

		await test.step('open main menu', async () => {
			await expect(buttons.edit).toBeHidden()
			await mainMenuButton.click()
			await expect(buttons.edit).toBeVisible()
		})
		for (const submenu of submenus) {
			await test.step(`hovering opens ${submenu.name} submenu`, async () => {
				await expect(submenu.submenu[0]).toBeHidden()
				await submenu.button.hover()
				await expect(submenu.submenu[0]).toBeVisible()
			})
		}
		await test.step('close main menu', async () => {
			// close the menu by clicking the main menu button again
			await mainMenuButton.click()
			await expect(buttons.edit).toBeHidden()
			// open the menu again
			await mainMenuButton.click()
			// click somewhere on the canvas to close the menu
			await page.mouse.click(250, 150)
			await expect(buttons.edit).toBeHidden()
		})
	})

	// ...
	// More tests here
	// ...
})

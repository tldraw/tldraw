import { expectBeforeAndAfterReload, getRandomName, sleep } from '../../fixtures/helpers'
import { expect, test } from '../../fixtures/tla-test'

test.beforeEach(async ({ editor }) => {
	await editor.isLoaded()
})

test('can instantiate', async ({ page }) => {
	const dialogCloseButton = page.getByTestId('dialog.close')
	// expect this button not to be present; ie that the dialog is not open
	await expect(dialogCloseButton).not.toBeVisible()
})

test.describe('preferences', () => {
	test('can toggle dark mode', async ({ page, editor, sidebar }) => {
		await test.step('is light mode by default', async () => {
			await expect(page.locator('div.tla-theme__light.tl-theme__light')).toBeVisible()
			await expect(page.locator('div.tla-theme__dark.tl-theme__dark')).not.toBeVisible()
			await expect(page.locator('div.tl-background')).toHaveCSS(
				'background-color',
				'rgb(249, 250, 251)'
			)
			await expect(page.locator('div.tla-theme-container')).toHaveCSS(
				'background-color',
				'rgb(252, 252, 252)'
			)
		})
		await test.step('can toggle dark mode', async () => {
			await editor.ensureSidebarOpen()
			await sidebar.setDarkMode()
		})
		await test.step('is dark mode', async () => {
			await expectBeforeAndAfterReload(async () => {
				await expect(page.locator('div.tla-theme__light.tl-theme__light')).not.toBeVisible()
				await expect(page.locator('div.tla-theme__dark.tl-theme__dark')).toBeVisible()
				await expect(page.locator('div.tl-background')).toHaveCSS(
					'background-color',
					'rgb(16, 16, 17)'
				)
				await expect(page.locator('div.tla-theme-container')).toHaveCSS(
					'background-color',
					'rgb(13, 13, 13)'
				)
			}, page)
		})
	})

	test('can change language', async ({ sidebar, page, editor }) => {
		await editor.ensureSidebarOpen()
		await test.step('English by default', async () => {
			await sidebar.expectLanguageToBe('Language', 'English')
		})
		await sidebar.closeAccountMenu()
		await test.step('change language', async () => {
			await sidebar.setLanguage('Language', 'Français')
		})

		await test.step('changed to French', async () => {
			await sidebar.expectLanguageToBe('Langue', 'Français')
			await editor.openPageMenu()
			// Make sure the file / page menu is using the correct language
			await expect(page.getByText('Charger un média')).toBeVisible()
		})
	})
})

test.describe('sidebar actions', () => {
	test('can pin a file from the file menu', async ({ page, editor, sidebar }) => {
		// Create two files so that there are three
		await editor.ensureSidebarOpen()
		await sidebar.createNewDocument()
		await sleep(1000)
		await sidebar.createNewDocument()

		expect(await sidebar.getNumberOfFiles()).toBe(3)

		// Name the files
		const fileName0 = getRandomName()
		await sidebar.renameFile(0, fileName0)

		const fileName1 = getRandomName()
		await sidebar.renameFile(1, fileName1)

		const fileName2 = getRandomName()
		await sidebar.renameFile(2, fileName2)

		// The pinned files are also sorted by recency (though not grouped by time)
		// When we pin a file, we expect that it will move to the pinned files section
		// but that the order of the pinned files will be the same as the order of the files

		// Pin the second-most recent file...
		await sidebar.pinFromFileMenu(1)

		// And expect it to the the first (and only) pinned file
		await expectBeforeAndAfterReload(async () => {
			await expect(async () => {
				await expect(
					page.getByTestId('tla-file-link-pinned-0').getByText(fileName1, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-0').getByText(fileName0, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-1').getByText(fileName2, { exact: true })
				).toBeVisible()
			}).toPass()
		}, page)

		// Now we pin the most recent file...
		await sidebar.pinFromFileMenu(0)

		// And expect it to the first pinned file
		await expectBeforeAndAfterReload(async () => {
			await expect(async () => {
				await expect(
					page.getByTestId('tla-file-link-pinned-0').getByText(fileName0, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-pinned-1').getByText(fileName1, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-0').getByText(fileName2, { exact: true })
				).toBeVisible()
			}).toPass()
		}, page)

		// Now we unpin the most recent file...
		await sidebar.unpinFromFileMenu(0)

		await expectBeforeAndAfterReload(async () => {
			await expect(async () => {
				await expect(
					page.getByTestId('tla-file-link-pinned-0').getByText(fileName1, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-0').getByText(fileName0, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-1').getByText(fileName2, { exact: true })
				).toBeVisible()
			}).toPass()
		}, page)
	})
})

// Menu bar

test('can rename a file name by clicking the name', async ({ editor, sidebar, page }) => {
	const originalName = await editor.getCurrentFileName()
	const newName = getRandomName()
	await expect(async () => {
		await sidebar.expectToContainText(originalName)
		await sidebar.expectNotToContainText(newName)
	}).toPass()

	await editor.rename(newName)

	await expectBeforeAndAfterReload(async () => {
		await sidebar.expectToContainText(newName)
		await sidebar.expectNotToContainText(originalName)
	}, page)
})

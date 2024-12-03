import { Locator } from '@playwright/test'
import { areUrlsEqual, getRandomName } from '../fixtures/helpers'
import { expect, expectBeforeAndAfterReload, test } from '../fixtures/tla-test'

test('can toggle sidebar', async ({ editor, sidebar }) => {
	await editor.ensureSidebarClosed()
	await expect(sidebar.sidebarLogo).not.toBeInViewport()
	await editor.toggleSidebar()
	await expect(sidebar.sidebarLogo).toBeInViewport()
})

test('can create new file', async ({ editor, sidebar, page }) => {
	await editor.ensureSidebarOpen()
	const currentCount = await sidebar.getNumberOfFiles()
	await sidebar.createNewDocument()
	await expectBeforeAndAfterReload(async () => {
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(currentCount + 1)
	}, page)
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
	test('rename the document via double click', async ({ sidebar, page }) => {
		let fileLink: Locator
		const currentName = await sidebar.getFirstFileName()
		await test.step('get the current file name', async () => {
			fileLink = sidebar.getFirstFileLink()
			await expect(fileLink).toBeVisible()
		})

		const newName = getRandomName()
		await test.step('change the name', async () => {
			await fileLink.dblclick()
			const input = page.getByRole('textbox')
			await input?.fill(newName)
			await page.keyboard.press('Enter')
		})

		await test.step('verify the name change', async () => {
			await expectBeforeAndAfterReload(async () => {
				const newFileText = await sidebar.getFirstFileName()
				expect(newFileText).toBe(newName)
				await expect(page.getByText(currentName)).not.toBeVisible()
			}, page)
		})
	})

	test('rename the document via file menu', async ({ sidebar, page }) => {
		const currentName = await sidebar.getFirstFileName()
		const newName = getRandomName()
		await sidebar.renameFile(0, newName)
		await expectBeforeAndAfterReload(async () => {
			expect(await sidebar.getFirstFileName()).toBe(newName)
			await expect(sidebar.sidebar.getByText(currentName)).not.toBeVisible()
		}, page)
	})

	test('delete the document via the file menu', async ({ sidebar, deleteFileDialog, page }) => {
		const url = page.url()
		const current = 'delete me'
		await test.step('rename the file', async () => {
			await sidebar.renameFile(0, current)
		})

		await test.step('delete the file', async () => {
			await sidebar.deleteFile(0)
			await deleteFileDialog.expectIsVisible()
			await deleteFileDialog.confirmDeletion()
			await deleteFileDialog.expectIsNotVisible()
		})

		await test.step('verify the file is deleted', async () => {
			await expectBeforeAndAfterReload(async () => {
				await expect(page.getByText(current)).not.toBeVisible()
			}, page)
			await page.goto(url)
			await expect(() => async () => {
				await expect(page.getByText('Not found')).toBeVisible()
			}).toPass()
		})
	})

	test('duplicate the document via the file menu', async ({ page, sidebar }) => {
		const fileName = getRandomName()
		expect(await sidebar.getNumberOfFiles()).toBe(1)
		await sidebar.renameFile(0, fileName)
		await sidebar.duplicateFile(0)
		await expectBeforeAndAfterReload(async () => {
			await expect(async () => {
				await expect(
					page.getByTestId('tla-file-link-today-0').getByText(`${fileName} 1`, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-1').getByText(fileName, { exact: true })
				).toBeVisible()
				expect(await sidebar.getNumberOfFiles()).toBe(2)
			}).toPass()
		}, page)
	})

	test('can copy a file link from the file menu', async ({ page, context, sidebar }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		const url = page.url()
		const copiedUrl = await sidebar.copyFileLink(0)

		expect(areUrlsEqual(url, copiedUrl)).toBe(true)
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

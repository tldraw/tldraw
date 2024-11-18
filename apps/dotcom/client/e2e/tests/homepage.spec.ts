import { Locator } from '@playwright/test'
import { areUrlsEqual } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test('can toggle sidebar', async ({ editor, sidebar }) => {
	await editor.ensureSidebarClosed()
	await expect(sidebar.sidebarLogo).not.toBeVisible()
	await editor.toggleSidebar()
	await expect(sidebar.sidebarLogo).toBeVisible()
})

test('can create new file', async ({ editor, sidebar }) => {
	await editor.ensureSidebarOpen()
	const currentCount = await sidebar.getNumberOfFiles()
	await sidebar.createNewDocument()
	const newCount = await sidebar.getNumberOfFiles()
	expect(newCount).toBe(currentCount + 1)
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
		await page.pause()
		const currentName = await sidebar.getFirstFileName()
		await test.step('get the current file name', async () => {
			fileLink = sidebar.getFirstFileLink()
			await expect(fileLink).toBeVisible()
		})

		const newName = Math.random().toString(36).substring(7)
		await test.step('change the name', async () => {
			await fileLink.dblclick()
			const input = page.getByRole('textbox')
			await input?.fill(newName)
			await page.keyboard.press('Enter')
		})

		await test.step('verify the name change', async () => {
			const newFileText = await sidebar.getFirstFileName()
			expect(newFileText).toBe(newName)
			await expect(page.getByText(currentName)).not.toBeVisible()
		})
	})

	test('rename the document via file menu', async ({ sidebar }) => {
		const currentName = await sidebar.getFirstFileName()
		const newName = Math.random().toString(36).substring(7)
		await sidebar.renameFile(0, newName)
		expect(await sidebar.getFirstFileName()).toBe(newName)
		await expect(sidebar.sidebar.getByText(currentName)).not.toBeVisible()
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
			await expect(page.getByText(current)).not.toBeVisible()
			await page.goto(url)
			await expect(page.getByText('Not found')).toBeVisible()
		})
	})

	test('duplicate the document via the file menu', async ({ page, sidebar }) => {
		const fileName = Math.random().toString(36).substring(7)
		expect(await sidebar.getNumberOfFiles()).toBe(1)
		await sidebar.renameFile(0, fileName)
		await sidebar.duplicateFile(0)
		await expect(async () => {
			await expect(
				page.getByTestId('tla-file-name-0').getByText(`${fileName} Copy`, { exact: true })
			).toBeVisible()
			await expect(
				page.getByTestId('tla-file-name-1').getByText(fileName, { exact: true })
			).toBeVisible()
		}).toPass()
		expect(await sidebar.getNumberOfFiles()).toBe(2)
	})

	test('can copy a file link from the file menu', async ({ page, context, sidebar }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		const url = page.url()
		const copiedUrl = await sidebar.copyFileLink(0)

		expect(areUrlsEqual(url, copiedUrl)).toBe(true)
	})
})

// Menu bar

test('can rename a file name by clicking the name', async ({ editor, sidebar }) => {
	const originalName = await editor.getCurrentFileName()
	const newName = Math.random().toString(36).substring(7)
	await expect(async () => {
		await sidebar.expectToContainText(originalName)
		await sidebar.expectNotToContainText(newName)
	}).toPass()

	await editor.rename(newName)

	await expect(async () => {
		await sidebar.expectToContainText(newName)
		await sidebar.expectNotToContainText(originalName)
	}).toPass()
})

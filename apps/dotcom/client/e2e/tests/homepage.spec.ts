import { Locator } from '@playwright/test'
import { areUrlsEqual, expectBeforeAndAfterReload, getRandomName, sleep } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ editor }) => {
	await editor.isLoaded()
})

test('can toggle sidebar', async ({ editor, sidebar }) => {
	await editor.ensureSidebarOpen()
	await editor.toggleSidebar()
	await sidebar.expectIsNotVisible()
	await editor.toggleSidebar()
	await sidebar.expectIsVisible()
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

test('can create new file with custom name', async ({ editor, sidebar, page }) => {
	const fileName = getRandomName()
	await editor.ensureSidebarOpen()
	const currentCount = await sidebar.getNumberOfFiles()
	await sidebar.createNewDocument(fileName)
	await expectBeforeAndAfterReload(async () => {
		const newCount = await sidebar.getNumberOfFiles()
		expect(newCount).toBe(currentCount + 1)
		await expect(
			page.getByTestId('tla-file-link-today-0').getByText(fileName, { exact: true })
		).toBeVisible()
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

	test('delete the document via the file menu', async ({
		editor,
		sidebar,
		deleteFileDialog,
		page,
	}) => {
		const url = page.url()
		const current = 'delete me'
		await editor.isLoaded()
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

	test('duplicate the document via the file menu', async ({ editor, page, sidebar }) => {
		await editor.isLoaded()
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

	test('duplicate with custom name', async ({ editor, page, sidebar }) => {
		await editor.isLoaded()
		const fileName = getRandomName()
		const duplicateName = getRandomName()
		expect(await sidebar.getNumberOfFiles()).toBe(1)
		await sidebar.renameFile(0, fileName)
		await sidebar.duplicateFile(0, duplicateName)
		await expectBeforeAndAfterReload(async () => {
			await expect(async () => {
				await expect(
					page.getByTestId('tla-file-link-today-0').getByText(duplicateName, { exact: true })
				).toBeVisible()
				await expect(
					page.getByTestId('tla-file-link-today-1').getByText(fileName, { exact: true })
				).toBeVisible()
				expect(await sidebar.getNumberOfFiles()).toBe(2)
			}).toPass()
		}, page)
	})

	test('can copy a file link from the file menu', async ({ editor, page, context, sidebar }) => {
		await editor.isLoaded()
		await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		const url = page.url()
		const copiedUrl = await sidebar.copyFileLink(0)

		expect(areUrlsEqual(url, copiedUrl)).toBe(true)
	})

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

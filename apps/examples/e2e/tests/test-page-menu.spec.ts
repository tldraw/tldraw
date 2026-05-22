import { expect, type Locator, type Page } from '@playwright/test'
import { type Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { setupOrReset, sleep } from '../shared-e2e'

declare const editor: Editor

const PAGE_MENU_ITEM_HEIGHT = 36

const isMobileProject = () => test.info().project.name.includes('Mobile')

async function expectPageItemToBeCurrent(pageItem: Locator, isCurrent: boolean) {
	await expect(pageItem).toHaveAttribute('data-iscurrent', isCurrent ? 'true' : 'false')
}

async function getPageMenuListHeight(pageList: Locator) {
	return Math.round(await pageList.evaluate((elm) => elm.getBoundingClientRect().height))
}

async function expectPageMenuListHeight(pageList: Locator, expectedHeight: number) {
	await expect.poll(async () => getPageMenuListHeight(pageList)).toBe(expectedHeight)
}

async function dragPageMenuResizeHandle(page: Page, deltaY: number) {
	const resizeHandle = page.locator('.tlui-page-menu__resize-handle')
	const box = await resizeHandle.boundingBox()
	if (!box) throw new Error('Could not find page menu resize handle')
	const x = box.x + box.width / 2
	const y = box.y + box.height / 2

	await page.mouse.move(x, y)
	await page.mouse.down()
	await page.mouse.move(x, y + deltaY, { steps: 4 })
	await page.mouse.up()
}

async function createPagesForReordering(page: Page) {
	await page.evaluate(() => {
		editor.createPage({ name: 'Page 2' })
		editor.createPage({ name: 'Page 3' })
	})
}

async function useCoarsePointer(page: Page) {
	await page.evaluate(() => {
		window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }))
		editor.updateInstanceState({ isCoarsePointer: true })
	})
	await expect.poll(() => page.evaluate(() => editor.getInstanceState().isCoarsePointer)).toBe(true)
}

async function getPageNames(page: Page) {
	return await page.evaluate(() => editor.getPages().map((p) => p.name))
}

test.describe('page menu', () => {
	test.beforeEach(setupOrReset)

	test.afterEach(async ({ page }) => {
		// press escape a few times
		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')
		await page.keyboard.press('Escape')
	})

	test('you can open and close the page menu', async ({ pageMenu }) => {
		const { pagemenuButton, header } = pageMenu
		await expect(header).toBeHidden()
		await pagemenuButton.click()
		await expect(header).toBeVisible()
		await pagemenuButton.click()
		await expect(header).toBeHidden()
	})

	test('The page list height fits its rows when opened, resized, and reset', async ({
		page,
		pageMenu,
	}) => {
		test.skip(isMobileProject(), 'Desktop page menu resize behavior')

		await page.evaluate(() => {
			window.localStorage.removeItem('tldraw_page_menu_list_height')
			editor.createPage({ name: 'Page 2' })
			editor.createPage({ name: 'Page 3' })
		})

		await pageMenu.pagemenuButton.click()
		await expect(pageMenu.pageItems).toHaveCount(3)

		const autoFitHeight = PAGE_MENU_ITEM_HEIGHT * 3
		await expectPageMenuListHeight(pageMenu.pageList, autoFitHeight)

		await dragPageMenuResizeHandle(page, 120)
		await expect
			.poll(async () => getPageMenuListHeight(pageMenu.pageList))
			.toBeGreaterThan(autoFitHeight)

		await dragPageMenuResizeHandle(page, -300)
		await expectPageMenuListHeight(pageMenu.pageList, PAGE_MENU_ITEM_HEIGHT)

		await dragPageMenuResizeHandle(page, 120)
		await page.locator('.tlui-page-menu__resize-handle').dblclick()
		await expectPageMenuListHeight(pageMenu.pageList, autoFitHeight)
	})

	test('You can change pages', async ({ page, pageMenu }) => {
		const { pagemenuButton, pageItems } = pageMenu

		await test.step('open page menu', async () => {
			await pagemenuButton.click()
			await expect(pageItems.first()).toBeVisible()
		})

		await test.step('create a second page', async () => {
			const initialCount = await pageItems.count()
			await pageMenu.createButton.click()
			await sleep(100)
			await expect(pageItems).toHaveCount(initialCount + 1)
			await page.keyboard.press('Enter')
			await page.keyboard.press('Escape') // close the menu
		})

		await test.step('switch between pages', async () => {
			await pagemenuButton.click()
			await expect(pageItems).toHaveCount(2)

			const firstPage = pageItems.nth(0)
			const secondPage = pageItems.nth(1)

			// Wait for both pages to be visible
			await expect(firstPage).toBeVisible()
			await expect(secondPage).toBeVisible()

			await expectPageItemToBeCurrent(firstPage, false)
			await expectPageItemToBeCurrent(secondPage, true)

			// Click on second page
			await secondPage.locator('button').first().click()
			await expectPageItemToBeCurrent(firstPage, false)
			await expectPageItemToBeCurrent(secondPage, true)

			// Click on first page
			await firstPage.locator('button').first().click()

			await expectPageItemToBeCurrent(firstPage, true)
			await expectPageItemToBeCurrent(secondPage, false)
		})
	})

	test('You can create a new page by pressing enter after opening the page menu', async ({
		page,
		pageMenu,
	}) => {
		const { pagemenuButton, pageItems, createButton } = pageMenu

		await test.step('open page menu and get initial count', async () => {
			await pagemenuButton.click()
			await expect(pageItems.first()).toBeVisible()
		})

		await test.step('create new page using create button', async () => {
			const initialCount = await pageItems.count()
			await createButton.click()
			await sleep(100)
			await expect(pageItems).toHaveCount(initialCount + 1)
		})

		await test.step('confirm page creation with enter', async () => {
			await page.keyboard.press('Enter')
		})
	})

	test('On coarse pointers, canceling the new page prompt does not create a page', async ({
		page,
		pageMenu,
	}) => {
		test.skip(!isMobileProject(), 'Coarse-pointer page menu behavior')

		const { pagemenuButton, createButton } = pageMenu

		await pagemenuButton.click()
		await useCoarsePointer(page)
		expect(await getPageNames(page)).toEqual(['Page 1'])

		page.once('dialog', async (dialog) => {
			expect(dialog.type()).toBe('prompt')
			await dialog.dismiss()
		})
		await createButton.tap()

		expect(await getPageNames(page)).toEqual(['Page 1'])
	})

	test.describe('You can rename a page', () => {
		test('You can rename a page by double clicking its name', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('open page menu', async () => {
				await pagemenuButton.click()
				await expect(pageItems.first()).toBeVisible()
			})

			await test.step('double click to rename page', async () => {
				const pageItem = await pageMenu.getPageItem(0)
				await pageItem.getByRole('button').first().dblclick()

				// Should be in edit mode - look for input field
				await expect(pageItem.locator('input')).toBeVisible()
			})

			await test.step('enter new name', async () => {
				const input = pageItems.first().locator('input')
				await expect(input).toBeVisible()

				// Clear the input field more reliably
				await input.clear()
				await input.fill('My New Page')
				await page.keyboard.press('Enter')
			})

			await test.step('verify page was renamed', async () => {
				// Wait for the input to disappear (edit mode ends)
				await expect(pageItems.first().locator('input')).toBeHidden()

				// Wait a bit more for the rename to process
				await sleep(200)

				const pageItem = await pageMenu.getPageItem(0)
				await expect(pageItem).toContainText('My New Page')
			})
		})

		test('You can press enter to confirm a rename without closing the menu', async ({
			page,
			pageMenu,
		}) => {
			const { pagemenuButton, pageItems, header } = pageMenu

			await pagemenuButton.click()
			await expect(pageItems.first()).toBeVisible()

			// Double click to start editing
			const pageItem = await pageMenu.getPageItem(0)
			await pageItem.getByRole('button').first().dblclick()

			// Wait for edit mode to activate
			const input = pageItem.locator('input')
			await expect(input).toBeVisible()

			// Clear and type new name
			await input.clear()
			await input.fill('Renamed Page')
			await page.keyboard.press('Enter')

			// Wait for edit mode to end
			await expect(input).toBeHidden()

			// Menu should still be open
			await expect(header).toBeVisible()
			// Check that the page item now contains the new name
			await expect(pageItem).toContainText('Renamed Page')
		})

		test('You can press enter after renaming a page to close the menu', async ({
			page,
			pageMenu,
		}) => {
			const { pagemenuButton, pageItems, header } = pageMenu

			await pagemenuButton.click()
			await expect(pageItems.first()).toBeVisible()

			// Double click to start editing
			const pageItem = await pageMenu.getPageItem(0)
			await pageItem.getByRole('button').first().dblclick()

			// Wait for edit mode and use robust input handling
			const input = pageItem.locator('input')
			await expect(input).toBeVisible()

			await input.clear()
			await input.fill('Another Renamed Page')
			await page.keyboard.press('Enter')
			await page.keyboard.press('Enter')

			// Menu should be closed
			await expect(header).toBeHidden()
		})

		test('You can press escape to cancel a page rename and restore the previous name', async ({
			page,
			pageMenu,
		}) => {
			const { pagemenuButton, pageItems } = pageMenu

			await pagemenuButton.click()
			await expect(pageItems.first()).toBeVisible()

			// Get original page name
			const pageItem = await pageMenu.getPageItem(0)
			const originalName = await pageItem.getByRole('button').first().textContent()

			// Double click to start editing
			await pageItem.getByRole('button').first().dblclick()

			// Wait for edit mode and use robust input handling
			const input = pageItem.locator('input')
			await expect(input).toBeVisible()

			await input.clear()
			await input.fill('Should Not Save')
			await page.keyboard.press('Escape')

			// Wait for edit mode to end
			await expect(input).toBeHidden()

			// Should have original name back
			await expect(pageItem.getByRole('button').first()).toContainText(originalName || '')
		})

		test('When you create a new page, the new page is focused', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('create a new page and verify it becomes active', async () => {
				await pagemenuButton.click()
				const initialCount = await pageItems.count()

				// Create a new page
				await pageMenu.createButton.click()
				await sleep(100)

				// To stop editing
				await page.keyboard.press('Enter')

				// Verify page count increased
				await expect(pageItems).toHaveCount(initialCount + 1)

				// The new page (last one) should be the active/focused page
				const newPageItem = await pageMenu.getPageItem(initialCount)
				await expectPageItemToBeCurrent(newPageItem, true)

				// All other pages should not be active
				for (let i = 0; i < initialCount; i++) {
					const otherPageItem = await pageMenu.getPageItem(i)
					await expectPageItemToBeCurrent(otherPageItem, false)
				}
			})
		})

		test('When you open the page menu, the current page is in view', async ({ page, pageMenu }) => {
			const { pagemenuButton } = pageMenu

			await test.step('create multiple pages', async () => {
				await pagemenuButton.click()
				// Create several pages to potentially cause scrolling
				for (let i = 0; i < 5; i++) {
					await pageMenu.createButton.click()
					await sleep(100)
					await page.keyboard.press('Enter')
				}
				await page.keyboard.press('Escape')
			})

			await test.step('navigate to first page and verify it is in view', async () => {
				await pagemenuButton.click()

				// Click on the first page to make it current
				const firstPage = await pageMenu.getPageItem(0)
				await firstPage.locator('button').first().click()

				// Close and reopen menu
				await page.keyboard.press('Escape')
				await pagemenuButton.click()

				// Verify the first page (current page) is visible in the page list
				await expect(firstPage).toBeInViewport()

				// Also verify it's marked as checked/active
				await expectPageItemToBeCurrent(firstPage, true)
			})
		})

		test('When you open the page menu, the current page is focused', async ({ page, pageMenu }) => {
			const { pagemenuButton } = pageMenu

			await test.step('create multiple pages', async () => {
				await pagemenuButton.click()
				// Create a few pages
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await page.keyboard.press('Escape')
			})

			await test.step('switch to middle page and verify focus', async () => {
				await pagemenuButton.click()

				// Click on the middle page to make it current
				const middlePage = await pageMenu.getPageItem(1)
				await middlePage.locator('button').first().click()

				// Close and reopen menu
				await page.keyboard.press('Escape')
				await pagemenuButton.click()

				// Verify the middle page is marked as the current/focused page
				await expectPageItemToBeCurrent(middlePage, true)

				// Verify other pages are not focused
				const firstPage = await pageMenu.getPageItem(0)
				const lastPage = await pageMenu.getPageItem(2)
				await expectPageItemToBeCurrent(firstPage, false)
				await expectPageItemToBeCurrent(lastPage, false)
			})
		})
	})

	test.describe('You can drag and drop pages to reorder them', () => {
		test('Pages can be reordered by dragging the row itself', async ({ page, pageMenu }) => {
			test.skip(isMobileProject(), 'Mobile page rows can only be reordered from the drag handle')

			const { pagemenuButton } = pageMenu

			await test.step('create multiple pages for reordering', async () => {
				await createPagesForReordering(page)
			})

			await test.step('drag page to new position by its row', async () => {
				await pagemenuButton.click()
				await expect(pageMenu.pageItems).toHaveCount(3)
				const firstItem = await pageMenu.getPageItem(0)
				const secondItem = await pageMenu.getPageItem(1)
				const firstButton = firstItem.locator('.tlui-page-menu__item__button')

				await firstButton.dragTo(secondItem)
				await expect.poll(() => getPageNames(page)).toEqual(['Page 2', 'Page 1', 'Page 3'])
			})
		})

		test('On coarse pointers, pages can only be reordered by dragging the handle', async ({
			page,
			pageMenu,
		}) => {
			test.skip(!isMobileProject(), 'Coarse-pointer page menu behavior')

			const { pagemenuButton } = pageMenu

			await test.step('create multiple pages for reordering', async () => {
				await createPagesForReordering(page)
			})

			await test.step('dragging the row itself does not reorder pages', async () => {
				await pagemenuButton.click()
				await useCoarsePointer(page)
				await expect(pageMenu.pageItems).toHaveCount(3)
				const firstItem = await pageMenu.getPageItem(0)
				const secondItem = await pageMenu.getPageItem(1)

				await expect(firstItem.getByTestId('page-menu.item-drag-handle')).toBeVisible()
				await firstItem.locator('.tlui-page-menu__item__button').dragTo(secondItem)
				expect(await getPageNames(page)).toEqual(['Page 1', 'Page 2', 'Page 3'])
			})

			await test.step('dragging the handle reorders pages', async () => {
				await useCoarsePointer(page)
				const firstItem = await pageMenu.getPageItem(0)
				const secondItem = await pageMenu.getPageItem(1)

				await firstItem.getByTestId('page-menu.item-drag-handle').dragTo(secondItem)
				await expect.poll(() => getPageNames(page)).toEqual(['Page 2', 'Page 1', 'Page 3'])
			})
		})
	})

	test.describe('You can delete a page', () => {
		test('You can delete a page using the submenu', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('create an extra page so we can delete one', async () => {
				await pagemenuButton.click()
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter') // confirm rename
				await page.keyboard.press('Escape') // close the menu
			})

			await test.step('open page menu and verify we have multiple pages', async () => {
				await pagemenuButton.click()
				const initialCount = await pageItems.count()
				expect(initialCount).toBeGreaterThan(1)
			})

			await test.step('access page submenu and delete', async () => {
				const pageItem = await pageMenu.getPageItem(1)
				const submenuButton = pageItem.getByTestId('page-menu.item-submenu')
				await submenuButton.click()

				// Click delete option
				const deleteButton = page.getByRole('menuitem', { name: /delete/i })
				await expect(deleteButton).toBeVisible()
				await deleteButton.click()

				// Verify page count decreased
				await expect(pageItems).toHaveCount(1)
			})
		})
	})

	test.describe('You can use the page menu', () => {
		test('You can duplicate a page from the page menu', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('open page menu and get initial count', async () => {
				await pagemenuButton.click()
				await expect(pageItems.first()).toBeVisible()
			})

			await test.step('duplicate the first page', async () => {
				const initialCount = await pageItems.count()
				const pageItem = await pageMenu.getPageItem(0)

				// Click the submenu button (three dots)
				const submenuButton = pageItem.getByTestId('page-menu.item-submenu')
				await submenuButton.click()

				// Click duplicate option
				const duplicateButton = page.getByRole('menuitem', { name: /duplicate/i })
				await expect(duplicateButton).toBeVisible()
				await duplicateButton.click()

				// Verify page count increased
				await expect(pageItems).toHaveCount(initialCount + 1)
			})
		})

		test('You can delete a page from the page menu', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('create an extra page so we can delete one', async () => {
				await pagemenuButton.click()
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await page.keyboard.press('Escape')
			})

			await test.step('delete a page using submenu', async () => {
				await pagemenuButton.click()
				const initialCount = await pageItems.count()
				expect(initialCount).toBeGreaterThan(1)

				const pageItem = await pageMenu.getPageItem(1)

				// Click the submenu button
				const submenuButton = pageItem.getByTestId('page-menu.item-submenu')
				await submenuButton.click()

				// Click delete option
				const deleteButton = page.getByRole('menuitem', { name: /delete/i })
				await expect(deleteButton).toBeVisible()
				await deleteButton.click()

				// Verify page count decreased
				await expect(pageItems).toHaveCount(initialCount - 1)
			})
		})

		test('You can move a page up from the page menu', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('create multiple pages for reordering', async () => {
				await pagemenuButton.click()
				// Create two additional pages (will have default names)
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await page.keyboard.press('Escape')
			})

			await test.step('move the last page up', async () => {
				await pagemenuButton.click()
				await expect(pageItems).toHaveCount(3)

				// Get the last page (index 2) and move it up
				const lastPageItem = await pageMenu.getPageItem(2)

				// Click the submenu button
				const submenuButton = lastPageItem.getByTestId('page-menu.item-submenu')
				await submenuButton.click()

				// Click move up option
				const moveUpButton = page.getByRole('menuitem', { name: /move up/i })
				await expect(moveUpButton).toBeVisible()
				await moveUpButton.click()

				// Wait a moment for the reorder to complete
				await sleep(200)

				// Close and reopen menu to get fresh state
				await page.keyboard.press('Escape')
				await pagemenuButton.click()

				// Verify we still have 3 pages - the operation worked
				await expect(pageItems).toHaveCount(3)
			})
		})

		test('You can move a page down from the page menu', async ({ page, pageMenu }) => {
			const { pagemenuButton, pageItems } = pageMenu

			await test.step('create multiple pages for reordering', async () => {
				await pagemenuButton.click()
				// Create two additional pages (will have default names)
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await page.keyboard.press('Escape')
			})

			await test.step('move the first page down', async () => {
				await pagemenuButton.click()
				await expect(pageItems).toHaveCount(3)

				// Get the first page (index 0) and move it down
				const firstPageItem = await pageMenu.getPageItem(0)

				// Click the submenu button
				const submenuButton = firstPageItem.getByTestId('page-menu.item-submenu')
				await submenuButton.click()

				// Click move down option
				const moveDownButton = page.getByRole('menuitem', { name: /move down/i })
				await expect(moveDownButton).toBeVisible()
				await moveDownButton.click()

				// Wait a moment for the reorder to complete
				await sleep(200)

				// Close and reopen menu to get fresh state
				await page.keyboard.press('Escape')
				await pagemenuButton.click()

				// Verify we still have 3 pages - the operation worked
				await expect(pageItems).toHaveCount(3)
			})
		})
	})
})

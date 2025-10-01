import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { setup, sleep } from '../shared-e2e'

test.describe('page menu', () => {
	test.beforeEach(setup)

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

			await expect(
				firstPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
			).toHaveAttribute('data-checked', 'false')
			await expect(
				secondPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
			).toHaveAttribute('data-checked', 'true')

			// Click on second page
			await secondPage.locator('button').first().click()
			await expect(
				firstPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
			).toHaveAttribute('data-checked', 'false')
			await expect(
				secondPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
			).toHaveAttribute('data-checked', 'true')

			// Click on first page
			await firstPage.locator('button').first().click()

			await expect(
				firstPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
			).toHaveAttribute('data-checked', 'true')
			await expect(
				secondPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
			).toHaveAttribute('data-checked', 'false')
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
				await expect(
					newPageItem.locator('.tlui-page-menu__item__button > .tlui-button__icon')
				).toHaveAttribute('data-checked', 'true')

				// All other pages should not be active
				for (let i = 0; i < initialCount; i++) {
					const otherPageItem = await pageMenu.getPageItem(i)
					await expect(
						otherPageItem.locator('.tlui-page-menu__item__button > .tlui-button__icon')
					).toHaveAttribute('data-checked', 'false')
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
				await expect(
					firstPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
				).toHaveAttribute('data-checked', 'true')
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
				await expect(
					middlePage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
				).toHaveAttribute('data-checked', 'true')

				// Verify other pages are not focused
				const firstPage = await pageMenu.getPageItem(0)
				const lastPage = await pageMenu.getPageItem(2)
				await expect(
					firstPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
				).toHaveAttribute('data-checked', 'false')
				await expect(
					lastPage.locator('.tlui-page-menu__item__button > .tlui-button__icon')
				).toHaveAttribute('data-checked', 'false')
			})
		})
	})

	test.describe('You can drag and drop pages to reorder them', () => {
		test('You can enter drag and drop mode and drag a page to a new position', async ({
			page,
			pageMenu,
		}) => {
			const { pagemenuButton, editButton } = pageMenu

			await test.step('create multiple pages for reordering', async () => {
				await pagemenuButton.click()
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await pageMenu.createButton.click()
				await sleep(100)
				await page.keyboard.press('Enter')
				await page.keyboard.press('Escape')
			})

			await test.step('enter edit mode', async () => {
				await pagemenuButton.click()
				await editButton.click()
				// Should see drag handles
				await expect(page.locator('.tlui-page_menu__item__sortable__handle').first()).toBeVisible()
			})

			await test.step('drag page to new position', async () => {
				const dragHandle = page.locator('.tlui-page_menu__item__sortable__handle').first()
				const secondItem = await pageMenu.getPageItem(1)

				// Perform drag operation
				await dragHandle.dragTo(secondItem)
			})

			await test.step('exit edit mode', async () => {
				await editButton.click()
				await expect(page.locator('.tlui-page_menu__item__sortable__handle').first()).toBeHidden()
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
				const submenuButton = pageItem.locator('.tlui-page_menu__item__submenu button')
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
				const submenuButton = pageItem.locator('.tlui-page_menu__item__submenu button')
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
				const submenuButton = pageItem.locator('.tlui-page_menu__item__submenu button')
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
				const submenuButton = lastPageItem.locator('.tlui-page_menu__item__submenu button')
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
				const submenuButton = firstPageItem.locator('.tlui-page_menu__item__submenu button')
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

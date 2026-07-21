import { expect, test } from '../../fixtures/tla-test'

// Pages named `---` (three or more hyphens) act as dividers in the pages
// list, but only while they are empty. See #9445.

test.beforeEach(async ({ editor }) => {
	await editor.isLoaded()
})

test('an empty page renamed to --- becomes a locked divider', async ({ page, editor }) => {
	const dividerRow = page.locator('[data-testid="page-menu.item"][data-isdivider="true"]')

	await test.step('create an empty page named ---', async () => {
		await editor.openPagesPopover()
		await expect(editor.pageMenuItems).toHaveCount(1)
		await editor.createNewPageNamed('---')
	})

	await test.step('the page renders as a divider and the current page steps back', async () => {
		await expect(editor.pageMenuItems).toHaveCount(2)
		await expect(dividerRow).toHaveCount(1)
		// The divider renders a line, not the page name, and shows no tooltip.
		await expect(dividerRow.locator('.tlui-page-menu__item__button')).toHaveText('')
		await expect(dividerRow.locator('.tlui-page-menu__item__button')).not.toHaveAttribute('title')
		// The freshly created page was current; converting it moved the user
		// back to the regular page.
		await expect(editor.pageMenuTriggerLabel).toContainText('Page 1')
	})

	await test.step('the divider row is about half as tall as a page row', async () => {
		const pageBox = await editor.pageMenuItems.nth(0).boundingBox()
		const dividerBox = await dividerRow.boundingBox()
		expect(dividerBox!.height).toBeLessThan(pageBox!.height * 0.6)
	})

	await test.step('hovering a divider does not highlight it', async () => {
		const pillOpacity = (el: Element) => getComputedStyle(el, '::before').opacity
		// Sanity-check the mechanism on a regular row first: its pill shows on hover.
		await editor.pageMenuItems.nth(0).hover()
		expect(await editor.pageMenuItems.nth(0).evaluate(pillOpacity)).toBe('1')
		await dividerRow.hover()
		expect(await dividerRow.evaluate(pillOpacity)).toBe('0')
	})

	await test.step('clicking the divider does not change the current page', async () => {
		await dividerRow.locator('.tlui-page-menu__item__button').click()
		await expect(editor.pageMenuTriggerLabel).toContainText('Page 1')
	})

	await test.step('the divider submenu only offers move and delete', async () => {
		await dividerRow.hover()
		await dividerRow.getByTestId('page-menu.item-submenu').click()
		await expect(page.getByTestId('page-menu.delete')).toBeVisible()
		await expect(page.getByTestId('page-menu.move-up')).toBeVisible()
		await expect(page.getByTestId('page-menu.rename')).not.toBeVisible()
		await expect(page.getByTestId('page-menu.duplicate')).not.toBeVisible()
	})

	await test.step('the divider can be deleted', async () => {
		await page.getByTestId('page-menu.delete').click()
		await expect(editor.pageMenuItems).toHaveCount(1)
		await expect(dividerRow).toHaveCount(0)
	})
})

test('a page with content renamed to --- stays a regular page', async ({ page, editor }) => {
	await test.step('draw something on the current page', async () => {
		await editor.createTextShape('hello')
		await editor.expectShapesCount(1)
		await page.keyboard.press('Escape')
	})

	await test.step('rename the page to ---', async () => {
		await editor.openPagesPopover()
		const row = editor.pageMenuItems.first()
		await row.hover()
		await row.getByTestId('page-menu.item-submenu').click()
		await page.getByTestId('page-menu.rename').click()
		const renameInput = page.getByTestId('page-menu.list').locator('input')
		await renameInput.fill('---')
		await page.keyboard.press('Enter')
	})

	await test.step('the page stays a regular, selectable page', async () => {
		await expect(page.locator('[data-isdivider="true"]')).toHaveCount(0)
		await expect(editor.pageMenuItems.first().locator('.tlui-page-menu__item__button')).toHaveText(
			'---'
		)
		await expect(editor.pageMenuTriggerLabel).toContainText('---')
	})
})

test('pages can be drag-reordered across a divider', async ({ page, editor }) => {
	await test.step('set up a page, a divider, and another page', async () => {
		await editor.openPagesPopover()
		await editor.createNewPageNamed('---')
		await editor.createNewPageNamed('Other page')
		await expect(editor.pageMenuItems).toHaveCount(3)
		await expect(editor.pageMenuItems.nth(1)).toHaveAttribute('data-isdivider', 'true')
	})

	await test.step('drag the first page below the divider', async () => {
		const firstRowButton = editor.pageMenuItems.nth(0).locator('.tlui-page-menu__item__button')
		const box = (await firstRowButton.boundingBox())!
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
		await page.mouse.down()
		// A divider slot is 18px tall; 26px lands the dragged row's center in
		// the divider's slot, dropping the page just below it.
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 26, { steps: 6 })
		await page.mouse.up()
	})

	await test.step('the divider is now first and the page follows it', async () => {
		await expect(editor.pageMenuItems.nth(0)).toHaveAttribute('data-isdivider', 'true')
		await expect(editor.pageMenuItems.nth(1).locator('.tlui-page-menu__item__button')).toHaveText(
			'Page 1'
		)
	})
})

test('dividers are excluded from the move-to-page menu', async ({ page, editor }) => {
	await test.step('set up a page with content, a divider, and another page', async () => {
		await editor.createTextShape('hello')
		await editor.expectShapesCount(1)
		await page.keyboard.press('Escape')
		await editor.openPagesPopover()
		await editor.createNewPageNamed('---')
		await editor.createNewPageNamed('Other page')
		// Go back to the first page, where the shape is.
		await editor.pageMenuItems.first().locator('.tlui-page-menu__item__button').click()
		await expect(editor.pageMenuTriggerLabel).toContainText('Page 1')
		await page.keyboard.press('Escape')
	})

	await test.step('the move-to-page menu lists pages but not dividers', async () => {
		await page.locator('.tl-shape').first().click()
		await page.locator('.tl-shape').first().click({ button: 'right' })
		await page.getByTestId('context-menu-sub.move-to-page-button').hover()
		await expect(page.getByRole('menuitem', { name: 'Other page' })).toBeVisible()
		await expect(page.getByRole('menuitem', { name: '---' })).not.toBeVisible()
	})
})

import { expect, type Page } from '@playwright/test'
import test from '../fixtures/fixtures'

const content = (page: Page) => page.locator('.tlui-dialog__content')
const selectContent = (page: Page) => page.getByTestId('dialog-select.content')

// Click the dialog backdrop at a point that is outside the centered content.
async function clickBackdrop(page: Page) {
	const box = await content(page).boundingBox()
	if (!box) throw new Error('Could not find dialog content')
	// Midpoint of the left-hand backdrop, vertically aligned with the content.
	await page.mouse.click(Math.max(5, box.x / 2), box.y + box.height / 2)
}

test.describe('dialogs', () => {
	// These exercise backdrop/drag dismissal, which is desktop pointer behaviour.
	test.skip(({ isMobile }) => isMobile, 'Dialog dismissal is tested with a desktop pointer')

	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/toasts-and-dialogs')
		await page.waitForSelector('.tl-canvas')
	})

	test('a backdrop click dismisses a normal dialog', async ({ page }) => {
		await page.getByTestId('show-dialog').click()
		await expect(content(page)).toBeVisible()

		await clickBackdrop(page)
		await expect(content(page)).toHaveCount(0)
	})

	test('escape dismisses a dialog', async ({ page }) => {
		await page.getByTestId('show-dialog').click()
		await expect(content(page)).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(content(page)).toHaveCount(0)
	})

	test('a press that starts inside the content and ends on the backdrop does not dismiss', async ({
		page,
	}) => {
		await page.getByTestId('show-dialog').click()
		await expect(content(page)).toBeVisible()

		const box = await content(page).boundingBox()
		if (!box) throw new Error('Could not find dialog content')
		// Press down inside the content (e.g. selecting text)...
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
		await page.mouse.down()
		// ...drag out onto the backdrop and release.
		await page.mouse.move(Math.max(5, box.x / 2), box.y + box.height / 2, { steps: 5 })
		await page.mouse.up()

		await expect(content(page)).toBeVisible()
	})

	test('an open select inside a modal is dismissed before the dialog', async ({ page }) => {
		await page.getByTestId('show-dialog-with-select').click()
		await expect(content(page)).toBeVisible()

		// Open the select; its listbox portals into the container.
		await page.getByTestId('dialog-select.trigger').click()
		await expect(selectContent(page)).toBeVisible()

		// The first outside click closes only the select; the dialog stays open.
		await clickBackdrop(page)
		await expect(selectContent(page)).toHaveCount(0)
		await expect(content(page)).toBeVisible()

		// A second outside click then closes the dialog.
		await clickBackdrop(page)
		await expect(content(page)).toHaveCount(0)
	})
})

test.describe('stacked dialogs', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/toasts-and-dialogs')
		await page.waitForSelector('.tl-canvas')
	})

	// Stacked modal dialogs must stay interactive — including the topmost dialog's controls
	// on a touchscreen. Making lower stacked dialogs non-modal previously left the nested
	// dialog unresponsive to taps on mobile, so this runs on mobile as well as desktop.
	test('a nested dialog stacks over its parent and stays interactive', async ({
		page,
		isMobile,
	}) => {
		const act = (testId: string) =>
			isMobile ? page.getByTestId(testId).tap() : page.getByTestId(testId).click()

		await act('show-nested-dialog')
		await expect(page.getByTestId('dialog-parent')).toBeVisible()

		await act('dialog-parent.open-nested')
		await expect(page.getByTestId('dialog-nested')).toBeVisible()
		// Opening the nested dialog must not collapse the parent.
		await expect(page.getByTestId('dialog-parent')).toBeVisible()

		// The topmost dialog's control must respond (taps included): closing it leaves the
		// parent open underneath.
		await act('dialog-nested.confirm')
		await expect(page.getByTestId('dialog-nested')).toHaveCount(0)
		await expect(page.getByTestId('dialog-parent')).toBeVisible()
	})
})

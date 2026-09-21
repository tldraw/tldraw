import { Page, expect } from '@playwright/test'
import test from '../fixtures/fixtures'

// Pick the comment tool and click the canvas, then wait for the composer to take focus before
// returning. Its autofocus runs on the next animation frame, so typing straight after the click
// can land before it and be dropped — no text, nothing to post, no pin.
async function startComment(page: Page) {
	await page.getByTestId('quick-actions.comment').click()
	await page.mouse.click(400, 300)
	await expect(
		page.locator('.tlui-cmt-canvas-composer [contenteditable="true"].tlui-cmt-input')
	).toBeFocused()
}

// Place a comment at the same point, post it, and dismiss the thread the send leaves open.
async function placeComment(page: Page, text: string) {
	await startComment(page)
	await page.keyboard.type(text)
	await page.keyboard.press('Enter')
	await page.keyboard.press('Escape')
}

/**
 * Canvas comment markers are the only way into a thread, so they have to be reachable without a
 * pointer. These tests drive the commenting example with the keyboard alone — place a comment with
 * the mouse (creating one is a canvas gesture), then never touch the mouse again.
 */
test.describe('commenting a11y', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5420/commenting/full')
		await page.waitForSelector('.tl-canvas')
		await page.locator('.tl-container').focus()
	})

	test('a comment pin is a labelled button that opens its thread from the keyboard', async ({
		page,
		isMobile,
	}) => {
		// Keyboard navigation isn't the mobile interaction model.
		if (isMobile) test.skip()

		// Place a comment: pick the comment tool, click the canvas, type, and send.
		const commentTool = page.getByTestId('quick-actions.comment')
		await commentTool.click()
		await expect(commentTool).toHaveAttribute('aria-pressed', 'true')
		await expect(commentTool).toHaveAttribute('data-isactive', 'true')
		await page.mouse.click(400, 300)
		await expect(
			page.locator('.tlui-cmt-canvas-composer [contenteditable="true"].tlui-cmt-input')
		).toBeFocused()
		await page.keyboard.type('hello from the keyboard')
		await page.keyboard.press('Enter')

		// The pin exists and exposes button semantics with a name, not a bare div.
		const pin = page.locator('.tlui-cmt-canvas-pin__marker')
		await expect(pin).toHaveCount(1)
		await expect(pin).toHaveRole('button')
		await expect(pin).toHaveAttribute('aria-label', /comment by/i)

		// Dismiss the thread the send left open, so the pin starts closed.
		await page.keyboard.press('Escape')
		await expect(pin).toHaveAttribute('aria-expanded', 'false')

		// Focusing the pin and pressing Enter opens the thread — no pointer involved.
		await pin.focus()
		await expect(pin).toBeFocused()
		await page.keyboard.press('Enter')
		await expect(pin).toHaveAttribute('aria-expanded', 'true')
		await expect(page.locator('.tlui-cmt-canvas-popover')).toBeVisible()

		// Space toggles it back closed, as a button should.
		await pin.focus()
		await page.keyboard.press(' ')
		await expect(pin).toHaveAttribute('aria-expanded', 'false')
	})

	test('the pin is reachable by tabbing, and the reply box has an accessible name', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()

		await startComment(page)

		// The composer is a contenteditable whose visible placeholder is aria-hidden, so without an
		// explicit name a screen reader lands on an unlabelled textbox.
		const composer = page.locator('.tlui-cmt-input').first()
		await expect(composer).toHaveAttribute('aria-label', /.+/)
		await expect(composer).toHaveRole('textbox')

		await page.keyboard.type('first')
		await page.keyboard.press('Enter')

		const pin = page.locator('.tlui-cmt-canvas-pin__marker')
		await page.keyboard.press('Escape')

		// The pin participates in the tab order rather than being skipped as a div would be.
		await page.locator('.tl-container').focus()
		await expect
			.poll(
				async () => {
					for (let i = 0; i < 25; i++) {
						await page.keyboard.press('Tab')
						if (await pin.evaluate((el) => el === document.activeElement)) return true
					}
					return false
				},
				{ timeout: 15000 }
			)
			.toBe(true)
	})

	test('a pin comes after the UI, so "move focus to canvas" keeps the first tab stop', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()

		await placeComment(page, 'first')
		await expect(page.locator('.tlui-cmt-canvas-pin__marker')).toHaveCount(1)

		// The comments layer is portalled into the editor container, and a pin is a real button. Left
		// where React drops the portal it lands ahead of the UI, taking the first tab stop from the
		// skip link — which is then unreachable, and with it the keyboard route onto the canvas.
		const tabOrder = await page.evaluate(() => {
			const focusable = document.querySelectorAll(
				'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
			)
			return {
				firstIsSkipLink: focusable[0]?.classList.contains('tl-skip-to-main-content') ?? false,
				pinIndex: [...focusable].findIndex((el) =>
					el.classList.contains('tlui-cmt-canvas-pin__marker')
				),
				count: focusable.length,
			}
		})
		expect(tabOrder.firstIsSkipLink).toBe(true)
		expect(tabOrder.pinIndex).toBe(tabOrder.count - 1)

		// And tabbing into the container really does land on the skip link first.
		await page.locator('.tl-container').focus()
		await page.keyboard.press('Tab')
		await expect(page.locator('.tl-skip-to-main-content')).toBeFocused()
	})

	test('leaving the edit composer hands focus back to the control that opened it', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()

		await placeComment(page, 'first')

		// Open the thread and spend its one Tab-into-the-reply-box, so nothing is left to pull focus
		// back into the panel on its own — the state the escape has to survive.
		await page.locator('.tlui-cmt-canvas-pin__marker').click()
		await page.locator('.tl-container').focus()
		await page.keyboard.press('Tab')
		const reply = page.locator('.tlui-cmt-canvas-popover [contenteditable="true"].tlui-cmt-input')
		await expect(reply).toBeFocused()

		// Edit from the ⋯ menu: escaping should land back on the ⋯ button that opened it, not on the
		// editor container, where Tab would walk the app's UI instead of the thread's own controls.
		const moreButton = page.locator('.tlui-cmt-canvas-popover [data-cmt-more-for]')
		await moreButton.click()
		await page.locator('.tlui-cmt-menu-item', { hasText: 'Edit' }).click()
		await expect(page.locator('.tlui-cmt-editing [contenteditable="true"]')).toBeFocused()
		await page.keyboard.press('Escape')
		await expect(page.locator('.tlui-cmt-canvas-popover')).toBeVisible()
		await expect(moreButton).toBeFocused()

		// Arrow-up-to-edit comes from the reply box, so that's where escaping returns.
		await reply.focus()
		await page.keyboard.press('ArrowUp')
		await expect(page.locator('.tlui-cmt-editing [contenteditable="true"]')).toBeFocused()
		await page.keyboard.press('Escape')
		await expect(page.locator('.tlui-cmt-canvas-popover')).toBeVisible()
		await expect(reply).toBeFocused()
	})

	test('a stacked card is keyboard-openable without nesting its body links in a button', async ({
		page,
		isMobile,
	}) => {
		if (isMobile) test.skip()

		// Two comments on the same point stack behind one badge. The first carries a link, which a
		// comment body renders as a real anchor.
		await placeComment(page, 'see https://tldraw.dev ')
		await placeComment(page, 'second')

		// Open the stack list from the keyboard.
		const badge = page.locator('.tlui-cmt-canvas-stack-badge')
		await expect(badge).toHaveCount(1)
		await badge.focus()
		await page.keyboard.press('Enter')
		const card = page.locator('.tlui-cmt-stack-list__card').first()
		await expect(card).toBeVisible()
		await expect(card.locator('a[href]')).toHaveCount(1)

		// A button can't contain interactive content, so the card's link must not sit inside one —
		// otherwise activation is unreliable and the control tree assistive tech sees is broken.
		expect(
			await page.evaluate(
				() =>
					![...document.querySelectorAll('.tlui-cmt-stack-list__card a[href]')].some((a) =>
						a.closest('button')
					)
			)
		).toBe(true)

		// The card is still openable by keyboard, through a named button covering its surface.
		const action = card.locator('.tlui-cmt-stack-list__card-action')
		await expect(action).toHaveAttribute('aria-label', /comment by/i)
		await action.focus()
		await page.keyboard.press('Enter')
		await expect(page.locator('.tlui-cmt-stack-list__thread')).toHaveCount(1)
	})
})

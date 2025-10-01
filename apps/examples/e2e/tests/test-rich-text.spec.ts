import { expect } from '@playwright/test'
import test from '../fixtures/fixtures'
import { setup, sleep } from '../shared-e2e'

test.describe('more rich text', () => {
	test.beforeEach(setup)

	test('Double click from select tool to create and edit text on the canvas', async ({
		page,
		toolbar,
	}) => {
		await toolbar.tools.select.click()
		await page.mouse.dblclick(150, 150)
		await sleep(500) // racey here
		await page.keyboard.type('id like to go to india')
		expect(page.getByTestId('rich-text-area')).toHaveText('id like to go to india')
	})

	test('Click with text tool to create and edit text on the canvas', async ({ page, toolbar }) => {
		await toolbar.tools.text.click()
		await page.mouse.click(150, 150)
		await sleep(500) // racey here
		await page.keyboard.type('Live in a big white house in the forest')
		expect(page.getByTestId('rich-text-area')).toHaveText('Live in a big white house in the forest')

		// expect indicator to be in the DOM (since the shape is editing)
		const indicator = page.locator('.tl-overlays__item')
		expect(indicator.first()).toHaveCSS('display', 'block')

		// ...but expect the rectangle inside of the indicator to be hidden (because it's auto width)
		const indicatorRect = page.locator('.tl-overlays__item > .tl-shape-indicator > rect')
		expect(await indicatorRect.isHidden()).toBe(true)
	})

	test('Click and drag with text tool to create and edit fixed-width text on the canvas', async ({
		page,
		toolbar,
	}) => {
		await toolbar.tools.text.click()
		await page.mouse.move(150, 150)
		await page.mouse.down()
		await page.mouse.move(350, 150, { steps: 10 })
		await page.mouse.up()
		await sleep(500) // racey here
		await page.keyboard.type('Drink gin and tonic and play a grand piano')
		expect(page.getByTestId('rich-text-area')).toHaveText(
			'Drink gin and tonic and play a grand piano'
		)

		// expect indicator to be in the DOM (since the shape is editing)
		const indicator = page.locator('.tl-overlays__item')
		expect(indicator.first()).toHaveCSS('display', 'block')

		// ...but expect the rectangle inside of the indicator to be visible (because it's fixed width)
		const indicatorRect = page.locator('.tl-overlays__item > .tl-shape-indicator > rect')
		expect(await indicatorRect.isVisible()).toBe(true)
	})
})

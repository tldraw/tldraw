import { expect } from '@playwright/test'
import { getAllShapeTypes, setup } from '../shared-e2e'
import test from './fixtures/fixtures'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

const clickableShapeCreators = [
	{ tool: 'draw', shape: 'draw' },
	{ tool: 'frame', shape: 'frame' },
	{ tool: 'note', shape: 'note' },
	{ tool: 'text', shape: 'text' },
	{ tool: 'rectangle', shape: 'geo' },
	{ tool: 'ellipse', shape: 'geo' },
	{ tool: 'triangle', shape: 'geo' },
	{ tool: 'diamond', shape: 'geo' },
	{ tool: 'cloud', shape: 'geo' },
	{ tool: 'hexagon', shape: 'geo' },
	// { tool: 'octagon', shape: 'geo' },
	{ tool: 'star', shape: 'geo' },
	{ tool: 'rhombus', shape: 'geo' },
	{ tool: 'oval', shape: 'geo' },
	{ tool: 'trapezoid', shape: 'geo' },
	{ tool: 'arrow-right', shape: 'geo' },
	{ tool: 'arrow-left', shape: 'geo' },
	{ tool: 'arrow-up', shape: 'geo' },
	{ tool: 'arrow-down', shape: 'geo' },
	{ tool: 'x-box', shape: 'geo' },
	{ tool: 'check-box', shape: 'geo' },
]

const draggableShapeCreators = [
	{ tool: 'draw', shape: 'draw' },
	{ tool: 'arrow', shape: 'arrow' },
	{ tool: 'frame', shape: 'frame' },
	{ tool: 'note', shape: 'note' },
	{ tool: 'text', shape: 'text' },
	{ tool: 'line', shape: 'line' },
	{ tool: 'rectangle', shape: 'geo' },
	{ tool: 'ellipse', shape: 'geo' },
	{ tool: 'triangle', shape: 'geo' },
	{ tool: 'diamond', shape: 'geo' },
	{ tool: 'cloud', shape: 'geo' },
	{ tool: 'hexagon', shape: 'geo' },
	// { tool: 'octagon', shape: 'geo' },
	{ tool: 'star', shape: 'geo' },
	{ tool: 'rhombus', shape: 'geo' },
	{ tool: 'oval', shape: 'geo' },
	{ tool: 'trapezoid', shape: 'geo' },
	{ tool: 'arrow-right', shape: 'geo' },
	{ tool: 'arrow-left', shape: 'geo' },
	{ tool: 'arrow-up', shape: 'geo' },
	{ tool: 'arrow-down', shape: 'geo' },
	{ tool: 'x-box', shape: 'geo' },
	{ tool: 'check-box', shape: 'geo' },
]

const otherTools = [{ tool: 'select' }, { tool: 'eraser' }, { tool: 'laser' }]

test.describe('Shape Tools', () => {
	test.beforeEach(setup)
	test('creates shapes with other tools', async ({ toolbar, page }) => {
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Backspace')
		expect(await getAllShapeTypes(page)).toEqual([])

		for (const { tool } of otherTools) {
			// Find and click the button
			if (!(await page.getByTestId(`tools.${tool}`).isVisible())) {
				if (!(await toolbar.moreToolsButton.isVisible())) {
					throw Error(`Tool more is not visible`)
				}
				await toolbar.moreToolsButton.click()

				if (!(await page.getByTestId(`tools.more.${tool}`).isVisible())) {
					throw Error(`Tool in more panel is not visible`)
				}
				await page.getByTestId(`tools.more.${tool}`).click()

				await toolbar.moreToolsButton.click()
			}

			if (!(await page.getByTestId(`tools.${tool}`).isVisible())) {
				throw Error(`Tool ${tool} is not visible`)
			}

			await page.getByTestId(`tools.${tool}`).click()

			// Button should be selected
			await expect(page.getByTestId(`tools.${tool}`)).toHaveAttribute('aria-checked', 'true')
		}
	})

	test('creates shapes clickable tools', async ({ page, toolbar }) => {
		await page.keyboard.press('v')
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Backspace')
		expect(await getAllShapeTypes(page)).toEqual([])

		for (const { tool, shape } of clickableShapeCreators) {
			// Find and click the button
			if (!(await page.getByTestId(`tools.${tool}`).isVisible())) {
				await toolbar.moreToolsButton.click()
				await page.getByTestId(`tools.more.${tool}`).click()
				await toolbar.moreToolsButton.click()
			}
			await page.getByTestId(`tools.${tool}`).click()

			// Button should be selected
			await expect(page.getByTestId(`tools.${tool}`)).toHaveAttribute('aria-checked', 'true')

			// Click on the page
			await page.mouse.click(200, 200)
			await page.waitForTimeout(20)

			// We should have a corresponding shape in the page
			expect(await getAllShapeTypes(page)).toEqual([shape])

			// Reset for next time
			await page.mouse.click(50, 50) // to ensure we're not focused
			await page.keyboard.press('v') // go to the select tool
			await page.waitForTimeout(20)
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Backspace')
		}

		expect(await getAllShapeTypes(page)).toEqual([])
	})

	test('creates shapes with draggable tools', async ({ page, toolbar }) => {
		await page.keyboard.press('Control+a')
		await page.keyboard.press('Backspace')
		expect(await getAllShapeTypes(page)).toEqual([])

		for (const { tool, shape } of draggableShapeCreators) {
			// Find and click the button
			if (!(await page.getByTestId(`tools.${tool}`).isVisible())) {
				await toolbar.moreToolsButton.click()
				await page.getByTestId(`tools.more.${tool}`).click()
				await toolbar.moreToolsButton.click()
			}

			await page.getByTestId(`tools.${tool}`).click()

			// Button should be selected
			await expect(page.getByTestId(`tools.${tool}`)).toHaveAttribute('aria-checked', 'true')

			// Click and drag
			await page.mouse.move(200, 200)
			await page.mouse.down()
			await page.mouse.move(250, 250)
			await page.mouse.up()

			// We should have a corresponding shape in the page
			expect(await getAllShapeTypes(page)).toEqual([shape])

			// Reset for next time
			await page.mouse.click(50, 50) // to ensure we're not focused
			await page.keyboard.press('v')
			await page.waitForTimeout(20)
			await page.keyboard.press('Control+a')
			await page.keyboard.press('Backspace')
		}
	})
})

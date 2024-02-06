import test, { Locator, expect } from '@playwright/test'
import { setup } from '../shared-e2e'

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setup)

	test('tool selection behaviors', async ({ page }) => {
		const selectTool = page.getByTestId('tools.select')
		const drawTool = page.getByTestId('tools.draw')
		const arrowTool = page.getByTestId('tools.arrow')
		const toolLock = page.getByTestId('tool-lock')
		const moreToolsButton = page.getByTestId('tools.more-button')
		const moreToolsPopover = page.getByTestId('tools.more-content')
		const cloudTool = page.getByTestId('tools.more.cloud')

		await test.step('selecting a tool changes the button color', async () => {
			await selectTool.click()
			await isSelected(selectTool, true)
			await isSelected(drawTool, false)
			await drawTool.click()
			await isSelected(selectTool, false)
			await isSelected(drawTool, true)
		})

		await test.step('selecting certain tools exposes the tool-lock button', async () => {
			await drawTool.click()
			expect(await toolLock.isVisible()).toBe(false)
			await arrowTool.click()
			expect(await toolLock.isVisible()).toBe(true)
		})

		await test.step('selecting a tool from the popover makes it appear on toolbar', async () => {
			// Tools in the toolbar have the testId `tools.{tool}` and the popover items have the testId `tools.more.{tool}`
			await expect(page.getByTestId('tools.cloud')).toBeHidden()
			await expect(moreToolsPopover).toBeHidden()
			await moreToolsButton.click()
			await expect(moreToolsPopover).toBeVisible()
			await cloudTool.click()
			await expect(moreToolsPopover).toBeHidden()
			await expect(page.getByTestId('tools.cloud')).toBeVisible()
		})
	})
	test('the correct styles are exposed for the selected tool', async ({ isMobile, page }) => {
		const moreToolsButton = page.getByTestId('tools.more-button')

		const toolsStylesArr = [
			{
				testId: 'tools.select',
				styles: ['style.color', 'style.opacity', 'style.fill', 'style.dash', 'style.size'],
			},
			{ testId: 'tools.more.frame', styles: ['style.opacity'] },
			{
				testId: 'tools.text',
				styles: ['style.size', 'style.color', 'style.opacity', 'style.font', 'style.align'],
			},
		]

		const stylesArr = [
			'style.color',
			'style.opacity',
			'style.fill',
			'style.dash',
			'style.size',
			'style.font',
			'style.align',
		]

		for (const tool of toolsStylesArr) {
			await test.step(`Check tool ${tool.testId}`, async () => {
				if (tool.testId === 'tools.more.frame') {
					await moreToolsButton.click()
				}
				await page.getByTestId(tool.testId).click()

				if (isMobile) {
					await page.getByTestId('mobile-styles.button').click()
				}

				for (const style of stylesArr) {
					const styleElement = page.getByTestId(style)
					const isVisible = await styleElement.isVisible()
					expect(isVisible).toBe(tool.styles.includes(style))
				}
			})
		}
	})
})

async function isSelected(locator: Locator, isSelected: boolean) {
	const expectedColor = isSelected ? 'rgb(255, 255, 255)' : 'rgb(46, 46, 46)'
	expect(locator).toHaveCSS('color', expectedColor)
}

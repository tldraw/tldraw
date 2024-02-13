import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from '../tests/fixtures/fixtures'

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setup)

	test('tool selection behaviors', async ({ toolbar }) => {
		const { select, draw, arrow, cloud } = toolbar.toolNames
		const { popoverCloud } = toolbar.popoverToolNames

		await test.step('selecting a tool changes the button color', async () => {
			await select.click()
			await toolbar.isSelected(select, true)
			await toolbar.isSelected(draw, false)
			await draw.click()
			await toolbar.isSelected(select, false)
			await toolbar.isSelected(draw, true)
		})

		await test.step('selecting certain tools exposes the tool-lock button', async () => {
			await draw.click()
			expect(toolbar.toolLock).toBeHidden()
			await arrow.click()
			expect(toolbar.toolLock).toBeVisible()
		})

		await test.step('selecting a tool from the popover makes it appear on toolbar', async () => {
			await expect(cloud).toBeHidden()
			await expect(toolbar.moreToolsPopover).toBeHidden()
			await toolbar.moreToolsButton.click()
			await expect(toolbar.moreToolsPopover).toBeVisible()
			await popoverCloud.click()
			await expect(toolbar.moreToolsPopover).toBeHidden()
			await expect(cloud).toBeVisible()
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

import { expect } from '@playwright/test'
import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setup)

	test('tool selection behaviors', async ({ toolbar }) => {
		const { select, draw, arrow, cloud } = toolbar.tools
		const { popoverCloud } = toolbar.popOverTools

		await test.step('selecting a tool changes the button color', async () => {
			await select.click()
			await toolbar.isSelected(select)
			await toolbar.isNotSelected(draw)
			await draw.click()
			await toolbar.isNotSelected(select)
			await toolbar.isSelected(draw)
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
	test('the correct styles are exposed for the selected tool', async ({
		isMobile,
		page,
		toolbar,
		stylePanel,
	}) => {
		const toolsStylesArr = [
			{
				name: 'tools.select',
				styles: ['style.color', 'style.opacity', 'style.fill', 'style.dash', 'style.size'],
			},
			{ name: 'tools.more.frame', styles: ['style.opacity'] },
			{
				name: 'tools.text',
				styles: ['style.size', 'style.color', 'style.opacity', 'style.font', 'style.align'],
			},
		]

		for (const tool of toolsStylesArr) {
			await test.step(`Check tool ${tool.name}`, async () => {
				if (tool.name === 'tools.more.frame') {
					await toolbar.moreToolsButton.click()
				}
				await page.getByTestId(tool.name).click()

				if (isMobile) {
					await toolbar.mobileStylesButton.click()
				}

				for (const style of stylePanel.stylesArray) {
					const styleElement = page.getByTestId(style)
					const isVisible = await styleElement.isVisible()
					const isExpected = tool.styles.includes(style)
					expect(isVisible).toBe(isExpected)
				}
			})
		}
	})
})

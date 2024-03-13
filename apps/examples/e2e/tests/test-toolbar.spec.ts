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
})

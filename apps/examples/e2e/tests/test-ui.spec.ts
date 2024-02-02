import test, { expect } from '@playwright/test'
import { setup } from '../shared-e2e'

test.describe('mobile ui', () => {
	test.beforeEach(setup)
	test('mobile style panel opens and closes when tapped', async ({ isMobile, page }) => {
		test.skip(!isMobile, 'only run on mobile')
		expect(await page.isVisible('.tlui-style-panel')).toBe(false)
		await page.getByTestId('mobile-styles.button').click()
		expect(await page.isVisible('.tlui-style-panel')).toBe(true)
		await page.getByTestId('mobile-styles.button').click()
		expect(await page.isVisible('.tlui-style-panel')).toBe(false)
	})
	test('mobile style panel closes when tapping off the menu', async ({ isMobile, page }) => {
		test.skip(!isMobile, 'only run on mobile')
		await page.getByTestId('mobile-styles.button').click()
		expect(await page.isVisible('.tlui-style-panel')).toBe(true)
		await page.getByTestId('tools.select').click()
		expect(await page.isVisible('.tlui-style-panel')).toBe(false)
	})
})

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setup)
	test('selecting a tool changes the button color', async ({ page }) => {
		const selectTool = page.getByTestId('tools.select')
		const drawTool = page.getByTestId('tools.draw')
		// We can't check the style of pseudo elements, as the browser doesn't expose them to the test
		// So we use text color as a proxy
		expect(selectTool).toHaveCSS('color', 'rgb(255, 255, 255)')
		expect(drawTool).toHaveCSS('color', 'rgb(46, 46, 46)')
		await drawTool.click()
		expect(selectTool).toHaveCSS('color', 'rgb(46, 46, 46)')
		expect(drawTool).toHaveCSS('color', 'rgb(255, 255, 255)')
	})
	test('selecting certain tools exposes the tool-lock button', async ({ page }) => {
		const arrowTool = page.getByTestId('tools.arrow')
		const drawTool = page.getByTestId('tools.draw')
		const toolLock = page.getByTestId('tool-lock')
		await drawTool.click()
		expect(await toolLock.isVisible()).toBe(false)
		await arrowTool.click()
		expect(await toolLock.isVisible()).toBe(true)
	})
	test('selecting a tool from the popover makes it appear on toolbar', async ({ page }) => {
		// In the popover tools have a data-testid of tools.more.{tool} and on the toolbar they are tools.{tool}
		const popoverButton = page.getByTestId('tools.more.button')
		const popoverContent = page.getByTestId('tools.more.content')
		const cloudTool = page.getByTestId('tools.more.cloud')
		// The cloud tool is not visible on the toolbar initially
		expect(await page.getByTestId('tools.cloud').isVisible()).toBe(false)
		expect(await popoverContent.isVisible()).toBe(false)
		await popoverButton.click()
		expect(await popoverContent.isVisible()).toBe(true)
		await cloudTool.click()
		expect(await popoverContent.isVisible()).toBe(false)
		// The cloud tool is now visible on the toolbar
		expect(await page.getByTestId('tools.cloud').isVisible()).toBe(true)
	})
})

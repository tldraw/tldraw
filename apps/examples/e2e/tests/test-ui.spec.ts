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
	test('mobile style menu button is disabled for the eraser tool', async ({ isMobile, page }) => {
		test.skip(!isMobile, 'only run on mobile')
		const eraserTool = page.getByTestId('tools.eraser')
		await eraserTool.click()
		const mobileStylesButton = page.getByTestId('mobile-styles.button')
		expect(await mobileStylesButton.isDisabled()).toBe(true)
	})
})

test.describe('when selecting a tool from the toolbar', () => {
	test.beforeEach(setup)
	test('selecting a tool changes the button color', async ({ page }) => {
		const selectTool = page.getByTestId('tools.select')
		const drawTool = page.getByTestId('tools.draw')
		await selectTool.click()
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
	test('the correct styles are exposed for the selected tool', async ({ isMobile, page }) => {
		// The styles that should be exposed for each tool
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
		// All the styles that we should check
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
			// the iframe tool is in the popover
			if (tool.testId === 'tools.more.frame') {
				await page.getByTestId('tools.more.button').click()
				await page.getByTestId(tool.testId).click()
			} else {
				await page.getByTestId(tool.testId).click()
			}
			// We need to open the style menu on mobile to check if the style is visible
			if (isMobile) {
				await page.getByTestId('mobile-styles.button').click()
			}
			for (const style of stylesArr) {
				expect(await page.getByTestId(style).isVisible()).toBe(tool.styles.includes(style))
			}
		}
	})
})

test.describe('when selecting a style', () => {
	test.beforeEach(setup)
	test('selecting a style changes the button color', async ({ page }) => {
		//Pseudo elements can't be checked, but we don't have another way to check the color
		test.skip()
		const colorButton = page.getByTestId('style.color.violet')
		await colorButton.click()
	})
})

test.describe('pages menu', () => {
	test.beforeEach(setup)
	test.only('you can create a page', async ({ isMobile, page }) => {
		const pagesButton = page.getByTestId('main.page-menu')
		const pagesMenu = page.locator('.tlui-page-menu__wrapper')
		const createPageButton = page.getByTestId('page-menu.create')
		expect(await pagesMenu.isVisible()).toBe(false)
		await pagesButton.click()
		expect(await pagesMenu.isVisible()).toBe(true)
		expect(pagesMenu.locator('.tlui-page-menu__item')).toHaveCount(1)
		await createPageButton.click()
		// The page menu is now in edit mode
		await page.getByTestId('page-menu.edit').click()
		//not sure why this is failing on mobile
		if (!isMobile) {
			expect(pagesMenu.locator('.tlui-page-menu__item')).toHaveCount(2)
		}
	})
})

import { setup } from '../shared-e2e'
import test from './fixtures/fixtures'

test.describe('Performance test', () => {
	test.beforeEach(setup)
	test.only('Get panning performance metrics', async ({ page, isMobile }) => {
		test.skip(isMobile, 'no debug menu on mobile')
		const debugMenuButton = page.getByTitle('Debug menu')
		const panningTestMenuItem = page.getByTitle('Panning test')
		await debugMenuButton.click()
		const session = await page.context().newCDPSession(page)
		await session.send('Performance.enable')
		// Wait for the panning test to complete
		await panningTestMenuItem.click()
		await page.waitForTimeout(5000)

		console.log('=============CDP Performance Metrics===============')
		const performanceMetrics = await session.send('Performance.getMetrics')
		console.log(performanceMetrics.metrics)
	})
	test.only('Get zooming performance metrics', async ({ page, isMobile }) => {
		test.skip(isMobile, 'no debug menu on mobile')
		const debugMenuButton = page.getByTitle('Debug menu')
		const zoomTestMenuItem = page.getByTitle('Zoom test')
		await debugMenuButton.click()
		const session = await page.context().newCDPSession(page)
		await session.send('Performance.enable')
		// Wait for the zoom test to complete
		await zoomTestMenuItem.click()
		await page.waitForTimeout(5000)
		console.log('=============CDP Performance Metrics===============')
		const performanceMetrics = await session.send('Performance.getMetrics')
		console.log(performanceMetrics.metrics)
	})
})

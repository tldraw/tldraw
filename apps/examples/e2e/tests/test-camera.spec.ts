import test, { Page } from '@playwright/test'
import { App } from '@tldraw/tldraw'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const app: App

let page: Page

test.describe('camera', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await page.goto('http://localhost:5420/')
		await page.waitForSelector('.tl-canvas')
		await page.evaluate(() => (app.enableAnimations = false))
	})

	test.fixme('panning', () => {
		// todo
	})

	test.fixme('pinching', () => {
		// todo
	})

	test.fixme('minimap', () => {
		// todo
	})

	test.fixme('hand tool', () => {
		// todo
	})
})

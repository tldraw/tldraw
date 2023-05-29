import test, { expect, Page } from '@playwright/test'
import { App } from '@tldraw/tldraw'
import { setupPage, sleep } from '../shared-e2e'

declare const __tldraw_editor_events: any[]

// We're just testing the events, not the actual results.

let page: Page

declare const app: App

test.describe('Canvas events', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
		await sleep(200)
	})

	test.describe('pointer events', () => {
		test('pointer down', async () => {
			await page.mouse.move(100, 100)
			await page.mouse.down()
			expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
				target: 'canvas',
				type: 'pointer',
				name: 'pointer_down',
			})
		})

		test('pointer move', async () => {
			await page.mouse.move(100, 100)
			await page.mouse.down()
			await page.mouse.move(101, 101)
			expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
				target: 'canvas',
				type: 'pointer',
				name: 'pointer_move',
			})
		})

		test('pointer up', async () => {
			await page.mouse.move(100, 100)
			await page.mouse.down()
			await page.mouse.move(101, 101)
			await page.mouse.up()
			expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
				target: 'canvas',
				type: 'pointer',
				name: 'pointer_up',
			})
		})

		test('pointer leave', async () => {
			await page.mouse.move(100, 100)
			await page.mouse.move(-10, 50)
			expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
				target: 'canvas',
				type: 'pointer',
				name: 'pointer_leave',
			})
		})

		test('pointer enter', async () => {
			await page.mouse.move(-10, 50)
			await page.mouse.move(1, 50)
			expect(await page.evaluate(() => __tldraw_editor_events.at(-2))).toMatchObject({
				target: 'canvas',
				type: 'pointer',
				name: 'pointer_enter',
			})
		})
	})

	test.describe('click events', () => {
		// todo
	})

	test.describe('pinch events', () => {
		// todo
	})

	test.describe('keyboard events', () => {
		// todo
	})

	test('wheel events', async () => {
		await page.mouse.move(100, 100)
		await page.mouse.wheel(10, 10)
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'wheel',
			name: 'wheel',
			delta: {
				x: -20,
				y: -20,
			},
		})
	})

	test.fixme('complete', async () => {
		await page.evaluate(async () => app.complete())
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'misc',
			name: 'complete',
		})
	})

	test.fixme('cancel', async () => {
		await page.evaluate(async () => app.cancel())
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'misc',
			name: 'complete',
		})
	})

	test.fixme('interrupt', async () => {
		await page.evaluate(async () => app.interrupt())
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'misc',
			name: 'interrupt',
		})
	})
})

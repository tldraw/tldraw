import test, { expect, Page } from '@playwright/test'
import { Editor } from '@tldraw/tldraw'
import { setupPage } from '../shared-e2e'

declare const __tldraw_editor_events: any[]

// We're just testing the events, not the actual results.

let page: Page

declare const editor: Editor

test.describe('Canvas events', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test.describe('pointer events', () => {
		test('pointer down', async () => {
			await page.mouse.move(200, 200) // to kill any double clicks
			await page.mouse.move(100, 100)
			await page.mouse.down()
			expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
				target: 'canvas',
				type: 'pointer',
				name: 'pointer_down',
			})
		})

		test('pointer move', async () => {
			await page.mouse.move(200, 200) // to kill any double clicks
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
			await page.mouse.move(200, 200) // to kill any double clicks
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

	test.fixme('wheel events', async () => {
		await page.mouse.move(200, 200) // to kill any double clicks
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
		await page.evaluate(async () => editor.complete())
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'misc',
			name: 'complete',
		})
	})

	test.fixme('cancel', async () => {
		await page.evaluate(async () => editor.cancel())
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'misc',
			name: 'complete',
		})
	})

	test.fixme('interrupt', async () => {
		await page.evaluate(async () => editor.interrupt())
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			type: 'misc',
			name: 'interrupt',
		})
	})
})

test.describe('Shape events', () => {
	test.beforeEach(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
		await page.keyboard.press('r')
		await page.mouse.click(150, 150)
		await page.mouse.move(0, 0)
		await page.keyboard.press('Escape')
	})

	test('pointer down', async () => {
		await page.mouse.move(51, 51)
		await page.mouse.down()
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			target: 'canvas',
			type: 'pointer',
			name: 'pointer_down',
		})
	})

	test('pointer move', async () => {
		await page.mouse.move(51, 51)
		await page.mouse.move(52, 52)
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			target: 'canvas',
			type: 'pointer',
			name: 'pointer_move',
		})
	})

	test('pointer up', async () => {
		await page.mouse.move(51, 51)
		await page.mouse.down()
		await page.mouse.up()
		expect(await page.evaluate(() => __tldraw_editor_events.at(-1))).toMatchObject({
			target: 'canvas',
			type: 'pointer',
			name: 'pointer_up',
		})
	})
})

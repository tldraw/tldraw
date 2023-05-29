import test, { expect } from '@playwright/test'
import { App } from '@tldraw/tldraw'
import { setup } from '../shared-e2e'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

declare const app: App

test.describe('creates shapes with tools', () => {
	test.beforeEach(setup)

	test('draw tool', async ({ page }) => {
		await page.keyboard.press('d')
		await page.mouse.move(64, 64)
		await page.mouse.down()
		await page.mouse.move(264, 264)
		await page.mouse.up()

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
		expect(await page.evaluate(() => app.shapesArray[0])).toMatchObject({
			type: 'draw',
			x: 64,
			y: 64,
			index: 'a1',
			props: {
				color: 'black',
				dash: 'draw',
				opacity: '1',
				isComplete: true,
				fill: 'none',
				size: 'm',
				isClosed: false,
				isPen: false,
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0 },
							{ x: 200, y: 200 },
						],
					},
				],
			},
		})
	})

	test('geo tool', async ({ page }) => {
		await page.keyboard.press('r')
		await page.mouse.move(64, 64)
		await page.mouse.down()
		await page.mouse.move(264, 264)
		await page.mouse.up()

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
		expect(await page.evaluate(() => app.shapesArray[0])).toMatchObject({
			type: 'geo',
			x: 64,
			y: 64,
			index: 'a1',
			props: {
				geo: 'rectangle',
				color: 'black',
				dash: 'draw',
				opacity: '1',
				fill: 'none',
				size: 'm',
				w: 200,
				h: 200,
			},
		})
	})

	test('arrow tool', async ({ page }) => {
		await page.keyboard.press('a')
		await page.mouse.move(64, 64)
		await page.mouse.down()
		await page.mouse.move(264, 264)
		await page.mouse.up()

		expect(await page.evaluate(() => app.shapesArray.length)).toBe(1)
		expect(await page.evaluate(() => app.shapesArray[0])).toMatchObject({
			type: 'arrow',
			x: 64,
			y: 64,
			index: 'a1',
			props: {
				color: 'black',
				dash: 'draw',
				opacity: '1',
				fill: 'none',
				size: 'm',
				bend: 0,
				start: { type: 'point', x: 0, y: 0 },
				end: { type: 'point', x: 200, y: 200 },
			},
		})
	})
})

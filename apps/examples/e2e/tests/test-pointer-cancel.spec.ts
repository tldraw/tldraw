import { CDPSession, expect, Page } from '@playwright/test'
import { Editor } from 'tldraw'
import test from '../fixtures/fixtures'
import { setupOrReset } from '../shared-e2e'

declare const editor: Editor

/*
 * Playwright's input APIs can't produce a `pointercancel`, so these tests drive
 * Chrome directly: a `touchCancel` through CDP makes the browser generate the
 * pointercancel itself, which is the path a system-interrupted touch takes (an
 * edge swipe, an incoming call). Checked against iPadOS Safari, which emits
 * `pointercancel` with `pointerType: 'touch'` and `button: -1` for those
 * gestures, and none at all for a rejected palm.
 */

type TouchEventType = 'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel'
type MouseEventType = 'mousePressed' | 'mouseReleased' | 'mouseMoved'

async function startTouchSession(page: Page): Promise<CDPSession> {
	const cdp = await page.context().newCDPSession(page)
	// The desktop project has no touch points of its own.
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
	return cdp
}

function touch(cdp: CDPSession, type: TouchEventType, points: [number, number][] = []) {
	return cdp.send('Input.dispatchTouchEvent', {
		type,
		touchPoints: points.map(([x, y], i) => ({ x, y, id: i })),
	})
}

function pen(cdp: CDPSession, type: MouseEventType, x: number, y: number) {
	return cdp.send('Input.dispatchMouseEvent', {
		type,
		x,
		y,
		button: 'left',
		buttons: type === 'mouseReleased' ? 0 : 1,
		clickCount: 1,
		pointerType: 'pen',
		force: 0.5,
	})
}

const getState = (page: Page) =>
	page.evaluate(() => ({
		path: editor.getPath(),
		isPointing: editor.inputs.getIsPointing(),
		buttons: [...editor.inputs.buttons],
	}))

test.describe('Cancelled pointers', () => {
	test.beforeEach(setupOrReset)

	test('ends a select drag', async ({ page }) => {
		const cdp = await startTouchSession(page)
		await page.evaluate(() => editor.setCurrentTool('select'))

		await touch(cdp, 'touchStart', [[200, 300]])
		await touch(cdp, 'touchMove', [[340, 420]])
		expect(await getState(page)).toMatchObject({ path: 'select.brushing', isPointing: true })

		await touch(cdp, 'touchCancel')

		// The button comes from the pointerdown: pointercancel reports -1, which would
		// otherwise stay stuck in inputs.buttons.
		expect(await getState(page)).toEqual({
			path: 'select.idle',
			isPointing: false,
			buttons: [],
		})
	})

	test('ends a draw stroke', async ({ page }) => {
		const cdp = await startTouchSession(page)
		await page.evaluate(() => editor.setCurrentTool('draw'))

		await touch(cdp, 'touchStart', [[300, 300]])
		await touch(cdp, 'touchMove', [[380, 400]])
		expect(await getState(page)).toMatchObject({ path: 'draw.drawing', isPointing: true })

		await touch(cdp, 'touchCancel')

		expect(await getState(page)).toMatchObject({ path: 'draw.idle', isPointing: false })
	})

	test('lets the next touch start a fresh stroke rather than continuing the old one', async ({
		page,
	}) => {
		const cdp = await startTouchSession(page)
		await page.evaluate(() => editor.setCurrentTool('draw'))

		await touch(cdp, 'touchStart', [[200, 300]])
		await touch(cdp, 'touchMove', [[260, 360]])
		await touch(cdp, 'touchCancel')

		await touch(cdp, 'touchStart', [[600, 500]])
		await touch(cdp, 'touchMove', [[660, 560]])
		await touch(cdp, 'touchEnd')

		// A draw tool left in its drawing state extends the cancelled shape instead of
		// starting a new one, so the two gestures come back as a single stroke.
		expect(await page.evaluate(() => editor.getCurrentPageShapes().length)).toBe(2)
	})

	/**
	 * iPadOS rejects a resting palm before it reaches the page, so these two never
	 * fire in practice on a real device. They pin the guards that keep a cancelled
	 * touch from ending the pen's own interaction if one ever does arrive.
	 */
	test.describe('in pen mode', () => {
		test('a cancelled palm landing after the pen leaves the stroke alone', async ({ page }) => {
			const cdp = await startTouchSession(page)
			await page.evaluate(() => {
				editor.updateInstanceState({ isPenMode: true })
				editor.setCurrentTool('draw')
			})

			await pen(cdp, 'mousePressed', 300, 300)
			await pen(cdp, 'mouseMoved', 380, 400)

			await touch(cdp, 'touchStart', [[700, 800]])
			await touch(cdp, 'touchCancel')

			expect(await getState(page)).toMatchObject({ path: 'draw.drawing', isPointing: true })
		})

		test('a cancelled palm landing before the pen leaves the stroke alone', async ({ page }) => {
			const cdp = await startTouchSession(page)
			await page.evaluate(() => {
				editor.updateInstanceState({ isPenMode: false })
				editor.setCurrentTool('draw')
			})

			// The palm is accepted while pen mode is still off, so its button is recorded;
			// the pen then turns pen mode on before the palm is cancelled.
			await touch(cdp, 'touchStart', [[700, 800]])
			await pen(cdp, 'mousePressed', 300, 300)
			await pen(cdp, 'mouseMoved', 380, 400)
			await touch(cdp, 'touchCancel')

			expect(await getState(page)).toMatchObject({ path: 'draw.drawing', isPointing: true })
		})
	})
})

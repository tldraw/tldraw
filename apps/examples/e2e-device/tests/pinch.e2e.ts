import { expect } from '@wdio/globals'
import type { Editor } from 'tldraw'
import { getSelectedShapeIds, getZoom, openEditor } from '../helpers/app'
import { pinchCanvas } from '../helpers/pinch'

declare const editor: Editor

/**
 * Device-realistic pinch tests. These mirror the intent of the Playwright camera
 * tests (apps/examples/e2e/tests/test-camera.spec.ts) but run through the real
 * OS touch pipeline on a simulator/emulator, so they cover the browser's own
 * gesture recogniser — the part synthetic CDP touch can't reach.
 */
describe('pinch to zoom', () => {
	beforeEach(async () => {
		await openEditor()
	})

	it('spreading two fingers zooms in', async () => {
		expect(await getZoom()).toBe(1)
		await pinchCanvas({ scale: 2.5 })
		expect(await getZoom()).toBeGreaterThan(1)
	})

	it('pinching two fingers together zooms out', async () => {
		expect(await getZoom()).toBe(1)
		await pinchCanvas({ scale: 0.4 })
		expect(await getZoom()).toBeLessThan(1)
	})

	it('a two-finger pinch does not change the selection', async () => {
		// Place a shape under where the pinch lands, plus a second shape that we
		// pre-select off to the side. The pinch must not steal the selection.
		await browser.execute(() => {
			editor.createShapes([
				{ id: 'shape:a', type: 'geo', x: -400, y: -400, props: { w: 100, h: 100 } },
				{ id: 'shape:b', type: 'geo', x: 0, y: 0, props: { w: 400, h: 400 } },
			] as any)
			editor.setSelectedShapes(['shape:a'] as any)
		})
		expect(await getSelectedShapeIds()).toEqual(['shape:a'])

		await pinchCanvas({ scale: 2 })

		// Selection is preserved and the gesture really did zoom.
		expect(await getSelectedShapeIds()).toEqual(['shape:a'])
		expect(await getZoom()).not.toBe(1)
	})
})

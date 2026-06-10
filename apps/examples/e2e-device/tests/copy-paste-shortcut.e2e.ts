import { expect } from '@wdio/globals'
import type { Editor } from 'tldraw'
import { getShapeCount, openEditor } from '../helpers/app'
import { pressAccel } from '../helpers/keyboard'

declare const editor: Editor

/**
 * Regression test for tldraw/tldraw#7372 — copy/paste keyboard shortcuts
 * (Cmd+C / Cmd+V) not working on iPad Safari with a hardware keyboard, even
 * though other shortcuts (e.g. Cmd+/) do.
 *
 * This needs a real device: copy/paste ride the OS clipboard + the browser's
 * native `copy`/`paste` events, which is exactly the layer that behaves
 * differently on iPadOS Safari and which synthetic CDP key events can't
 * reproduce.
 */
describe('copy/paste keyboard shortcuts (#7372)', () => {
	beforeEach(async () => {
		await openEditor()
	})

	it('accelerator + C then accelerator + V pastes a copy of the selected shape', async () => {
		await browser.execute(() => {
			editor.createShapes([
				{ id: 'shape:k', type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			] as any)
			editor.select('shape:k' as any)
		})
		expect(await getShapeCount()).toBe(1)

		await pressAccel('c')
		await pressAccel('v')

		// Paste places a copy at an offset, so the page should now have 2 shapes.
		await browser.waitUntil(async () => (await getShapeCount()) === 2, {
			timeout: 5000,
			timeoutMsg: 'copy/paste shortcut did not create a second shape',
		})
	})
})

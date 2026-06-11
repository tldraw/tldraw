import { expect } from '@wdio/globals'
import type { Editor } from 'tldraw'
import { getShapeCount, openEditor } from '../helpers/app'
import { pressAccel } from '../helpers/keyboard'

declare const editor: Editor

/**
 * Regression test for tldraw/tldraw#7372 — copy/paste keyboard shortcuts
 * (Cmd+C / Cmd+V) not working on iPad Safari with a hardware keyboard. The fix
 * is the hidden contenteditable "keyboard sink": iOS only delivers
 * Cmd/Ctrl-modified key events (and the native copy/paste events tldraw's
 * clipboard rides on) when an editable element holds DOM focus.
 *
 * This needs a real device pipeline: the keys are injected through the OS
 * (XCUITest `mobile: keys` / UiAutomator2 `mobile: pressKey`), so the browser's
 * own hardware-keyboard handling decides whether the page sees them — exactly
 * the layer that swallows Cmd chords on iOS, and one that synthetic CDP key
 * events can't reproduce.
 */

/** Install page-side recorders for keyboard + clipboard events. */
async function installDiagnostics() {
	await browser.execute(() => {
		const log: string[] = []
		;(window as any).__kbdDiag = log
		const describe = (el: Element | null) =>
			!el
				? 'null'
				: el.hasAttribute('data-tl-keyboard-sink')
					? 'SINK'
					: el.classList.contains('tl-container')
						? 'container'
						: el.tagName
		for (const type of ['keydown', 'keyup'] as const) {
			document.addEventListener(
				type,
				(e) => {
					const k = e as KeyboardEvent
					log.push(
						`${type} key=${k.key} meta=${k.metaKey} ctrl=${k.ctrlKey} target=${describe(k.target as Element)}`
					)
				},
				{ capture: true }
			)
		}
		for (const type of ['beforecopy', 'copy', 'cut', 'paste'] as const) {
			document.addEventListener(
				type,
				(e) => log.push(`${type} target=${describe(e.target as Element)}`),
				{ capture: true }
			)
		}
	})
}

/** Page-side focus snapshot + recorded events, for the CI job log. */
async function dumpDiagnostics(label: string) {
	const diag = await browser.execute(() => {
		const ae = document.activeElement
		const sink = document.querySelector('[data-tl-keyboard-sink]')
		return {
			activeElement: !ae
				? 'null'
				: ae.hasAttribute('data-tl-keyboard-sink')
					? 'SINK'
					: ae.classList.contains('tl-container')
						? 'container'
						: ae.tagName,
			sinkExists: !!sink,
			editorIsFocused: editor.getInstanceState().isFocused,
			events: ((window as any).__kbdDiag as string[] | undefined) ?? [],
		}
	})
	// eslint-disable-next-line no-console
	console.log(`[diag] ${label}:`, JSON.stringify(diag))
	return diag
}

describe('copy/paste keyboard shortcuts (#7372)', () => {
	beforeEach(async () => {
		await openEditor()
	})

	it('accelerator + C then accelerator + V pastes a copy of the selected shape', async () => {
		await installDiagnostics()
		await browser.execute(() => {
			editor.createShapes([
				{ id: 'shape:k', type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			] as any)
			editor.select('shape:k' as any)
		})
		expect(await getShapeCount()).toBe(1)

		await dumpDiagnostics('before chords')

		await pressAccel('c')
		await pressAccel('v')

		try {
			// Paste places a copy at an offset, so the page should now have 2 shapes.
			await browser.waitUntil(async () => (await getShapeCount()) === 2, {
				timeout: 5000,
				timeoutMsg: 'copy/paste shortcut did not create a second shape',
			})
		} finally {
			await dumpDiagnostics('after chords')
		}
	})
})

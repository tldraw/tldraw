import { expect } from '@wdio/globals'
import type { Editor } from 'tldraw'
import { openEditor } from '../helpers/app'
import { drawTouchStroke } from '../helpers/stroke'

declare const editor: Editor

/**
 * Guards the device-side contract behind 2D draw-shape encoding (#8963/#8879):
 * tldraw drops the constant pressure channel (z) from mouse/trackpad/finger
 * strokes, keyed off `isPenOrStylus` — which is inferred from the pressure the
 * BROWSER reports for the input device (Drawing.ts). The unit tests pick the
 * pressure values they feed in, so they verify the decision logic but not what
 * real engines actually report for a finger.
 *
 * That engine contract is the fragile part: 3D Touch iPhones really did report
 * varying force for plain finger touches. If an engine (re)introduces that,
 * finger strokes silently flip back to 3D — losing the storage win and making
 * stroke width track finger pressure — with no unit or Playwright test failing,
 * because those layers synthesize their own pressure values. Drawing through
 * the real OS touch pipeline and asserting the 2D encoding is the only
 * automated check that can catch it.
 *
 * Skips (rather than fails) on builds whose schema predates the segment `dim`
 * field, so the suite stays green until #8963 merges.
 */
describe('draw shape pressure encoding (#8963)', () => {
	beforeEach(async () => {
		await openEditor()
	})

	it('a finger-drawn stroke uses the 2D (no-pressure) encoding', async function () {
		// Feature-detect the `dim` field: on builds that predate #8963 the segment
		// validator rejects it, so probe with a throwaway shape and skip if absent.
		const dimSupported = await browser.execute(() => {
			try {
				editor.createShapes([
					{
						id: 'shape:dimprobe',
						type: 'draw',
						props: { segments: [{ type: 'free', path: '', dim: 2 }] },
					},
				] as any)
				editor.deleteShapes(['shape:dimprobe'] as any)
				return true
			} catch {
				return false
			}
		})
		if (!dimSupported) this.skip()

		// Block body: a concise arrow would implicitly return the (circular)
		// Editor instance, which can't be serialized over the WebDriver wire.
		await browser.execute(() => {
			editor.setCurrentTool('draw')
		})
		await drawTouchStroke({ from: { x: -80, y: -40 }, to: { x: 80, y: 40 } })

		const segments = await browser.execute(() => {
			const shape = editor.getCurrentPageShapes().find((s) => s.type === 'draw')
			if (!shape) return null
			return (shape as any).props.segments.map((s: any) => ({
				dim: s.dim,
				pathLength: s.path.length,
			}))
		})

		// The stroke produced a real draw shape with encoded points...
		expect(segments).not.toBeNull()
		expect(segments!.length).toBeGreaterThan(0)
		expect(segments!.every((s) => s.pathLength > 0)).toBe(true)
		// ...and the engine reported finger input as non-pressure, so every
		// segment took the 2D encoding. If this fails with dim undefined, the
		// browser has started reporting varying pressure for plain touches and
		// the classification in Drawing.ts needs revisiting.
		expect(segments!.every((s) => s.dim === 2)).toBe(true)
	})
})

import test, { expect } from '@playwright/test'
import { Editor } from 'tldraw'
import { recordPerfBaseline } from '../fixtures/perf-baseline'
import { setup } from '../shared-e2e'

declare const editor: Editor

// Microbenchmark for the text-measurement hot path. Text measurement is one of the heaviest
// parts of board rendering, and the cursive/RTL ink-bounds fix adds work to it, so this tracks:
//   - measureHtml: the existing advance-box measurement (the baseline cost)
//   - getGeometry:  a full per-shape geometry recompute on a cache miss (includes the ink pass)
//   - resize loop:  repeated width changes on one shape, as happens while dragging a resize handle
//
// It prints ms/op for LTR / RTL / italic content so the before/after-fix overhead is visible, and
// keeps only a loose smoke ceiling so it doesn't flake across machines. Run with `yarn e2e-perf`.

interface Bench {
	label: string
	measureHtmlMsPerOp: number
	geometryRecomputeMsPerOp: number
	resizeStepMsPerOp: number
}

const ITERATIONS = 200

test.describe('text measurement performance', () => {
	test.beforeEach(setup)
	test.setTimeout(120_000)

	test('measure / geometry / resize hot paths', async ({ page }, testInfo) => {
		// Desktop chromium only, like the sibling CPU-profile specs: emulated mobile timing is too
		// noisy for the smoke ceilings (and would race the shared perf baseline file).
		test.skip(testInfo.project.name !== 'chromium', 'microbenchmark runs on desktop chromium')

		const results: Bench[] = await page.evaluate(async (iterations) => {
			const ed = editor as any

			// performance.now() is coarsened in headless browsers, so per-op samples round to 0.
			// Time the whole loop and divide instead — the per-op cost averages out cleanly.
			function timeLoop(work: (i: number) => void) {
				// warm up
				for (let i = 0; i < 10; i++) work(i)
				const t = performance.now()
				for (let i = 0; i < iterations; i++) work(i)
				return (performance.now() - t) / iterations
			}

			function richDoc(text: string, italic: boolean) {
				return {
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text, marks: italic ? [{ type: 'italic' }] : undefined }],
						},
					],
				}
			}

			function renderHtml(text: string, italic: boolean) {
				const inner = italic ? `<em>${text}</em>` : text
				return `<p dir="auto">${inner}</p>`
			}

			const opts = {
				fontStyle: 'normal',
				fontWeight: 'normal',
				fontFamily: "'tldraw_draw', sans-serif",
				fontSize: 32,
				lineHeight: 1.35,
				maxWidth: null,
				padding: '0px',
			}

			async function benchOne(
				label: string,
				baseText: string,
				font: string,
				italic: boolean
			): Promise<any> {
				// 1) advance-only measurement (existing hot path). Vary the text each iteration so the
				//    browser can't trivially reuse a cached layout.
				const measureHtmlMsPerOp = timeLoop((i) => {
					const html = renderHtml(`${baseText} ${i}`, italic)
					ed.textMeasure.measureHtml(html, { ...opts, fontStyle: italic ? 'italic' : 'normal' })
				})

				// 2) full per-shape geometry recompute. Changing the text invalidates the computed
				//    cache, so each read does the real measurement work the canvas pays during edits.
				const id = 'shape:perfProbe'
				ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
				ed.createShape({
					id,
					type: 'text',
					x: 0,
					y: 0,
					props: { richText: richDoc(baseText, italic), font, size: 'xl', autoSize: true },
				})
				await ed.fonts.loadRequiredFontsForCurrentPage()
				await ed.getContainerDocument().fonts.ready
				const geometryRecomputeMsPerOp = timeLoop((i) => {
					ed.updateShape({
						id,
						type: 'text',
						props: { richText: richDoc(`${baseText} ${i}`, italic) },
					})
					ed.getShapeGeometry(id)
				})

				// 3) resize loop: a fixed-width shape whose width is nudged every step, reading geometry
				//    back each time — the pattern of dragging a resize handle.
				ed.updateShape({ id, type: 'text', props: { autoSize: false, w: 200 } })
				const resizeStepMsPerOp = timeLoop((i) => {
					ed.updateShape({ id, type: 'text', props: { w: 150 + (i % 200) } })
					ed.getShapeGeometry(id)
				})
				ed.deleteShapes([id])

				return {
					label,
					measureHtmlMsPerOp: +measureHtmlMsPerOp.toFixed(4),
					geometryRecomputeMsPerOp: +geometryRecomputeMsPerOp.toFixed(4),
					resizeStepMsPerOp: +resizeStepMsPerOp.toFixed(4),
				}
			}

			const out = []
			out.push(
				await benchOne('LTR latin', 'The quick brown fox jumps over the lazy dog', 'draw', false)
			)
			out.push(await benchOne('RTL arabic', 'مرحباً بكم في تلدرو كل يوم جديد', 'draw', false))
			out.push(
				await benchOne('italic serif', 'The quick brown fox jumps over the lazy dog', 'serif', true)
			)
			return out
		}, ITERATIONS)

		// Print a table so the before/after-fix cost is easy to eyeball.
		const table = results
			.map(
				(r) =>
					`  ${r.label.padEnd(14)} measureHtml=${r.measureHtmlMsPerOp}ms  geometry=${r.geometryRecomputeMsPerOp}ms  resizeStep=${r.resizeStepMsPerOp}ms`
			)
			.join('\n')
		// eslint-disable-next-line no-console
		console.log(`\nText measurement (median ms/op over ${ITERATIONS} iterations):\n${table}\n`)
		test
			.info()
			.annotations.push({ type: 'text-measurement-perf', description: JSON.stringify(results) })

		// Record against the committed baseline so a change's cost shows up in the PR diff. The
		// geometry recompute is the fix-relevant number — it includes the per-word ink pass.
		const baseline: Record<string, number> = {}
		for (const r of results) {
			baseline[`${r.label} measureHtml`] = r.measureHtmlMsPerOp
			baseline[`${r.label} geometry`] = r.geometryRecomputeMsPerOp
			baseline[`${r.label} resizeStep`] = r.resizeStepMsPerOp
		}
		recordPerfBaseline('text-measurement', baseline)

		// Loose smoke ceiling — a single text measurement should stay well under a frame budget.
		// This guards against a pathological regression (e.g. an O(n^2) ink scan) without flaking.
		for (const r of results) {
			expect(r.geometryRecomputeMsPerOp).toBeLessThan(8)
			expect(r.resizeStepMsPerOp).toBeLessThan(8)
		}
	})
})

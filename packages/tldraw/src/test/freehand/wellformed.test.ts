import { b64Vecs } from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { getStrokePoints } from '../../lib/shapes/shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../../lib/shapes/shared/freehand/svg'
import { svgInk } from '../../lib/shapes/shared/freehand/svgInk'
import { CORPUS, CorpusCase } from './corpus/strokes'

/**
 * Produce the svg path data tldraw would actually render for this case. Strokes with the 'draw'
 * dash style (mouse or pen) are rendered as a filled outline via svgInk; solid strokes and the
 * highlighter are rendered as a stroked centerline path.
 */
function renderCase(c: CorpusCase): string {
	if (c.kind === 'draw' || c.kind === 'pen') {
		return svgInk(c.points, c.options)
	}
	return getSvgPathFromStrokePoints(getStrokePoints(c.points, c.options), false)
}

// The unit tests on the individual functions can't catch a malformed path string coming out of
// the full pipeline, so check the path data tldraw would render for every corpus case.
describe('svg path data is well formed', () => {
	it.each(CORPUS.map((c) => [c.id, c] as const))('%s', (_id, c) => {
		const svg = renderCase(c)
		expect(svg.startsWith('M')).toBe(true)
		expect(svg).not.toContain('NaN')
		expect(svg).not.toContain('Infinity')
		// only valid path characters
		expect(svg).toMatch(/^[MLQTACZmlqtacz0-9 ,.-]+$/)
	})
})

// A draw shape stores its points b64Vecs-delta-encoded. A stroke spanning hundreds of thousands
// of units has point deltas beyond the Float16 range; these used to decode as Infinity/NaN,
// which the fast path writer emitted as NUL characters, so the browser rejected the whole `d`
// attribute and the stroke rendered nothing. See #10662.
describe('a stroke spanning hundreds of thousands of units', () => {
	it.each(CORPUS.filter((c) => c.kind === 'draw').map((c) => [c.id, c] as const))(
		'%s scaled up and roundtripped through b64Vecs renders well-formed path data',
		(_id, c) => {
			const scaled = c.points.map((p) => ({ x: p.x * 1500, y: p.y * 1250, z: p.z }))
			const decoded = b64Vecs.decodePoints(b64Vecs.encodePoints(scaled))
			for (const p of decoded) {
				expect(Number.isFinite(p.x)).toBe(true)
				expect(Number.isFinite(p.y)).toBe(true)
			}
			const svg = svgInk(decoded, c.options)
			expect(svg.startsWith('M')).toBe(true)
			expect(svg).not.toContain('\0')
			expect(svg).toMatch(/^[MLQTACZmlqtacz0-9 ,.-]+$/)
		}
	)
})

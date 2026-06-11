import { describe, expect, it } from 'vitest'
import { getStrokePoints } from '../lib/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../lib/svg'
import { svgInk } from '../lib/svgInk'
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

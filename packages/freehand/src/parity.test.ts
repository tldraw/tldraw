import { describe, expect, it } from 'vitest'
import { CORPUS } from './corpus/strokes'
import { candidateImpl, compareCase, runCase } from './harness/run'
import { MAX_DEVIATION_RATIO } from './harness/thresholds'

// The regression gate for optimization work: the candidate implementation must stay visually
// near-identical to the frozen baseline on every corpus case, and must never produce a larger
// output than the baseline.
describe('candidate parity with baseline', () => {
	it.each(CORPUS.map((c) => [c.id, c] as const))('%s', (_id, c) => {
		const { metrics } = compareCase(c)
		expect(metrics.maxDeviationRatio).toBeLessThanOrEqual(MAX_DEVIATION_RATIO)
		expect(metrics.candidate.points).toBeLessThanOrEqual(metrics.baseline.points)
		expect(metrics.candidate.svgLength).toBeLessThanOrEqual(metrics.baseline.svgLength)
	})
})

// The geometry checks above can't catch a malformed path string (the deviation is measured on
// the outline points, not the rendered svg), so check the path data is well formed too.
describe('candidate svg path data is well formed', () => {
	it.each(CORPUS.map((c) => [c.id, c] as const))('%s', (_id, c) => {
		const { svg } = runCase(candidateImpl, c)
		expect(svg.startsWith('M')).toBe(true)
		expect(svg).not.toContain('NaN')
		expect(svg).not.toContain('Infinity')
		// only valid path characters
		expect(svg).toMatch(/^[MLQTACZmlqtacz0-9 ,.-]+$/)
	})
})

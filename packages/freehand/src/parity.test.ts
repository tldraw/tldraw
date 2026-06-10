import { describe, expect, it } from 'vitest'
import { CORPUS } from './corpus/strokes'
import { compareCase } from './harness/run'
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

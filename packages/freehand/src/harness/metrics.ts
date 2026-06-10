import { VecModel } from '../vendor'

export interface OutputMetrics {
	/** Number of points in the output (outline points or stroke points). */
	points: number
	/** Length of the rendered SVG path data in characters. */
	svgLength: number
	/** Number of path commands in the rendered SVG path data. */
	svgCommands: number
	/** Median time to produce the output, in milliseconds. */
	ms: number
}

export interface DeviationMetrics {
	/** Largest distance (px) between the two outlines. */
	max: number
	/** Mean distance (px) between the two outlines. */
	mean: number
}

export interface CaseMetrics {
	id: string
	kind: string
	inputPoints: number
	strokeSize: number
	baseline: OutputMetrics
	candidate: OutputMetrics
	deviation: DeviationMetrics
	/** Max deviation normalized by the stroke size. */
	maxDeviationRatio: number
}

export function countSvgCommands(svg: string) {
	let count = 0
	for (let i = 0; i < svg.length; i++) {
		const c = svg.charCodeAt(i)
		// M L Q T A Z C m l q t a z c
		if (
			c === 77 ||
			c === 76 ||
			c === 81 ||
			c === 84 ||
			c === 65 ||
			c === 90 ||
			c === 67 ||
			c === 109 ||
			c === 108 ||
			c === 113 ||
			c === 116 ||
			c === 97 ||
			c === 122 ||
			c === 99
		) {
			count++
		}
	}
	return count
}

function distToSegmentSquared(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
) {
	const dx = bx - ax
	const dy = by - ay
	const l2 = dx * dx + dy * dy
	let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2
	t = t < 0 ? 0 : t > 1 ? 1 : t
	const ex = px - (ax + t * dx)
	const ey = py - (ay + t * dy)
	return ex * ex + ey * ey
}

/** Subsample an array down to at most `max` items, always keeping first and last. */
function subsample<T>(arr: T[], max: number): T[] {
	if (arr.length <= max) return arr
	const out: T[] = []
	const step = (arr.length - 1) / (max - 1)
	for (let i = 0; i < max; i++) {
		out.push(arr[Math.round(i * step)])
	}
	return out
}

const MAX_SAMPLES = 1500

/**
 * Directed deviation: for each vertex of `from`, the distance to the closest segment of `to`.
 * Returns max and sum (for mean computation). Subsamples the sampled vertices (not the target
 * segments — replacing target segments with longer chords would report false deviations) to
 * keep the harness fast.
 */
function directedDeviation(from: VecModel[], to: VecModel[], closed: boolean) {
	const samples = subsample(from, MAX_SAMPLES)
	const n = closed ? to.length : to.length - 1
	let max = 0
	let sum = 0
	for (const p of samples) {
		let best = Infinity
		for (let i = 0; i < n; i++) {
			const a = to[i]
			const b = to[(i + 1) % to.length]
			const d = distToSegmentSquared(p.x, p.y, a.x, a.y, b.x, b.y)
			if (d < best) best = d
		}
		const dist = Math.sqrt(best)
		if (dist > max) max = dist
		sum += dist
	}
	return { max, sum, count: samples.length }
}

/**
 * Symmetric deviation between two polylines (closed for stroke outlines, open for centerlines).
 * This is the core "are these strokes visually the same" number: the largest distance in px
 * between the shapes' boundaries.
 */
export function measureDeviation(
	baseline: VecModel[],
	candidate: VecModel[],
	closed: boolean
): DeviationMetrics {
	if (baseline.length === 0 && candidate.length === 0) return { max: 0, mean: 0 }
	if (baseline.length === 0 || candidate.length === 0) {
		return { max: Infinity, mean: Infinity }
	}
	if (baseline.length === 1 && candidate.length === 1) {
		const dx = baseline[0].x - candidate[0].x
		const dy = baseline[0].y - candidate[0].y
		const d = Math.sqrt(dx * dx + dy * dy)
		return { max: d, mean: d }
	}
	const ab = directedDeviation(baseline, candidate, closed)
	const ba = directedDeviation(candidate, baseline, closed)
	return {
		max: Math.max(ab.max, ba.max),
		mean: (ab.sum + ba.sum) / (ab.count + ba.count),
	}
}

/** Median time in ms to run `fn`, sized so small inputs get more repetitions. */
export function timeMedian(fn: () => void, minTotalMs = 20, maxReps = 100): number {
	// Warm up
	fn()
	fn()
	const times: number[] = []
	const start = performance.now()
	while (times.length < maxReps && performance.now() - start < minTotalMs) {
		const t0 = performance.now()
		fn()
		times.push(performance.now() - t0)
	}
	times.sort((a, b) => a - b)
	return times[Math.floor(times.length / 2)]
}

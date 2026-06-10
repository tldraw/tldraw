import { StrokeOptions } from '../lib/types'
import { VecModel } from '../vendor'
import {
	highlightSettings,
	realPressureSettings,
	simulatePressureSettings,
	solidSettings,
} from './presets'

/** A single comparison case: recorded input points plus the options tldraw would use. */
export interface CorpusCase {
	id: string
	/** What kind of tldraw stroke this represents. */
	kind: 'draw' | 'pen' | 'solid' | 'highlight'
	points: VecModel[]
	options: StrokeOptions
}

// Deterministic PRNG (mulberry32) so the corpus is identical on every run.
function rng(seed: number) {
	let a = seed
	return () => {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

interface SimOptions {
	seed: number
	/** Number of pointer samples to generate. */
	samples: number
	/** The parametric path being traced, t in [0, 1]. */
	path(t: number): { x: number; y: number }
	/** Hand jitter in px. */
	jitter?: number
	/** Speed modulation: how unevenly the hand moves along the path. */
	speedWobble?: number
	/** Pen pressure profile, t in [0, 1]. Defaults to a natural press-lift curve. */
	pressure?(t: number, random: () => number): number
}

/**
 * Simulate pointer input along a parametric path. Real input has uneven spacing (speed varies),
 * hand jitter, and smooth pressure changes; this reproduces those characteristics
 * deterministically.
 */
function simulateStroke({
	seed,
	samples,
	path,
	jitter = 0.35,
	speedWobble = 0.3,
	pressure = (t, random) =>
		0.3 + 0.45 * Math.sin(Math.min(t * 3, 1 + t * 0.2) * Math.PI * 0.5) + random() * 0.06,
}: SimOptions): VecModel[] {
	const random = rng(seed)
	const points: VecModel[] = []
	let t = 0
	// Advance along the path with a wobbling speed so spacing between samples
	// varies like a real hand: slow at the start, fast in the middle.
	for (let i = 0; i < samples; i++) {
		const progress = i / (samples - 1 || 1)
		const ease = 0.4 + Math.sin(progress * Math.PI) * 0.8 // slow-fast-slow
		const wobble = 1 + (random() - 0.5) * 2 * speedWobble
		t = Math.min(1, t + (ease * wobble) / samples)
		const { x, y } = path(t)
		points.push({
			x: x + (random() - 0.5) * 2 * jitter,
			y: y + (random() - 0.5) * 2 * jitter,
			z: Math.max(0, Math.min(1, pressure(progress, random))),
		})
	}
	return points
}

function line(x0: number, y0: number, x1: number, y1: number) {
	return (t: number) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t })
}

function cursive(width: number, loops: number, height: number) {
	return (t: number) => ({
		x: t * width + Math.sin(t * Math.PI * 2 * loops) * height * 0.3,
		y: 100 + Math.sin(t * Math.PI * 2 * loops + Math.PI / 2) * height,
	})
}

function spiral(cx: number, cy: number, turns: number, maxRadius: number) {
	return (t: number) => {
		const angle = t * Math.PI * 2 * turns
		const radius = 4 + t * maxRadius
		return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
	}
}

function zigzag(width: number, segments: number, height: number) {
	return (t: number) => {
		const u = t * segments
		const i = Math.floor(u)
		const frac = u - i
		const y0 = i % 2 === 0 ? 100 : 100 + height
		const y1 = i % 2 === 0 ? 100 + height : 100
		return { x: t * width, y: y0 + (y1 - y0) * frac }
	}
}

function scribble(seed: number, cx: number, cy: number, radius: number, knots: number) {
	// A wandering path through random waypoints, smoothed with cosine interpolation.
	const random = rng(seed)
	const waypoints = Array.from({ length: knots }, () => ({
		x: cx + (random() - 0.5) * 2 * radius,
		y: cy + (random() - 0.5) * 2 * radius,
	}))
	return (t: number) => {
		const u = Math.min(t * (knots - 1), knots - 1 - 1e-9)
		const i = Math.floor(u)
		const frac = (1 - Math.cos((u - i) * Math.PI)) / 2
		const a = waypoints[i]
		const b = waypoints[i + 1]
		return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }
	}
}

const flatPressure = () => 0.5

function makeCases(): CorpusCase[] {
	const cases: CorpusCase[] = []

	const add = (
		id: string,
		kind: CorpusCase['kind'],
		points: VecModel[],
		options: StrokeOptions,
		last = true
	) => {
		cases.push({ id, kind, points, options: { ...options, last } })
	}

	// --- Tiny strokes: dots and taps ---
	add('dot-single-point', 'draw', [{ x: 100, y: 100, z: 0.5 }], simulatePressureSettings(3.5))
	add(
		'dot-jittered-tap',
		'draw',
		simulateStroke({
			seed: 11,
			samples: 4,
			path: line(100, 100, 102, 101),
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5)
	)
	add(
		'dot-pen-tap',
		'pen',
		simulateStroke({ seed: 12, samples: 5, path: line(100, 100, 101, 102) }),
		realPressureSettings(3.5)
	)

	// --- Short strokes ---
	add(
		'short-flick',
		'draw',
		simulateStroke({
			seed: 21,
			samples: 9,
			path: line(100, 100, 260, 140),
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5)
	)
	add(
		'short-tick',
		'draw',
		simulateStroke({
			seed: 22,
			samples: 14,
			path: (t) =>
				t < 0.4
					? { x: 100 + t * 75, y: 100 + t * 100 }
					: { x: 130 + (t - 0.4) * 150, y: 140 - (t - 0.4) * 160 },
			pressure: flatPressure,
		}),
		simulatePressureSettings(5)
	)
	add(
		'short-pen-comma',
		'pen',
		simulateStroke({ seed: 23, samples: 18, path: cursive(40, 0.5, 24) }),
		realPressureSettings(2)
	)
	add(
		'short-solid-line',
		'solid',
		simulateStroke({
			seed: 24,
			samples: 12,
			path: line(100, 100, 300, 220),
			pressure: flatPressure,
		}),
		solidSettings(3.5)
	)

	// --- Medium strokes ---
	add(
		'medium-cursive-word',
		'draw',
		simulateStroke({
			seed: 31,
			samples: 220,
			path: cursive(420, 5, 36),
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5)
	)
	add(
		'medium-pen-signature',
		'pen',
		simulateStroke({ seed: 32, samples: 260, path: cursive(380, 7, 48), jitter: 0.5 }),
		realPressureSettings(3.5)
	)
	add(
		'medium-zigzag-sharp',
		'draw',
		simulateStroke({
			seed: 33,
			samples: 180,
			path: zigzag(420, 9, 90),
			pressure: flatPressure,
		}),
		simulatePressureSettings(5)
	)
	add(
		'medium-spiral',
		'draw',
		simulateStroke({
			seed: 34,
			samples: 240,
			path: spiral(300, 300, 4, 160),
			pressure: flatPressure,
		}),
		simulatePressureSettings(2)
	)
	add(
		'medium-scribble-fast',
		'draw',
		simulateStroke({
			seed: 35,
			samples: 150,
			path: scribble(35, 300, 300, 180, 14),
			jitter: 0.8,
			speedWobble: 0.5,
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5)
	)
	add(
		'medium-highlight-wave',
		'highlight',
		simulateStroke({
			seed: 36,
			samples: 160,
			path: cursive(480, 3, 30),
			pressure: flatPressure,
		}),
		highlightSettings(16)
	)
	add(
		'medium-solid-curve',
		'solid',
		simulateStroke({
			seed: 37,
			samples: 200,
			path: spiral(300, 300, 1.5, 200),
			pressure: flatPressure,
		}),
		solidSettings(10)
	)
	add(
		'medium-in-progress',
		'draw',
		simulateStroke({
			seed: 38,
			samples: 180,
			path: cursive(400, 4, 40),
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5),
		false // still being drawn
	)

	// --- Long strokes ---
	add(
		'long-handwriting-line',
		'draw',
		simulateStroke({
			seed: 41,
			samples: 1200,
			path: cursive(2400, 28, 40),
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5)
	)
	add(
		'long-pen-paragraph',
		'pen',
		simulateStroke({
			seed: 42,
			samples: 1600,
			path: (t) => {
				// Three lines of "handwriting", wrapping like a paragraph
				const row = Math.min(2, Math.floor(t * 3))
				const u = t * 3 - row
				const p = cursive(1400, 16, 32)(u)
				return { x: p.x, y: p.y + row * 110 }
			},
			pressure: (t, random) => 0.35 + 0.35 * Math.sin(t * Math.PI * 40) ** 2 + random() * 0.05,
		}),
		realPressureSettings(2)
	)
	add(
		'long-scribble-fill',
		'draw',
		simulateStroke({
			seed: 43,
			samples: 2000,
			path: scribble(43, 500, 400, 380, 80),
			jitter: 1,
			speedWobble: 0.6,
			pressure: flatPressure,
		}),
		simulatePressureSettings(5)
	)
	add(
		'long-spiral-dense',
		'draw',
		simulateStroke({
			seed: 44,
			samples: 2400,
			path: spiral(600, 600, 14, 520),
			pressure: flatPressure,
		}),
		simulatePressureSettings(3.5)
	)
	add(
		'long-highlight-strikes',
		'highlight',
		simulateStroke({
			seed: 45,
			samples: 1000,
			path: zigzag(1800, 24, 200),
			pressure: flatPressure,
		}),
		highlightSettings(28)
	)

	return cases
}

/** The full deterministic corpus of comparison cases. */
export const CORPUS: CorpusCase[] = makeCases()

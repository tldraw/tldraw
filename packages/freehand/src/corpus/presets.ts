import { StrokeOptions } from '../lib/types'

// These presets mirror the StrokeOptions that tldraw actually passes to the
// freehand algorithm. See packages/tldraw/src/lib/shapes/draw/getPath.ts.

const PEN_EASING = (t: number) => t * 0.65 + Math.sin((t * Math.PI) / 2) * 0.35

// Mirrors `EASINGS.linear` and `EASINGS.easeOutSine` from `@tldraw/editor`.
const linear = (t: number) => t
const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2)

/** Mirrors `modulate` from `@tldraw/utils`. */
function modulate(value: number, rangeA: number[], rangeB: number[], clamp = false): number {
	const [fromLow, fromHigh] = rangeA
	const [v0, v1] = rangeB
	const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)

	return clamp
		? v0 < v1
			? Math.max(Math.min(result, v1), v0)
			: Math.max(Math.min(result, v0), v1)
		: result
}

/** The 'draw' dash style with a mouse or finger (pressure is simulated). */
export function simulatePressureSettings(strokeWidth: number): StrokeOptions {
	return {
		size: strokeWidth,
		thinning: 0.5,
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true),
		smoothing: 0.62,
		easing: easeOutSine,
		simulatePressure: true,
	}
}

/** The 'draw' dash style with a stylus (real pressure). */
export function realPressureSettings(strokeWidth: number): StrokeOptions {
	return {
		size: 1 + strokeWidth * 1.2,
		thinning: 0.62,
		streamline: 0.62,
		smoothing: 0.62,
		simulatePressure: false,
		easing: PEN_EASING,
	}
}

/** The solid / dashed / dotted dash styles (constant width). */
export function solidSettings(strokeWidth: number): StrokeOptions {
	return {
		size: strokeWidth,
		thinning: 0,
		streamline: modulate(strokeWidth, [9, 16], [0.64, 0.74], true),
		smoothing: 0.62,
		simulatePressure: false,
		easing: linear,
	}
}

/** The highlighter shape. */
export function highlightSettings(strokeWidth: number): StrokeOptions {
	return {
		size: 1 + strokeWidth,
		thinning: 0,
		streamline: 0.5,
		smoothing: 0.5,
		simulatePressure: false,
		easing: easeOutSine,
	}
}

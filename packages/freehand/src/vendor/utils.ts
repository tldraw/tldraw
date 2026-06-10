import { VecLike } from './Vec'

/**
 * The DOM likes values to be fixed to 3 decimal places. Mirrors `toDomPrecision` from
 * `@tldraw/editor`.
 *
 * @public
 */
export function toDomPrecision(v: number) {
	return Math.round(v * 1e4) / 1e4
}

/** Mirrors `precise` from `@tldraw/editor`. @public */
export function precise(A: VecLike) {
	return `${toDomPrecision(A.x)},${toDomPrecision(A.y)} `
}

/** Mirrors `average` from `@tldraw/editor`. @public */
export function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}

/** Mirrors `assert` from `@tldraw/utils`. @public */
export function assert(value: unknown, message?: string): asserts value {
	if (!value) {
		throw new Error(message || 'Assertion Error')
	}
}

/** Mirrors `modulate` from `@tldraw/utils`. @public */
export function modulate(value: number, rangeA: number[], rangeB: number[], clamp = false): number {
	const [fromLow, fromHigh] = rangeA
	const [v0, v1] = rangeB
	const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)

	return clamp
		? v0 < v1
			? Math.max(Math.min(result, v1), v0)
			: Math.max(Math.min(result, v0), v1)
		: result
}

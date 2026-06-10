import { VecLike } from '../vendor'

/**
 * The DOM likes values to be fixed to 3 decimal places. Mirrors `toDomPrecision` from
 * `@tldraw/editor`.
 */
export function toDomPrecision(v: number) {
	return Math.round(v * 1e4) / 1e4
}

/** Mirrors `precise` from `@tldraw/editor`. */
export function precise(A: VecLike) {
	return `${toDomPrecision(A.x)},${toDomPrecision(A.y)} `
}

/** Mirrors `average` from `@tldraw/editor`. */
export function average(A: VecLike, B: VecLike) {
	return `${toDomPrecision((A.x + B.x) / 2)},${toDomPrecision((A.y + B.y) / 2)} `
}

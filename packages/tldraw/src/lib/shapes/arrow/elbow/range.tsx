import { assert, clamp } from '@tldraw/editor'

export interface Range {
	min: number
	max: number
}

export function expandRange(range: Range, amount: number) {
	const newRange: Range = {
		min: range.min - amount,
		max: range.max + amount,
	}
	if (newRange.min > newRange.max) {
		return null
	}
	return newRange
}

export function clampToRange(value: number, range: Range) {
	return clamp(value, range.min, range.max)
}

/**
 * Subtract the range b from the range a. If b is completely inside a, return the two ranges of a
 * that are outside of b. If b contains a, return []. Otherwise, return the range of a that is
 * outside of b.
 */
export function subtractRange(a: Range, b: Range): [] | [Range] | [Range, Range] {
	assert(a.min <= a.max && b.min <= b.max)

	// if b is completely inside a:
	if (a.min <= b.min && b.max <= a.max) {
		return [
			{ min: a.min, max: b.min },
			{ min: b.max, max: a.max },
		]
	}

	// if b is completely outside of a:
	if (b.max <= a.min || b.min >= a.max) {
		return [a]
	}

	// if b fully contains a:
	if (b.min <= a.min && a.max <= b.max) {
		return []
	}

	// if b overlaps a on the low side:
	if (isWithinRange(a.min, b)) {
		return [{ min: b.max, max: a.max }]
	}

	// if b overlaps a on the high side:
	if (isWithinRange(a.max, b)) {
		return [{ min: a.min, max: b.min }]
	}

	// unreachable (?)
	return []
}

export function createRange(a: number, b: number) {
	return { min: Math.min(a, b), max: Math.max(a, b) }
}

export function doRangesOverlap(a: Range, b: Range) {
	return a.min <= b.max && a.max >= b.min
}

export function isWithinRange(value: number, range: Range) {
	return value >= range.min && value <= range.max
}

export function rangeSize(range: Range) {
	return range.max - range.min
}

export function rangeCenter(range: Range) {
	return (range.min + range.max) / 2
}

const SPACING = 20
const MIN_COUNT = 8

/** @internal */
export function getVerticesCountForArcLength(length: number, spacing = SPACING) {
	return Math.max(MIN_COUNT, Math.ceil(length / spacing))
}

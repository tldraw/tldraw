export const SPACING = 20
export const MIN_COUNT = 8

export function getVerticesCountForLength(length: number, spacing = SPACING) {
	return Math.max(MIN_COUNT, Math.ceil(length / spacing))
}

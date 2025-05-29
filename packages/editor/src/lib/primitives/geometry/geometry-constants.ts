const SPACING = 20
const MIN_COUNT = 8

export function getVerticesCountForLength(length: number, spacing = SPACING) {
	const num = Math.max(MIN_COUNT, Math.ceil(length / spacing))
	return num + (4 - (num % 4))
}

export function getVerticesCountForLength(length: number, spacing = 20) {
	return Math.max(8, Math.ceil(length / spacing))
}

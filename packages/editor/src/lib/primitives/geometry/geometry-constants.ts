export const ARC_SEGMENT_SIZE = 20
export const ARC_MIN_SEGMENT_COUNT = 8

export function getArcSegmentCount(length: number) {
	return Math.max(ARC_MIN_SEGMENT_COUNT, Math.floor(length / ARC_SEGMENT_SIZE))
}

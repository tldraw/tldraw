import { Box, Vec, VecLike } from 'tldraw'

export const iArrowErrors = {
	BACKWARDS: 'BACKWARDS',
	ANGLED: 'ANGLED',
}

export type IArrowErrors = (typeof iArrowErrors)[keyof typeof iArrowErrors]

export function getIArrow(
	dir: VecLike,
	boxA: Box,
	boxB: Box
): { error: IArrowErrors } | { error: false; path: Vec[] } {
	const center = Vec.Lrp(boxA.center, boxB.center, 0.5)
	if (dir.x === 1 && dir.y === 0) {
		return { error: false, path: [new Vec(boxA.maxX, center.y), new Vec(boxB.minX, center.y)] }
	} else if (dir.x === -1 && dir.y === 0) {
		return { error: false, path: [new Vec(boxA.minX, center.y), new Vec(boxB.maxX, center.y)] }
	} else if (dir.x === 0 && dir.y === 1) {
		return { error: false, path: [new Vec(center.x, boxA.maxY), new Vec(center.x, boxB.minY)] }
	} else if (dir.x === 0 && dir.y === -1) {
		return { error: false, path: [new Vec(center.x, boxB.maxY), new Vec(center.x, boxA.minY)] }
	}

	return {
		error: iArrowErrors.ANGLED,
	}
}

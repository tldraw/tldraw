import { Box, Vec } from 'tldraw'
import { MINIMUM_LEG_LENGTH } from './constants'
import { getClosestMidpoint } from './getClosestMidpoint'
import { sArrowErrors } from './s-arrow'

export const lArrowErrors = {
	NO_FIRST_STEP: 'NO_FIRST_STEP',
	NO_SECOND_STEP: 'NO_SECOND_STEP',
	NO_THIRD_STEP: 'NO_THIRD_STEP',
	FIRST_LEG_TOO_SHORT: 'FIRST_LEG_TOO_SHORT',
	SECOND_LEG_TOO_SHORT: 'SECOND_LEG_TOO_SHORT',
}

export type LArrowErrors = (typeof lArrowErrors)[keyof typeof lArrowErrors]

export function getLArrow(
	start: Box,
	end: Box
): { error: LArrowErrors; path: Vec[] } | { error: false; path: Vec[] } {
	const path: Vec[] = []

	const center = Vec.Lrp(start.center, end.center, 0.5)

	const p1 = getClosestMidpoint(start, center)

	if (!p1) {
		return { error: sArrowErrors.NO_FIRST_STEP, path }
	}

	// Next, find the corner closest to that point
	let p2: Vec | undefined
	const commonBounds = Box.FromPoints([start.center, end.center])
	for (const corner of commonBounds.corners) {
		if (Vec.Sub(corner, p1).uni().equals(Vec.Sub(p1, start.center).uni())) {
			p2 = corner
			break
		}
	}

	if (!p2) {
		return { error: lArrowErrors.NO_SECOND_STEP, path }
	}

	const p3 = getClosestMidpoint(end, p2)

	if (!p3) {
		return { error: lArrowErrors.NO_THIRD_STEP, path }
	}

	path.push(p1, p2, p3)

	if (Vec.Dist(p1, p2) < MINIMUM_LEG_LENGTH) {
		return { error: lArrowErrors.FIRST_LEG_TOO_SHORT, path }
	}

	if (Vec.Dist(p2, p3) < MINIMUM_LEG_LENGTH) {
		return { error: lArrowErrors.SECOND_LEG_TOO_SHORT, path }
	}

	return { error: false, path }
}

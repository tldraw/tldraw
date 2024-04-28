import { TLDefaultDashStyle, TLDrawShape, TLDrawShapeSegment, Vec } from '@tldraw/editor'
import { tldrawConstants } from '../../tldraw-constants'
import { StrokeOptions } from '../shared/freehand/types'
const { FREEHAND_OPTIONS } = tldrawConstants
const { solid, realPressure, simulatedPressure } = FREEHAND_OPTIONS

export function getFreehandOptions(
	shapeProps: { dash: TLDefaultDashStyle; isPen: boolean; isComplete: boolean },
	strokeWidth: number,
	forceComplete: boolean,
	forceSolid: boolean
): StrokeOptions {
	return {
		...(forceSolid
			? solid(strokeWidth)
			: shapeProps.dash === 'draw'
				? shapeProps.isPen
					? realPressure(strokeWidth)
					: simulatedPressure(strokeWidth)
				: solid(strokeWidth)),
		last: shapeProps.isComplete || forceComplete,
	}
}

export function getPointsFromSegments(segments: TLDrawShapeSegment[]) {
	const points: Vec[] = []

	for (const segment of segments) {
		if (segment.type === 'free' || segment.points.length < 2) {
			points.push(...segment.points.map(Vec.Cast))
		} else {
			const pointsToInterpolate = Math.max(
				4,
				Math.floor(Vec.Dist(segment.points[0], segment.points[1]) / 16)
			)
			points.push(...Vec.PointsBetween(segment.points[0], segment.points[1], pointsToInterpolate))
		}
	}

	return points
}

export function getDrawShapeStrokeDashArray(shape: TLDrawShape, strokeWidth: number) {
	return {
		draw: 'none',
		solid: `none`,
		dotted: `0.1 ${strokeWidth * 2}`,
		dashed: `${strokeWidth * 2} ${strokeWidth * 2}`,
	}[shape.props.dash]
}

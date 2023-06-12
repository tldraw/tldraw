export {
	Box2d,
	ROTATE_CORNER_TO_SELECTION_CORNER,
	flipSelectionHandleX,
	flipSelectionHandleY,
	isSelectionCorner,
	rotateSelectionHandle,
	type RotateCorner,
	type SelectionCorner,
	type SelectionEdge,
	type SelectionHandle,
} from './lib/Box2d'
export { CubicSegment2d, type CubicSegment2dModel } from './lib/CubicSegment2d'
export { CubicSpline2d } from './lib/CubicSpline2d'
export { LineSegment2d, type LineSegment2dModel } from './lib/LineSegment2d'
export {
	Matrix2d,
	decomposeMatrix2d,
	type MatLike,
	type Matrix2dModel,
	type MatrixInfo,
} from './lib/Matrix2d'
export { Polyline2d } from './lib/Polyline2d'
export { Vec2d, type VecLike } from './lib/Vec2d'
export { EASINGS, type EasingType } from './lib/easings'
export { getStroke } from './lib/freehand/getStroke'
export { getStrokeOutlinePoints } from './lib/freehand/getStrokeOutlinePoints'
export { getStrokePoints } from './lib/freehand/getStrokePoints'
export { setStrokePointRadii } from './lib/freehand/setStrokePointRadii'
export { type StrokeOptions, type StrokePoint } from './lib/freehand/types'
export {
	intersectCircleCircle,
	intersectCirclePolygon,
	intersectCirclePolyline,
	intersectLineSegmentCircle,
	intersectLineSegmentLineSegment,
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	intersectPolygonBounds,
	intersectPolygonPolygon,
	linesIntersect,
	polygonsIntersect,
} from './lib/intersect'
export {
	getDrawLinePathData,
	getRoundedInkyPolygonPath,
	getRoundedPolygonPoints,
} from './lib/polygon-helpers'
export {
	EPSILON,
	PI,
	PI2,
	SIN,
	TAU,
	angleDelta,
	approximately,
	areAnglesCompatible,
	canolicalizeRotation,
	clamp,
	clampRadians,
	degreesToRadians,
	getArcLength,
	getHeight,
	getMaxX,
	getMaxY,
	getMidX,
	getMidY,
	getMinX,
	getMinY,
	getPointOnCircle,
	getPolygonVertices,
	getStarBounds,
	getSweep,
	getWidth,
	isAngleBetween,
	isSafeFloat,
	lerpAngles,
	longAngleDist,
	perimeterOfEllipse,
	pointInBounds,
	pointInCircle,
	pointInEllipse,
	pointInPolygon,
	pointInPolyline,
	pointInRect,
	pointNearToLineSegment,
	pointNearToPolyline,
	radiansToDegrees,
	rangeIntersection,
	rangesOverlap,
	shortAngleDist,
	simplify,
	simplify2,
	snapAngle,
	toDomPrecision,
	toFixed,
	toPrecision,
} from './lib/utils'

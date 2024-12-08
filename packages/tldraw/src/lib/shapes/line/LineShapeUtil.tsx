import {
	CubicSpline2d,
	Group2d,
	HandleSnapGeometry,
	Polyline2d,
	SVGContainer,
	ShapeUtil,
	TLHandle,
	TLHandleDragInfo,
	TLLineShape,
	TLLineShapePoint,
	TLResizeInfo,
	Vec,
	WeakCache,
	ZERO_INDEX_KEY,
	getIndexAbove,
	getIndexBetween,
	getIndices,
	getPerfectDashProps,
	lerp,
	lineShapeMigrations,
	lineShapeProps,
	mapObjectMapValues,
	maybeSnapToGrid,
	sortByIndex,
} from '@tldraw/editor'

import { STROKE_SIZES } from '../arrow/shared'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { getLineDrawPath, getLineIndicatorPath } from './components/getLinePath'
import { getDrawLinePathData } from './line-helpers'

const handlesCache = new WeakCache<TLLineShape['props'], TLHandle[]>()

/** @public */
export class LineShapeUtil extends ShapeUtil<TLLineShape> {
	static override type = 'line' as const
	static override props = lineShapeProps
	static override migrations = lineShapeMigrations

	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}

	override getDefaultProps(): TLLineShape['props'] {
		const [start, end] = getIndices(2)
		return {
			dash: 'draw',
			size: 'm',
			color: 'black',
			spline: 'line',
			points: {
				[start]: { id: start, index: start, x: 0, y: 0 },
				[end]: { id: end, index: end, x: 0.1, y: 0.1 },
			},
			scale: 1,
		}
	}

	getGeometry(shape: TLLineShape) {
		// todo: should we have min size?
		return getGeometryForLineShape(shape)
	}

	override getHandles(shape: TLLineShape) {
		return handlesCache.get(shape.props, () => {
			const spline = getGeometryForLineShape(shape)

			const points = linePointsToArray(shape)
			const results: TLHandle[] = points.map((point) => ({
				...point,
				id: point.index,
				type: 'vertex',
				canSnap: true,
			}))

			for (let i = 0; i < points.length - 1; i++) {
				const index = getIndexBetween(points[i].index, points[i + 1].index)
				const segment = spline.segments[i]
				const point = segment.midPoint()
				results.push({
					id: index,
					type: 'create',
					index,
					x: point.x,
					y: point.y,
					canSnap: true,
				})
			}

			return results.sort(sortByIndex)
		})
	}

	//   Events

	override onResize(shape: TLLineShape, info: TLResizeInfo<TLLineShape>) {
		const { scaleX, scaleY } = info

		return {
			props: {
				points: mapObjectMapValues(shape.props.points, (_, { id, index, x, y }) => ({
					id,
					index,
					x: x * scaleX,
					y: y * scaleY,
				})),
			},
		}
	}

	override onBeforeCreate(next: TLLineShape): void | TLLineShape {
		const {
			props: { points },
		} = next
		const pointKeys = Object.keys(points)

		if (pointKeys.length < 2) {
			return
		}

		const firstPoint = points[pointKeys[0]]
		const allSame = pointKeys.every((key) => {
			const point = points[key]
			return point.x === firstPoint.x && point.y === firstPoint.y
		})
		if (allSame) {
			const lastKey = pointKeys[pointKeys.length - 1]
			points[lastKey] = {
				...points[lastKey],
				x: points[lastKey].x + 0.1,
				y: points[lastKey].y + 0.1,
			}
			return next
		}
		return
	}

	override onHandleDrag(shape: TLLineShape, { handle }: TLHandleDragInfo<TLLineShape>) {
		// we should only ever be dragging vertex handles
		if (handle.type !== 'vertex') return
		const newPoint = maybeSnapToGrid(new Vec(handle.x, handle.y), this.editor)
		return {
			...shape,
			props: {
				...shape.props,
				points: {
					...shape.props.points,
					[handle.id]: { id: handle.id, index: handle.index, x: newPoint.x, y: newPoint.y },
				},
			},
		}
	}

	component(shape: TLLineShape) {
		return (
			<SVGContainer>
				<LineShapeSvg shape={shape} />
			</SVGContainer>
		)
	}

	indicator(shape: TLLineShape) {
		const strokeWidth = STROKE_SIZES[shape.props.size] * shape.props.scale
		const spline = getGeometryForLineShape(shape)
		const { dash } = shape.props

		let path: string

		if (shape.props.spline === 'line') {
			const outline = spline.points
			if (dash === 'solid' || dash === 'dotted' || dash === 'dashed') {
				path = 'M' + outline[0] + 'L' + outline.slice(1)
			} else {
				const [innerPathData] = getDrawLinePathData(shape.id, outline, strokeWidth)
				path = innerPathData
			}
		} else {
			path = getLineIndicatorPath(shape, spline, strokeWidth)
		}

		return <path d={path} />
	}

	override toSvg(shape: TLLineShape) {
		return <LineShapeSvg shouldScale shape={shape} />
	}

	override getHandleSnapGeometry(shape: TLLineShape): HandleSnapGeometry {
		const points = linePointsToArray(shape)
		return {
			points,
			getSelfSnapPoints: (handle) => {
				const index = this.getHandles(shape)
					.filter((h) => h.type === 'vertex')
					.findIndex((h) => h.id === handle.id)!

				// We want to skip the current and adjacent handles
				return points.filter((_, i) => Math.abs(i - index) > 1).map(Vec.From)
			},
			getSelfSnapOutline: (handle) => {
				// We want to skip the segments that include the handle, so
				// find the index of the handle that shares the same index property
				// as the initial dragging handle; this catches a quirk of create handles
				const index = this.getHandles(shape)
					.filter((h) => h.type === 'vertex')
					.findIndex((h) => h.id === handle.id)!

				// Get all the outline segments from the shape that don't include the handle
				const segments = getGeometryForLineShape(shape).segments.filter(
					(_, i) => i !== index - 1 && i !== index
				)

				if (!segments.length) return null
				return new Group2d({ children: segments })
			},
		}
	}
	override getInterpolatedProps(
		startShape: TLLineShape,
		endShape: TLLineShape,
		t: number
	): TLLineShape['props'] {
		const startPoints = linePointsToArray(startShape)
		const endPoints = linePointsToArray(endShape)

		const pointsToUseStart: TLLineShapePoint[] = []
		const pointsToUseEnd: TLLineShapePoint[] = []

		let index = ZERO_INDEX_KEY

		if (startPoints.length > endPoints.length) {
			// we'll need to expand points
			for (let i = 0; i < startPoints.length; i++) {
				pointsToUseStart[i] = { ...startPoints[i] }
				if (endPoints[i] === undefined) {
					pointsToUseEnd[i] = { ...endPoints[endPoints.length - 1], id: index }
				} else {
					pointsToUseEnd[i] = { ...endPoints[i], id: index }
				}
				index = getIndexAbove(index)
			}
		} else if (endPoints.length > startPoints.length) {
			// we'll need to converge points
			for (let i = 0; i < endPoints.length; i++) {
				pointsToUseEnd[i] = { ...endPoints[i] }
				if (startPoints[i] === undefined) {
					pointsToUseStart[i] = {
						...startPoints[startPoints.length - 1],
						id: index,
					}
				} else {
					pointsToUseStart[i] = { ...startPoints[i], id: index }
				}
				index = getIndexAbove(index)
			}
		} else {
			// noop, easy
			for (let i = 0; i < endPoints.length; i++) {
				pointsToUseStart[i] = startPoints[i]
				pointsToUseEnd[i] = endPoints[i]
			}
		}

		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			points: Object.fromEntries(
				pointsToUseStart.map((point, i) => {
					const endPoint = pointsToUseEnd[i]
					return [
						point.id,
						{
							...point,
							x: lerp(point.x, endPoint.x, t),
							y: lerp(point.y, endPoint.y, t),
						},
					]
				})
			),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}
}

function linePointsToArray(shape: TLLineShape) {
	return Object.values(shape.props.points).sort(sortByIndex)
}

/** @public */
export function getGeometryForLineShape(shape: TLLineShape): CubicSpline2d | Polyline2d {
	const points = linePointsToArray(shape).map(Vec.From)

	switch (shape.props.spline) {
		case 'cubic': {
			return new CubicSpline2d({ points })
		}
		case 'line': {
			return new Polyline2d({ points })
		}
	}
}

function LineShapeSvg({
	shape,
	shouldScale = false,
	forceSolid = false,
}: {
	shape: TLLineShape
	shouldScale?: boolean
	forceSolid?: boolean
}) {
	const theme = useDefaultColorTheme()

	const spline = getGeometryForLineShape(shape)
	const { dash, color, size } = shape.props

	const scaleFactor = 1 / shape.props.scale

	const scale = shouldScale ? scaleFactor : 1

	const strokeWidth = STROKE_SIZES[size] * shape.props.scale

	// Line style lines
	if (shape.props.spline === 'line') {
		if (dash === 'solid') {
			const outline = spline.points
			const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

			return (
				<path
					d={pathData}
					stroke={theme[color].solid}
					strokeWidth={strokeWidth}
					fill="none"
					transform={`scale(${scale})`}
				/>
			)
		}

		if (dash === 'dashed' || dash === 'dotted') {
			return (
				<g stroke={theme[color].solid} strokeWidth={strokeWidth} transform={`scale(${scale})`}>
					{spline.segments.map((segment, i) => {
						const { strokeDasharray, strokeDashoffset } = forceSolid
							? { strokeDasharray: 'none', strokeDashoffset: 'none' }
							: getPerfectDashProps(segment.length, strokeWidth, {
									style: dash,
									start: i > 0 ? 'outset' : 'none',
									end: i < spline.segments.length - 1 ? 'outset' : 'none',
								})

						return (
							<path
								key={i}
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								d={segment.getSvgPathData(true)}
								fill="none"
							/>
						)
					})}
				</g>
			)
		}

		if (dash === 'draw') {
			const outline = spline.points
			const [_, outerPathData] = getDrawLinePathData(shape.id, outline, strokeWidth)

			return (
				<path
					d={outerPathData}
					stroke={theme[color].solid}
					strokeWidth={strokeWidth}
					fill="none"
					transform={`scale(${scale})`}
				/>
			)
		}
	}
	// Cubic style spline
	if (shape.props.spline === 'cubic') {
		const splinePath = spline.getSvgPathData()
		if (dash === 'solid') {
			return (
				<path
					strokeWidth={strokeWidth}
					stroke={theme[color].solid}
					fill="none"
					d={splinePath}
					transform={`scale(${scale})`}
				/>
			)
		}

		if (dash === 'dashed' || dash === 'dotted') {
			return (
				<g stroke={theme[color].solid} strokeWidth={strokeWidth} transform={`scale(${scale})`}>
					{spline.segments.map((segment, i) => {
						const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
							segment.length,
							strokeWidth,
							{
								style: dash,
								start: i > 0 ? 'outset' : 'none',
								end: i < spline.segments.length - 1 ? 'outset' : 'none',
								forceSolid,
							}
						)

						return (
							<path
								key={i}
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								d={segment.getSvgPathData()}
								fill="none"
							/>
						)
					})}
				</g>
			)
		}

		if (dash === 'draw') {
			return (
				<path
					d={getLineDrawPath(shape, spline, strokeWidth)}
					strokeWidth={1}
					stroke={theme[color].solid}
					fill={theme[color].solid}
					transform={`scale(${scale})`}
				/>
			)
		}
	}
}

import {
	CubicSpline2d,
	Group2d,
	HandleSnapGeometry,
	Polyline2d,
	SVGContainer,
	ShapeUtil,
	TLHandle,
	TLLineShape,
	TLOnHandleDragHandler,
	TLOnResizeHandler,
	Vec,
	WeakCache,
	getIndexBetween,
	getIndices,
	lineShapeMigrations,
	lineShapeProps,
	mapObjectMapValues,
	sortByIndex,
} from '@tldraw/editor'

import { ShapeFill, useDefaultColorTheme } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { getDrawLinePathData } from '../shared/polygon-helpers'
import { getLineDrawPath, getLineIndicatorPath } from './components/getLinePath'
import {
	getSvgPathForBezierCurve,
	getSvgPathForEdge,
	getSvgPathForLineGeometry,
} from './components/svg'

const handlesCache = new WeakCache<TLLineShape['props'], TLHandle[]>()

/** @public */
export class LineShapeUtil extends ShapeUtil<TLLineShape> {
	static override type = 'line' as const
	static override props = lineShapeProps
	static override migrations = lineShapeMigrations

	override hideResizeHandles = () => true
	override hideRotateHandle = () => true
	override hideSelectionBoundsFg = () => true
	override hideSelectionBoundsBg = () => true

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

	override onResize: TLOnResizeHandler<TLLineShape> = (shape, info) => {
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

	override onHandleDrag: TLOnHandleDragHandler<TLLineShape> = (shape, { handle }) => {
		// we should only ever be dragging vertex handles
		if (handle.type !== 'vertex') return

		return {
			...shape,
			props: {
				...shape.props,
				points: {
					...shape.props.points,
					[handle.id]: { id: handle.id, index: handle.index, x: handle.x, y: handle.y },
				},
			},
		}
	}

	component(shape: TLLineShape) {
		return (
			<SVGContainer id={shape.id}>
				<LineShapeSvg shape={shape} />
			</SVGContainer>
		)
	}

	indicator(shape: TLLineShape) {
		const strokeWidth = STROKE_SIZES[shape.props.size]
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
		return <LineShapeSvg shape={shape} />
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

function LineShapeSvg({ shape }: { shape: TLLineShape }) {
	const theme = useDefaultColorTheme()
	const spline = getGeometryForLineShape(shape)
	const strokeWidth = STROKE_SIZES[shape.props.size]

	const { dash, color } = shape.props

	// Line style lines
	if (shape.props.spline === 'line') {
		if (dash === 'solid') {
			const outline = spline.points
			const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

			return (
				<>
					<ShapeFill d={pathData} fill={'none'} color={color} theme={theme} />
					<path d={pathData} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
				</>
			)
		}

		if (dash === 'dashed' || dash === 'dotted') {
			const outline = spline.points
			const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

			return (
				<>
					<ShapeFill d={pathData} fill={'none'} color={color} theme={theme} />
					<g stroke={theme[color].solid} strokeWidth={strokeWidth}>
						{spline.segments.map((segment, i) => {
							const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
								segment.length,
								strokeWidth,
								{
									style: dash,
									start: i > 0 ? 'outset' : 'none',
									end: i < spline.segments.length - 1 ? 'outset' : 'none',
								}
							)

							return (
								<path
									key={i}
									strokeDasharray={strokeDasharray}
									strokeDashoffset={strokeDashoffset}
									d={getSvgPathForEdge(segment as any, true)}
									fill="none"
								/>
							)
						})}
					</g>
				</>
			)
		}

		if (dash === 'draw') {
			const outline = spline.points
			const [innerPathData, outerPathData] = getDrawLinePathData(shape.id, outline, strokeWidth)

			return (
				<>
					<ShapeFill d={innerPathData} fill={'none'} color={color} theme={theme} />
					<path
						d={outerPathData}
						stroke={theme[color].solid}
						strokeWidth={strokeWidth}
						fill="none"
					/>
				</>
			)
		}
	}
	// Cubic style spline
	if (shape.props.spline === 'cubic') {
		const splinePath = getSvgPathForLineGeometry(spline)
		if (dash === 'solid') {
			return (
				<>
					<ShapeFill d={splinePath} fill={'none'} color={color} theme={theme} />
					<path strokeWidth={strokeWidth} stroke={theme[color].solid} fill="none" d={splinePath} />
				</>
			)
		}

		if (dash === 'dashed' || dash === 'dotted') {
			return (
				<>
					<ShapeFill d={splinePath} fill={'none'} color={color} theme={theme} />
					<g stroke={theme[color].solid} strokeWidth={strokeWidth}>
						{spline.segments.map((segment, i) => {
							const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
								segment.length,
								strokeWidth,
								{
									style: dash,
									start: i > 0 ? 'outset' : 'none',
									end: i < spline.segments.length - 1 ? 'outset' : 'none',
								}
							)

							return (
								<path
									key={i}
									strokeDasharray={strokeDasharray}
									strokeDashoffset={strokeDashoffset}
									d={getSvgPathForBezierCurve(segment as any, true)}
									fill="none"
								/>
							)
						})}
					</g>
				</>
			)
		}

		if (dash === 'draw') {
			return (
				<>
					<ShapeFill d={splinePath} fill={'none'} color={color} theme={theme} />
					<path
						d={getLineDrawPath(shape, spline, strokeWidth)}
						strokeWidth={1}
						stroke={theme[color].solid}
						fill={theme[color].solid}
					/>
				</>
			)
		}
	}
}

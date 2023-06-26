/* eslint-disable react-hooks/rules-of-hooks */
import { getIndexBetween, sortByIndex } from '@tldraw/indices'
import {
	CubicSpline2d,
	Polyline2d,
	Vec2d,
	VecLike,
	getDrawLinePathData,
	intersectLineSegmentPolyline,
	pointNearToPolyline,
} from '@tldraw/primitives'
import { TLHandle, TLLineShape, getDefaultColorTheme } from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import { SVGContainer } from '../../../components/SVGContainer'
import { WeakMapCache } from '../../../utils/WeakMapCache'
import { ShapeUtil, TLOnHandleChangeHandler, TLOnResizeHandler } from '../ShapeUtil'
import { ShapeFill, useDefaultColorTheme } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { useForceSolid } from '../shared/useForceSolid'
import { getLineDrawPath, getLineIndicatorPath, getLinePoints } from './components/getLinePath'
import { getLineSvg } from './components/getLineSvg'

const splinesCache = new WeakMapCache<TLLineShape['props'], CubicSpline2d | Polyline2d>()
const handlesCache = new WeakMapCache<TLLineShape['props'], TLHandle[]>()

/** @public */
export class LineShapeUtil extends ShapeUtil<TLLineShape> {
	static override type = 'line' as const

	override hideResizeHandles = () => true
	override hideRotateHandle = () => true
	override hideSelectionBoundsBg = () => true
	override hideSelectionBoundsFg = () => true
	override isClosed = () => false

	override getDefaultProps(): TLLineShape['props'] {
		return {
			dash: 'draw',
			size: 'm',
			color: 'black',
			spline: 'line',
			handles: {
				start: {
					id: 'start',
					type: 'vertex',
					canBind: false,
					index: 'a1',
					x: 0,
					y: 0,
				},
				end: {
					id: 'end',
					type: 'vertex',
					canBind: false,
					index: 'a2',
					x: 0,
					y: 0,
				},
			},
		}
	}

	getBounds(shape: TLLineShape) {
		// todo: should we have min size?
		const spline = getSplineForLineShape(shape)
		return spline.bounds
	}

	getHandles(shape: TLLineShape) {
		return handlesCache.get(shape.props, () => {
			const handles = shape.props.handles

			const spline = getSplineForLineShape(shape)

			const sortedHandles = Object.values(handles).sort(sortByIndex)
			const results = sortedHandles.slice()

			// Add "create" handles between each vertex handle
			for (let i = 0; i < spline.segments.length; i++) {
				const segment = spline.segments[i]
				const point = segment.midPoint
				const index = getIndexBetween(sortedHandles[i].index, sortedHandles[i + 1].index)

				results.push({
					id: `mid-${i}`,
					type: 'create',
					index,
					x: point.x,
					y: point.y,
				})
			}
			return results.sort(sortByIndex)
		})
	}

	getOutline(shape: TLLineShape) {
		return getLinePoints(getSplineForLineShape(shape))
	}

	getOutlineSegments(shape: TLLineShape) {
		const spline = getSplineForLineShape(shape)
		return shape.props.spline === 'cubic'
			? spline.segments.map((s) => s.lut)
			: spline.segments.map((s) => [s.getPoint(0), s.getPoint(1)])
	}

	//   Events

	onResize: TLOnResizeHandler<TLLineShape> = (shape, info) => {
		const { scaleX, scaleY } = info

		const handles = deepCopy(shape.props.handles)

		Object.values(shape.props.handles).forEach(({ id, x, y }) => {
			handles[id].x = x * scaleX
			handles[id].y = y * scaleY
		})

		return {
			props: {
				handles,
			},
		}
	}

	onHandleChange: TLOnHandleChangeHandler<TLLineShape> = (shape, { handle }) => {
		const next = deepCopy(shape)

		switch (handle.id) {
			case 'start':
			case 'end': {
				next.props.handles[handle.id] = {
					...next.props.handles[handle.id],
					x: handle.x,
					y: handle.y,
				}
				break
			}

			default: {
				const id = 'handle:' + handle.index
				const existing = shape.props.handles[id]

				if (existing) {
					next.props.handles[id] = {
						...existing,
						x: handle.x,
						y: handle.y,
					}
				} else {
					next.props.handles[id] = {
						id,
						type: 'vertex',
						canBind: false,
						index: handle.index,
						x: handle.x,
						y: handle.y,
					}
				}

				break
			}
		}

		return next
	}

	hitTestPoint(shape: TLLineShape, point: Vec2d): boolean {
		const zoomLevel = this.editor.zoomLevel
		const offsetDist = STROKE_SIZES[shape.props.size] / zoomLevel
		return pointNearToPolyline(point, this.editor.getOutline(shape), offsetDist)
	}

	hitTestLineSegment(shape: TLLineShape, A: VecLike, B: VecLike): boolean {
		return intersectLineSegmentPolyline(A, B, this.editor.getOutline(shape)) !== null
	}

	component(shape: TLLineShape) {
		const theme = useDefaultColorTheme()
		const forceSolid = useForceSolid()
		const spline = getSplineForLineShape(shape)
		const strokeWidth = STROKE_SIZES[shape.props.size]

		const { dash, color } = shape.props

		// Line style lines
		if (shape.props.spline === 'line') {
			if (dash === 'solid') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={pathData} fill={'none'} color={color} />
						<path d={pathData} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</SVGContainer>
				)
			}

			if (dash === 'dashed' || dash === 'dotted') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={pathData} fill={'none'} color={color} />
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
										d={segment.path}
										fill="none"
									/>
								)
							})}
						</g>
					</SVGContainer>
				)
			}

			if (dash === 'draw') {
				const outline = spline.points
				const [innerPathData, outerPathData] = getDrawLinePathData(shape.id, outline, strokeWidth)

				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={innerPathData} fill={'none'} color={color} />
						<path
							d={outerPathData}
							stroke={theme[color].solid}
							strokeWidth={strokeWidth}
							fill="none"
						/>
					</SVGContainer>
				)
			}
		}

		// Cubic style spline
		if (shape.props.spline === 'cubic') {
			const splinePath = spline.path

			if (dash === 'solid' || (dash === 'draw' && forceSolid)) {
				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={splinePath} fill={'none'} color={color} />
						<path
							strokeWidth={strokeWidth}
							stroke={theme[color].solid}
							fill="none"
							d={splinePath}
						/>
					</SVGContainer>
				)
			}

			if (dash === 'dashed' || dash === 'dotted') {
				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={splinePath} fill={'none'} color={color} />
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
										d={segment.path}
										fill="none"
									/>
								)
							})}
						</g>
					</SVGContainer>
				)
			}

			if (dash === 'draw') {
				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={splinePath} fill={'none'} color={color} />
						<path
							d={getLineDrawPath(shape, spline, strokeWidth)}
							strokeWidth={1}
							stroke={theme[color].solid}
							fill={theme[color].solid}
						/>
					</SVGContainer>
				)
			}
		}
	}

	indicator(shape: TLLineShape) {
		const strokeWidth = STROKE_SIZES[shape.props.size]
		const spline = getSplineForLineShape(shape)
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

	toSvg(shape: TLLineShape) {
		const theme = getDefaultColorTheme(this.editor)
		const color = theme[shape.props.color].solid
		const spline = getSplineForLineShape(shape)
		return getLineSvg(shape, spline, color, STROKE_SIZES[shape.props.size])
	}
}

/** @public */
export function getSplineForLineShape(shape: TLLineShape) {
	return splinesCache.get(shape.props, () => {
		const { spline, handles } = shape.props

		const handlePoints = Object.values(handles).sort(sortByIndex).map(Vec2d.From)

		switch (spline) {
			case 'cubic': {
				return new CubicSpline2d(handlePoints, handlePoints.length === 2 ? 2 : 1.2, 20)
			}
			case 'line': {
				return new Polyline2d(handlePoints)
			}
		}
	})
}

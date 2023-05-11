/* eslint-disable react-hooks/rules-of-hooks */
import {
	CubicSpline2d,
	getDrawLinePathData,
	intersectLineSegmentPolyline,
	pointNearToPolyline,
	Polyline2d,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import {
	lineShapeMigrations,
	lineShapeTypeValidator,
	TLHandle,
	TLLineShape,
} from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import { SVGContainer } from '../../../components/SVGContainer'
import { defineShape } from '../../../config/TLShapeDefinition'
import { getIndexBetween, sortByIndex } from '../../../utils/reordering/reordering'
import { WeakMapCache } from '../../../utils/WeakMapCache'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { ShapeFill } from '../shared/ShapeFill'
import { TLExportColors } from '../shared/TLExportColors'
import { useForceSolid } from '../shared/useForceSolid'
import { OnHandleChangeHandler, OnResizeHandler, TLShapeUtil } from '../TLShapeUtil'
import { getLineDrawPath, getLineIndicatorPath, getLinePoints } from './components/getLinePath'
import { getLineSvg } from './components/getLineSvg'

const splinesCache = new WeakMapCache<TLLineShape['props'], CubicSpline2d | Polyline2d>()
const handlesCache = new WeakMapCache<TLLineShape['props'], TLHandle[]>()

/** @public */
export class TLLineUtil extends TLShapeUtil<TLLineShape> {
	static type = 'line'

	override hideResizeHandles = () => true
	override hideRotateHandle = () => true
	override hideSelectionBoundsBg = () => true
	override hideSelectionBoundsFg = () => true
	override isClosed = () => false

	override defaultProps(): TLLineShape['props'] {
		return {
			opacity: '1',
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

	getCenter(shape: TLLineShape) {
		return this.bounds(shape).center
	}

	getHandles(shape: TLLineShape) {
		return handlesCache.get(shape.props, () => {
			const handles = shape.props.handles

			const spline = getSplineForLineShape(shape)

			const sortedHandles = Object.values(handles).sort(sortByIndex)
			const results = sortedHandles.slice()

			// Add "hint" handles between each vertex handle
			for (let i = 0; i < spline.segments.length; i++) {
				const segment = spline.segments[i]

				const point = segment.getPoint(0.5)

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

	//   Events

	onResize: OnResizeHandler<TLLineShape> = (shape, info) => {
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

	onHandleChange: OnHandleChangeHandler<TLLineShape> = (shape, { handle }) => {
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
		const zoomLevel = this.app.zoomLevel
		const offsetDist = this.app.getStrokeWidth(shape.props.size) / zoomLevel
		return pointNearToPolyline(point, this.outline(shape), offsetDist)
	}

	hitTestLineSegment(shape: TLLineShape, A: VecLike, B: VecLike): boolean {
		return intersectLineSegmentPolyline(A, B, this.outline(shape)) !== null
	}

	render(shape: TLLineShape) {
		const forceSolid = useForceSolid()
		const spline = getSplineForLineShape(shape)
		const strokeWidth = this.app.getStrokeWidth(shape.props.size)

		const { dash, color } = shape.props

		// Line style lines
		if (shape.props.spline === 'line') {
			if (dash === 'solid') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={pathData} fill={'none'} color={color} />
						<path d={pathData} stroke="currentColor" strokeWidth={strokeWidth} fill="none" />
					</SVGContainer>
				)
			}

			if (dash === 'dashed' || dash === 'dotted') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={pathData} fill={'none'} color={color} />
						<g stroke="currentColor" strokeWidth={strokeWidth}>
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
						<path d={outerPathData} stroke="currentColor" strokeWidth={strokeWidth} fill="none" />
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
						<path strokeWidth={strokeWidth} stroke="currentColor" fill="none" d={splinePath} />
					</SVGContainer>
				)
			}

			if (dash === 'dashed' || dash === 'dotted') {
				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={splinePath} fill={'none'} color={color} />
						<g stroke="currentColor" strokeWidth={strokeWidth}>
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
							stroke="currentColor"
							fill="currentColor"
						/>
					</SVGContainer>
				)
			}
		}
	}

	indicator(shape: TLLineShape) {
		const strokeWidth = this.app.getStrokeWidth(shape.props.size)
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

	toSvg(shape: TLLineShape, _font: string, colors: TLExportColors) {
		const { color: _color, size } = shape.props
		const color = colors.fill[_color]
		const spline = getSplineForLineShape(shape)
		return getLineSvg(shape, spline, color, this.app.getStrokeWidth(size))
	}
}

/** @public */
export const TLLineShapeDef = defineShape<TLLineShape, TLLineUtil>({
	type: 'line',
	getShapeUtil: () => TLLineUtil,
	validator: lineShapeTypeValidator,
	migrations: lineShapeMigrations,
})

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

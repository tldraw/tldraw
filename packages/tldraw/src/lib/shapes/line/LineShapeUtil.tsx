/* eslint-disable react-hooks/rules-of-hooks */

import {
	TLHandle,
	TLLineShape,
	getDefaultColorTheme,
	lineShapeMigrations,
	lineShapeProps,
} from '@tldraw/tlschema'
import { deepCopy } from '@tldraw/utils'
import {
	CubicSpline2d,
	Polyline2d,
	SVGContainer,
	ShapeUtil,
	TLOnHandleChangeHandler,
	TLOnResizeHandler,
	Vec2d,
	WeakMapCache,
	getIndexBetween,
	sortByIndex,
} from '../../editor'
import { ShapeFill, useDefaultColorTheme } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { getDrawLinePathData } from '../shared/polygon-helpers'
import { useForceSolid } from '../shared/useForceSolid'
import { getLineDrawPath, getLineIndicatorPath } from './components/getLinePath'
import { getLineSvg } from './components/getLineSvg'
import {
	getSvgPathForBezierCurve,
	getSvgPathForEdge,
	getSvgPathForLineGeometry,
} from './components/svg'

const handlesCache = new WeakMapCache<TLLineShape['props'], TLHandle[]>()

/** @public */
export class LineShapeUtil extends ShapeUtil<TLLineShape> {
	static override type = 'line' as const
	static override props = lineShapeProps
	static override migrations = lineShapeMigrations

	override hideResizeHandles = () => true
	override hideRotateHandle = () => true
	override hideSelectionBoundsFg = () => true

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

	getGeometry(shape: TLLineShape) {
		// todo: should we have min size?
		return getGeometryForLineShape(shape)
	}

	override getHandles(shape: TLLineShape) {
		return handlesCache.get(shape.props, () => {
			const handles = shape.props.handles

			const spline = getGeometryForLineShape(shape)

			const sortedHandles = Object.values(handles).sort(sortByIndex)
			const results = sortedHandles.slice()

			// Add "create" handles between each vertex handle
			for (let i = 0; i < spline.segments.length; i++) {
				const segment = spline.segments[i]
				const point = segment.midPoint()
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

	override getOutlineSegments(shape: TLLineShape) {
		const spline = this.editor.getGeometry(shape) as Polyline2d | CubicSpline2d
		return spline.segments.map((s) => s.vertices)
	}

	//   Events

	override onResize: TLOnResizeHandler<TLLineShape> = (shape, info) => {
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

	override onHandleChange: TLOnHandleChangeHandler<TLLineShape> = (shape, { handle }) => {
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

	component(shape: TLLineShape) {
		const theme = useDefaultColorTheme()
		const forceSolid = useForceSolid()
		const spline = getGeometryForLineShape(shape)
		const strokeWidth = STROKE_SIZES[shape.props.size]

		const { dash, color } = shape.props

		// Line style lines
		if (shape.props.spline === 'line') {
			if (dash === 'solid') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={pathData} fill={'none'} color={color} theme={theme} />
						<path d={pathData} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</SVGContainer>
				)
			}

			if (dash === 'dashed' || dash === 'dotted') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

				const fn = spline instanceof CubicSpline2d ? getSvgPathForBezierCurve : getSvgPathForEdge

				return (
					<SVGContainer id={shape.id}>
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
										d={fn(segment as any, i === 0)}
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
						<ShapeFill d={innerPathData} fill={'none'} color={color} theme={theme} />
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
			const splinePath = getSvgPathForLineGeometry(spline)

			if (dash === 'solid' || (dash === 'draw' && forceSolid)) {
				return (
					<SVGContainer id={shape.id}>
						<ShapeFill d={splinePath} fill={'none'} color={color} theme={theme} />
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
				const fn = spline instanceof CubicSpline2d ? getSvgPathForBezierCurve : getSvgPathForEdge

				return (
					<SVGContainer id={shape.id}>
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
										d={fn(segment as any, i === 0)}
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
						<ShapeFill d={splinePath} fill={'none'} color={color} theme={theme} />
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
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.isDarkMode })
		const color = theme[shape.props.color].solid
		const spline = getGeometryForLineShape(shape)
		return getLineSvg(shape, spline, color, STROKE_SIZES[shape.props.size])
	}
}

/** @public */
export function getGeometryForLineShape(shape: TLLineShape): CubicSpline2d | Polyline2d {
	const { spline, handles } = shape.props
	const handlePoints = Object.values(handles).sort(sortByIndex).map(Vec2d.From)

	switch (spline) {
		case 'cubic': {
			return new CubicSpline2d({ points: handlePoints })
		}
		case 'line': {
			return new Polyline2d({ points: handlePoints })
		}
	}
}

/* eslint-disable react-hooks/rules-of-hooks */
import {
	CubicSpline2d,
	Polyline2d,
	SVGContainer,
	ShapeUtil,
	TLHandle,
	TLLineShape,
	TLOnHandleDragHandler,
	TLOnResizeHandler,
	Vec,
	WeakMapCache,
	deepCopy,
	getDefaultColorTheme,
	getIndexBetween,
	getIndices,
	lineShapeMigrations,
	lineShapeProps,
	objectMapEntries,
	sortByIndex,
} from '@tldraw/editor'

import { ShapeFill, useDefaultColorTheme } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { getDrawLinePathData } from '../shared/polygon-helpers'
import { getLineDrawPath, getLineIndicatorPath } from './components/getLinePath'
import {
	getSvgPathForBezierCurve,
	getSvgPathForCubicSpline,
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
	override hideSelectionBoundsBg = () => true

	override getDefaultProps(): TLLineShape['props'] {
		const [startIndex, endIndex] = getIndices(2)
		return {
			dash: 'draw',
			size: 'm',
			color: 'black',
			spline: 'line',
			handles: {
				[startIndex]: {
					x: 0,
					y: 0,
				},
				[endIndex]: {
					x: 0.1,
					y: 0.1,
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

			const sortedHandles = objectMapEntries(handles)
				.map(
					([index, handle]): TLHandle => ({
						id: index,
						index,
						...handle,
						type: 'vertex',
						canBind: false,
						canSnap: true,
					})
				)
				.sort(sortByIndex)
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
					canSnap: true,
					canBind: false,
				})
			}

			return results.sort(sortByIndex)
		})
	}

	override getOutlineSegments(shape: TLLineShape) {
		const spline = this.editor.getShapeGeometry(shape) as Polyline2d | CubicSpline2d
		return spline.segments.map((s) => s.vertices)
	}

	//   Events

	override onResize: TLOnResizeHandler<TLLineShape> = (shape, info) => {
		const { scaleX, scaleY } = info

		const handles = deepCopy(shape.props.handles)

		objectMapEntries(shape.props.handles).forEach(([index, { x, y }]) => {
			handles[index].x = x * scaleX
			handles[index].y = y * scaleY
		})

		return {
			props: {
				handles,
			},
		}
	}

	override onHandleDrag: TLOnHandleDragHandler<TLLineShape> = (shape, { handle }) => {
		return {
			...shape,
			props: {
				...shape.props,
				handles: {
					...shape.props.handles,
					[handle.index]: { x: handle.x, y: handle.y },
				},
			},
		}
	}

	component(shape: TLLineShape) {
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
					<SVGContainer id={shape.id}>
						<ShapeFill d={pathData} fill={'none'} color={color} theme={theme} />
						<path d={pathData} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</SVGContainer>
				)
			}

			if (dash === 'dashed' || dash === 'dotted') {
				const outline = spline.points
				const pathData = 'M' + outline[0] + 'L' + outline.slice(1)

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
										d={getSvgPathForEdge(segment as any, true)}
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
			if (dash === 'solid') {
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
										d={getSvgPathForBezierCurve(segment as any, true)}
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
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
		const color = theme[shape.props.color].solid
		const spline = getGeometryForLineShape(shape)
		const strokeWidth = STROKE_SIZES[shape.props.size]

		switch (shape.props.dash) {
			case 'draw': {
				let pathData: string
				if (spline instanceof CubicSpline2d) {
					pathData = getLineDrawPath(shape, spline, strokeWidth)
				} else {
					const [_, outerPathData] = getDrawLinePathData(shape.id, spline.points, strokeWidth)
					pathData = outerPathData
				}

				const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
				p.setAttribute('stroke-width', strokeWidth + 'px')
				p.setAttribute('stroke', color)
				p.setAttribute('fill', 'none')
				p.setAttribute('d', pathData)

				return p
			}
			case 'solid': {
				let pathData: string

				if (spline instanceof CubicSpline2d) {
					pathData = getSvgPathForCubicSpline(spline, false)
				} else {
					const outline = spline.points
					pathData = 'M' + outline[0] + 'L' + outline.slice(1)
				}

				const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
				p.setAttribute('stroke-width', strokeWidth + 'px')
				p.setAttribute('stroke', color)
				p.setAttribute('fill', 'none')
				p.setAttribute('d', pathData)

				return p
			}
			default: {
				const { segments } = spline

				const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
				g.setAttribute('stroke', color)
				g.setAttribute('stroke-width', strokeWidth.toString())

				const fn = spline instanceof CubicSpline2d ? getSvgPathForBezierCurve : getSvgPathForEdge

				segments.forEach((segment, i) => {
					const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
					const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
						segment.length,
						strokeWidth,
						{
							style: shape.props.dash,
							start: i > 0 ? 'outset' : 'none',
							end: i < segments.length - 1 ? 'outset' : 'none',
						}
					)

					path.setAttribute('stroke-dasharray', strokeDasharray.toString())
					path.setAttribute('stroke-dashoffset', strokeDashoffset.toString())
					path.setAttribute('d', fn(segment as any, true))
					path.setAttribute('fill', 'none')
					g.appendChild(path)
				})

				return g
			}
		}
	}

	override getHandleSnapGeometry(shape: TLLineShape) {
		return {
			points: Object.values(shape.props.handles),
		}
	}
}

/** @public */
export function getGeometryForLineShape(shape: TLLineShape): CubicSpline2d | Polyline2d {
	const { spline, handles } = shape.props
	const handlePoints = objectMapEntries(handles)
		.map(([index, position]) => ({ index, ...position }))
		.sort(sortByIndex)
		.map(Vec.From)

	switch (spline) {
		case 'cubic': {
			return new CubicSpline2d({ points: handlePoints })
		}
		case 'line': {
			return new Polyline2d({ points: handlePoints })
		}
	}
}

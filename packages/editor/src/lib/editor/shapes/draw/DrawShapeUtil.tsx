/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box2d,
	getStrokeOutlinePoints,
	getStrokePoints,
	linesIntersect,
	pointInPolygon,
	setStrokePointRadii,
	toFixed,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import { getDefaultColorTheme, TLDrawShape, TLDrawShapeSegment } from '@tldraw/tlschema'
import { last, rng } from '@tldraw/utils'
import { SVGContainer } from '../../../components/SVGContainer'
import { getSvgPathFromStroke, getSvgPathFromStrokePoints } from '../../../utils/svg'
import { ShapeUtil, TLOnResizeHandler, TLShapeUtilCanvasSvgDef } from '../ShapeUtil'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getShapeFillSvg, ShapeFill, useDefaultColorTheme } from '../shared/ShapeFill'
import { SvgExportContext } from '../shared/SvgExportContext'
import { useForceSolid } from '../shared/useForceSolid'
import { getDrawShapeStrokeDashArray, getFreehandOptions, getPointsFromSegments } from './getPath'

/** @public */
export class DrawShapeUtil extends ShapeUtil<TLDrawShape> {
	static override type = 'draw' as const

	hideResizeHandles = (shape: TLDrawShape) => getIsDot(shape)
	hideRotateHandle = (shape: TLDrawShape) => getIsDot(shape)
	hideSelectionBoundsBg = (shape: TLDrawShape) => getIsDot(shape)
	hideSelectionBoundsFg = (shape: TLDrawShape) => getIsDot(shape)

	override getDefaultProps(): TLDrawShape['props'] {
		return {
			segments: [],
			color: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			isComplete: false,
			isClosed: false,
			isPen: false,
		}
	}

	isClosed = (shape: TLDrawShape) => shape.props.isClosed

	getBounds(shape: TLDrawShape) {
		return Box2d.FromPoints(this.editor.getOutline(shape))
	}

	getOutline(shape: TLDrawShape) {
		return getPointsFromSegments(shape.props.segments)
	}

	getCenter(shape: TLDrawShape): Vec2d {
		return this.editor.getBounds(shape).center
	}

	hitTestPoint(shape: TLDrawShape, point: VecLike): boolean {
		const outline = this.editor.getOutline(shape)
		const zoomLevel = this.editor.zoomLevel
		const offsetDist = STROKE_SIZES[shape.props.size] / zoomLevel

		if (shape.props.segments.length === 1 && shape.props.segments[0].points.length < 4) {
			if (shape.props.segments[0].points.some((pt) => Vec2d.Dist(point, pt) < offsetDist * 1.5)) {
				return true
			}
		}

		if (this.isClosed(shape)) {
			return pointInPolygon(point, outline)
		}

		if (this.editor.getBounds(shape).containsPoint(point)) {
			for (let i = 0; i < outline.length; i++) {
				const C = outline[i]
				const D = outline[(i + 1) % outline.length]

				if (Vec2d.DistanceToLineSegment(C, D, point) < offsetDist) return true
			}
		}

		return false
	}

	hitTestLineSegment(shape: TLDrawShape, A: VecLike, B: VecLike): boolean {
		const outline = this.editor.getOutline(shape)

		if (shape.props.segments.length === 1 && shape.props.segments[0].points.length < 4) {
			const zoomLevel = this.editor.zoomLevel
			const offsetDist = STROKE_SIZES[shape.props.size] / zoomLevel

			if (
				shape.props.segments[0].points.some(
					(pt) => Vec2d.DistanceToLineSegment(A, B, pt) < offsetDist * 1.5
				)
			) {
				return true
			}
		}

		if (this.isClosed(shape)) {
			for (let i = 0; i < outline.length; i++) {
				const C = outline[i]
				const D = outline[(i + 1) % outline.length]
				if (linesIntersect(A, B, C, D)) return true
			}
		} else {
			for (let i = 0; i < outline.length - 1; i++) {
				const C = outline[i]
				const D = outline[i + 1]
				if (linesIntersect(A, B, C, D)) return true
			}
		}

		return false
	}

	component(shape: TLDrawShape) {
		const theme = useDefaultColorTheme()
		const forceSolid = useForceSolid()
		const strokeWidth = STROKE_SIZES[shape.props.size]
		const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

		let sw = strokeWidth
		if (
			!forceSolid &&
			!shape.props.isPen &&
			shape.props.dash === 'draw' &&
			allPointsFromSegments.length === 1
		) {
			sw += rng(shape.id)() * (strokeWidth / 6)
		}

		const options = getFreehandOptions(shape.props, sw, showAsComplete, forceSolid)
		const strokePoints = getStrokePoints(allPointsFromSegments, options)

		const solidStrokePath =
			strokePoints.length > 1
				? getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)
				: getDot(allPointsFromSegments[0], sw)

		if ((!forceSolid && shape.props.dash === 'draw') || strokePoints.length < 2) {
			setStrokePointRadii(strokePoints, options)
			const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options)

			return (
				<SVGContainer id={shape.id}>
					<ShapeFill
						fill={shape.props.isClosed ? shape.props.fill : 'none'}
						color={shape.props.color}
						d={solidStrokePath}
					/>
					<path
						d={getSvgPathFromStroke(strokeOutlinePoints, true)}
						strokeLinecap="round"
						fill={theme[shape.props.color].solid}
					/>
				</SVGContainer>
			)
		}

		return (
			<SVGContainer id={shape.id}>
				<ShapeFill
					color={shape.props.color}
					fill={shape.props.isClosed ? shape.props.fill : 'none'}
					d={solidStrokePath}
				/>
				<path
					d={solidStrokePath}
					strokeLinecap="round"
					fill="none"
					stroke={theme[shape.props.color].solid}
					strokeWidth={strokeWidth}
					strokeDasharray={getDrawShapeStrokeDashArray(shape, strokeWidth)}
					strokeDashoffset="0"
				/>
			</SVGContainer>
		)
	}

	indicator(shape: TLDrawShape) {
		const forceSolid = useForceSolid()
		const strokeWidth = STROKE_SIZES[shape.props.size]
		const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

		let sw = strokeWidth
		if (
			!forceSolid &&
			!shape.props.isPen &&
			shape.props.dash === 'draw' &&
			allPointsFromSegments.length === 1
		) {
			sw += rng(shape.id)() * (strokeWidth / 6)
		}

		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'
		const options = getFreehandOptions(shape.props, sw, showAsComplete, true)
		const strokePoints = getStrokePoints(allPointsFromSegments, options)
		const solidStrokePath =
			strokePoints.length > 1
				? getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)
				: getDot(allPointsFromSegments[0], sw)

		return <path d={solidStrokePath} />
	}

	toSvg(shape: TLDrawShape, ctx: SvgExportContext) {
		const theme = getDefaultColorTheme(this.editor)
		ctx.addExportDef(getFillDefForExport(shape.props.fill, theme))

		const { color } = shape.props

		const strokeWidth = STROKE_SIZES[shape.props.size]
		const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

		let sw = strokeWidth
		if (!shape.props.isPen && shape.props.dash === 'draw' && allPointsFromSegments.length === 1) {
			sw += rng(shape.id)() * (strokeWidth / 6)
		}

		const options = getFreehandOptions(shape.props, sw, showAsComplete, false)
		const strokePoints = getStrokePoints(allPointsFromSegments, options)
		const solidStrokePath =
			strokePoints.length > 1
				? getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)
				: getDot(allPointsFromSegments[0], sw)

		let foregroundPath: SVGPathElement | undefined

		if (shape.props.dash === 'draw' || strokePoints.length < 2) {
			setStrokePointRadii(strokePoints, options)
			const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options)

			const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
			p.setAttribute('d', getSvgPathFromStroke(strokeOutlinePoints, true))
			p.setAttribute('fill', theme[color].solid)
			p.setAttribute('stroke-linecap', 'round')

			foregroundPath = p
		} else {
			const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
			p.setAttribute('d', solidStrokePath)
			p.setAttribute('stroke', theme[color].solid)
			p.setAttribute('fill', 'none')
			p.setAttribute('stroke-linecap', 'round')
			p.setAttribute('stroke-width', strokeWidth.toString())
			p.setAttribute('stroke-dasharray', getDrawShapeStrokeDashArray(shape, strokeWidth))
			p.setAttribute('stroke-dashoffset', '0')

			foregroundPath = p
		}

		const fillPath = getShapeFillSvg({
			fill: shape.props.isClosed ? shape.props.fill : 'none',
			d: solidStrokePath,
			color: shape.props.color,
			theme,
		})

		if (fillPath) {
			const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
			g.appendChild(fillPath)
			g.appendChild(foregroundPath)
			return g
		}

		return foregroundPath
	}

	getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}

	override onResize: TLOnResizeHandler<TLDrawShape> = (shape, info) => {
		const { scaleX, scaleY } = info

		const newSegments: TLDrawShapeSegment[] = []

		for (const segment of shape.props.segments) {
			newSegments.push({
				...segment,
				points: segment.points.map(({ x, y, z }) => {
					return {
						x: toFixed(scaleX * x),
						y: toFixed(scaleY * y),
						z,
					}
				}),
			})
		}

		return {
			props: {
				segments: newSegments,
			},
		}
	}

	expandSelectionOutlinePx(shape: TLDrawShape): number {
		const multiplier = shape.props.dash === 'draw' ? 1.6 : 1
		return (STROKE_SIZES[shape.props.size] * multiplier) / 2
	}
}

function getDot(point: VecLike, sw: number) {
	const r = (sw + 1) * 0.5
	return `M ${point.x} ${point.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${
		r * 2
	},0`
}

function getIsDot(shape: TLDrawShape) {
	return shape.props.segments.length === 1 && shape.props.segments[0].points.length < 2
}

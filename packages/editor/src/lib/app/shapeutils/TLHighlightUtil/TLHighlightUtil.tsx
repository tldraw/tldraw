/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box2d,
	getStrokeOutlinePoints,
	getStrokePoints,
	linesIntersect,
	setStrokePointRadii,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import { TLDrawShapeSegment, TLHighlightShape } from '@tldraw/tlschema'
import { last, rng } from '@tldraw/utils'
import { SVGContainer } from '../../../components/SVGContainer'
import { FONT_SIZES } from '../../../constants'
import { getSvgPathFromStroke, getSvgPathFromStrokePoints } from '../../../utils/svg'
import { ShapeFill } from '../shared/ShapeFill'
import { TLExportColors } from '../shared/TLExportColors'
import { useForceSolid } from '../shared/useForceSolid'
import { getHighlightFreehandSettings, getPointsFromSegments } from '../TLDrawUtil/getPath'
import { OnResizeHandler, TLShapeUtil } from '../TLShapeUtil'

const OVERLAY_OPACITY = 0.4

/** @public */
export class TLHighlightUtil extends TLShapeUtil<TLHighlightShape> {
	static type = 'highlight'

	hideResizeHandles = (shape: TLHighlightShape) => this.getIsDot(shape)
	hideRotateHandle = (shape: TLHighlightShape) => this.getIsDot(shape)
	hideSelectionBoundsBg = (shape: TLHighlightShape) => this.getIsDot(shape)
	hideSelectionBoundsFg = (shape: TLHighlightShape) => this.getIsDot(shape)

	override defaultProps(): TLHighlightShape['props'] {
		return {
			segments: [],
			color: 'black',
			size: 'm',
			opacity: '1',
			isComplete: false,
			isPen: false,
		}
	}

	private getIsDot(shape: TLHighlightShape) {
		return shape.props.segments.length === 1 && shape.props.segments[0].points.length < 2
	}

	getBounds(shape: TLHighlightShape) {
		return Box2d.FromPoints(this.outline(shape))
	}

	getOutline(shape: TLHighlightShape) {
		return getPointsFromSegments(shape.props.segments)
	}

	getCenter(shape: TLHighlightShape): Vec2d {
		return this.bounds(shape).center
	}

	hitTestPoint(shape: TLHighlightShape, point: VecLike): boolean {
		const outline = this.outline(shape)
		const zoomLevel = this.app.zoomLevel
		const offsetDist = this.getStrokeWidth(shape) / zoomLevel

		if (shape.props.segments.length === 1 && shape.props.segments[0].points.length < 4) {
			if (shape.props.segments[0].points.some((pt) => Vec2d.Dist(point, pt) < offsetDist * 1.5)) {
				return true
			}
		}

		if (this.bounds(shape).containsPoint(point)) {
			for (let i = 0; i < outline.length; i++) {
				const C = outline[i]
				const D = outline[(i + 1) % outline.length]

				if (Vec2d.DistanceToLineSegment(C, D, point) < offsetDist) return true
			}
		}

		return false
	}

	hitTestLineSegment(shape: TLHighlightShape, A: VecLike, B: VecLike): boolean {
		const outline = this.outline(shape)

		if (shape.props.segments.length === 1 && shape.props.segments[0].points.length < 4) {
			const zoomLevel = this.app.zoomLevel
			const offsetDist = this.getStrokeWidth(shape) / zoomLevel

			if (
				shape.props.segments[0].points.some(
					(pt) => Vec2d.DistanceToLineSegment(A, B, pt) < offsetDist * 1.5
				)
			) {
				return true
			}
		}

		for (let i = 0; i < outline.length - 1; i++) {
			const C = outline[i]
			const D = outline[i + 1]
			if (linesIntersect(A, B, C, D)) return true
		}

		return false
	}

	render(shape: TLHighlightShape) {
		return (
			<HighlightRenderer
				strokeWidth={this.getStrokeWidth(shape)}
				shape={shape}
				opacity={OVERLAY_OPACITY}
			/>
		)
	}

	renderBackground(shape: TLHighlightShape) {
		return <HighlightRenderer strokeWidth={this.getStrokeWidth(shape)} shape={shape} />
	}

	indicator(shape: TLHighlightShape) {
		const forceSolid = useForceSolid()
		const strokeWidth = this.getStrokeWidth(shape)
		const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

		let sw = strokeWidth
		if (!forceSolid && !shape.props.isPen && allPointsFromSegments.length === 1) {
			sw += rng(shape.id)() * (strokeWidth / 6)
		}

		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'
		const options = getHighlightFreehandSettings(strokeWidth, showAsComplete)
		const strokePoints = getStrokePoints(allPointsFromSegments, options)

		let strokePath
		if (strokePoints.length < 2) {
			strokePath = getDot(allPointsFromSegments[0], sw)
		} else {
			strokePath = getSvgPathFromStrokePoints(strokePoints, false)
		}

		return <path d={strokePath} />
	}

	toSvg(shape: TLHighlightShape, _font: string | undefined, colors: TLExportColors) {
		return highlighterToSvg(this.getStrokeWidth(shape), shape, OVERLAY_OPACITY, colors)
	}

	toBackgroundSvg(shape: TLHighlightShape, font: string | undefined, colors: TLExportColors) {
		return highlighterToSvg(this.getStrokeWidth(shape), shape, 1, colors)
	}

	override onResize: OnResizeHandler<TLHighlightShape> = (shape, info) => {
		const { scaleX, scaleY } = info

		const newSegments: TLDrawShapeSegment[] = []

		for (const segment of shape.props.segments) {
			newSegments.push({
				...segment,
				points: segment.points.map(({ x, y, z }) => {
					return {
						x: scaleX * x,
						y: scaleY * y,
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

	getStrokeWidth(shape: TLHighlightShape) {
		return FONT_SIZES[shape.props.size] * 0.75
	}

	expandSelectionOutlinePx(shape: TLHighlightShape): number {
		return (this.getStrokeWidth(shape) * 1.6) / 2
	}
}

function getDot(point: VecLike, sw: number) {
	const r = (sw + 1) * 0.5
	return `M ${point.x} ${point.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${
		r * 2
	},0`
}

function HighlightRenderer({
	strokeWidth,
	shape,
	opacity,
}: {
	strokeWidth: number
	shape: TLHighlightShape
	opacity?: number
}) {
	const forceSolid = useForceSolid()
	const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	let sw = strokeWidth
	if (!forceSolid && !shape.props.isPen && allPointsFromSegments.length === 1) {
		sw += rng(shape.id)() * (strokeWidth / 6)
	}

	const options = getHighlightFreehandSettings(sw, showAsComplete)
	const strokePoints = getStrokePoints(allPointsFromSegments, options)

	const solidStrokePath =
		strokePoints.length > 1
			? getSvgPathFromStrokePoints(strokePoints, false)
			: getDot(allPointsFromSegments[0], sw)

	if (!forceSolid || strokePoints.length < 2) {
		setStrokePointRadii(strokePoints, options)
		const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options)

		return (
			<SVGContainer id={shape.id} style={{ opacity }}>
				<ShapeFill fill="none" color={shape.props.color} d={solidStrokePath} />
				<path
					d={getSvgPathFromStroke(strokeOutlinePoints, true)}
					strokeLinecap="round"
					fill={`var(--palette-${shape.props.color}-highlight)`}
				/>
			</SVGContainer>
		)
	}

	return (
		<SVGContainer id={shape.id} style={{ opacity }}>
			<ShapeFill fill="none" color={shape.props.color} d={solidStrokePath} />
			<path
				d={solidStrokePath}
				strokeLinecap="round"
				fill="none"
				stroke={`var(--palette-${shape.props.color}-highlight)`}
				strokeWidth={strokeWidth}
				strokeDashoffset="0"
			/>
		</SVGContainer>
	)
}

function highlighterToSvg(
	strokeWidth: number,
	shape: TLHighlightShape,
	opacity: number,
	colors: TLExportColors
) {
	const { color } = shape.props

	const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	let sw = strokeWidth
	if (!shape.props.isPen && allPointsFromSegments.length === 1) {
		sw += rng(shape.id)() * (strokeWidth / 6)
	}

	const options = getHighlightFreehandSettings(sw, showAsComplete)
	const strokePoints = getStrokePoints(allPointsFromSegments, options)

	setStrokePointRadii(strokePoints, options)
	const strokeOutlinePoints = getStrokeOutlinePoints(strokePoints, options)

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('d', getSvgPathFromStroke(strokeOutlinePoints, true))
	path.setAttribute('fill', colors.highlight[color])
	path.setAttribute('stroke-linecap', 'round')
	path.setAttribute('opacity', opacity.toString())

	return path
}

/* eslint-disable react-hooks/rules-of-hooks */
import {
	Circle2d,
	Polygon2d,
	SVGContainer,
	ShapeUtil,
	TLDefaultColorTheme,
	TLDrawShapeSegment,
	TLHighlightShape,
	TLOnResizeHandler,
	VecLike,
	getDefaultColorTheme,
	highlightShapeMigrations,
	highlightShapeProps,
	last,
	rng,
} from '@tldraw/editor'
import { getHighlightFreehandSettings, getPointsFromSegments } from '../draw/getPath'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { FONT_SIZES } from '../shared/default-shape-constants'
import { getStrokeOutlinePoints } from '../shared/freehand/getStrokeOutlinePoints'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { setStrokePointRadii } from '../shared/freehand/setStrokePointRadii'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { useColorSpace } from '../shared/useColorSpace'
import { useForceSolid } from '../shared/useForceSolid'

const OVERLAY_OPACITY = 0.35
const UNDERLAY_OPACITY = 0.82

/** @public */
export class HighlightShapeUtil extends ShapeUtil<TLHighlightShape> {
	static override type = 'highlight' as const
	static override props = highlightShapeProps
	static override migrations = highlightShapeMigrations

	override hideResizeHandles = (shape: TLHighlightShape) => getIsDot(shape)
	override hideRotateHandle = (shape: TLHighlightShape) => getIsDot(shape)
	override hideSelectionBoundsFg = (shape: TLHighlightShape) => getIsDot(shape)

	override getDefaultProps(): TLHighlightShape['props'] {
		return {
			segments: [],
			color: 'black',
			size: 'm',
			isComplete: false,
			isPen: false,
		}
	}

	getGeometry(shape: TLHighlightShape) {
		const strokeWidth = getStrokeWidth(shape)
		if (getIsDot(shape)) {
			return new Circle2d({
				x: -strokeWidth / 2,
				y: -strokeWidth / 2,
				radius: strokeWidth / 2,
				isFilled: true,
			})
		}

		const { strokePoints, sw } = getHighlightStrokePoints(shape, strokeWidth, true)
		const opts = getHighlightFreehandSettings({ strokeWidth: sw, showAsComplete: true })
		setStrokePointRadii(strokePoints, opts)

		return new Polygon2d({
			points: getStrokeOutlinePoints(strokePoints, opts),
			isFilled: true,
		})
	}

	component(shape: TLHighlightShape) {
		return (
			<HighlightRenderer
				strokeWidth={getStrokeWidth(shape)}
				shape={shape}
				opacity={OVERLAY_OPACITY}
			/>
		)
	}

	override backgroundComponent(shape: TLHighlightShape) {
		return (
			<HighlightRenderer
				strokeWidth={getStrokeWidth(shape)}
				shape={shape}
				opacity={UNDERLAY_OPACITY}
			/>
		)
	}

	indicator(shape: TLHighlightShape) {
		const forceSolid = useForceSolid()
		const strokeWidth = getStrokeWidth(shape)
		const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

		let sw = strokeWidth
		if (!forceSolid && !shape.props.isPen && allPointsFromSegments.length === 1) {
			sw += rng(shape.id)() * (strokeWidth / 6)
		}

		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'
		const options = getHighlightFreehandSettings({
			strokeWidth,
			showAsComplete,
		})
		const strokePoints = getStrokePoints(allPointsFromSegments, options)

		let strokePath
		if (strokePoints.length < 2) {
			strokePath = getIndicatorDot(allPointsFromSegments[0], sw)
		} else {
			strokePath = getSvgPathFromStrokePoints(strokePoints, false)
		}

		return <path d={strokePath} />
	}

	override toSvg(shape: TLHighlightShape) {
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.isDarkMode })
		return highlighterToSvg(getStrokeWidth(shape), shape, OVERLAY_OPACITY, theme)
	}

	override toBackgroundSvg(shape: TLHighlightShape) {
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.isDarkMode })
		return highlighterToSvg(getStrokeWidth(shape), shape, UNDERLAY_OPACITY, theme)
	}

	override onResize: TLOnResizeHandler<TLHighlightShape> = (shape, info) => {
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
}

function getShapeDot(point: VecLike) {
	const r = 0.1
	return `M ${point.x} ${point.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${
		r * 2
	},0`
}

function getIndicatorDot(point: VecLike, sw: number) {
	const r = sw / 2
	return `M ${point.x} ${point.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${
		r * 2
	},0`
}

function getHighlightStrokePoints(
	shape: TLHighlightShape,
	strokeWidth: number,
	forceSolid: boolean
) {
	const allPointsFromSegments = getPointsFromSegments(shape.props.segments)
	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	let sw = strokeWidth
	if (!forceSolid && !shape.props.isPen && allPointsFromSegments.length === 1) {
		sw += rng(shape.id)() * (strokeWidth / 6)
	}

	const options = getHighlightFreehandSettings({
		strokeWidth: sw,
		showAsComplete,
	})
	const strokePoints = getStrokePoints(allPointsFromSegments, options)

	return { strokePoints, sw }
}

function getHighlightSvgPath(shape: TLHighlightShape, strokeWidth: number, forceSolid: boolean) {
	const { strokePoints, sw } = getHighlightStrokePoints(shape, strokeWidth, forceSolid)

	const solidStrokePath =
		strokePoints.length > 1
			? getSvgPathFromStrokePoints(strokePoints, false)
			: getShapeDot(shape.props.segments[0].points[0])

	return { solidStrokePath, sw }
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
	const theme = useDefaultColorTheme()
	const forceSolid = useForceSolid()
	const { solidStrokePath, sw } = getHighlightSvgPath(shape, strokeWidth, forceSolid)
	const colorSpace = useColorSpace()
	const color = theme[shape.props.color].highlight[colorSpace]

	return (
		<SVGContainer id={shape.id} style={{ opacity }}>
			<path
				d={solidStrokePath}
				strokeLinecap="round"
				fill="none"
				pointerEvents="all"
				stroke={color}
				strokeWidth={sw}
			/>
		</SVGContainer>
	)
}

function highlighterToSvg(
	strokeWidth: number,
	shape: TLHighlightShape,
	opacity: number,
	theme: TLDefaultColorTheme
) {
	const { solidStrokePath, sw } = getHighlightSvgPath(shape, strokeWidth, false)

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('d', solidStrokePath)
	path.setAttribute('fill', 'none')
	path.setAttribute('stroke', theme[shape.props.color].highlight.srgb)
	path.setAttribute('stroke-width', `${sw}`)
	path.setAttribute('opacity', `${opacity}`)

	return path
}

function getStrokeWidth(shape: TLHighlightShape) {
	return FONT_SIZES[shape.props.size] * 1.12
}

function getIsDot(shape: TLHighlightShape) {
	return shape.props.segments.length === 1 && shape.props.segments[0].points.length < 2
}

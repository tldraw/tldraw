/* eslint-disable react-hooks/rules-of-hooks */
import {
	Circle2d,
	Editor,
	Polygon2d,
	SVGContainer,
	ShapeUtil,
	TLHighlightShape,
	TLHighlightShapeProps,
	TLResizeInfo,
	VecLike,
	getColorValue,
	highlightShapeMigrations,
	highlightShapeProps,
	last,
	lerp,
	rng,
	useValue,
} from '@tldraw/editor'

import { getHighlightFreehandSettings, getPointsFromDrawSegments } from '../draw/getPath'
import { FONT_SIZES } from '../shared/default-shape-constants'
import { getStrokeOutlinePoints } from '../shared/freehand/getStrokeOutlinePoints'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { setStrokePointRadii } from '../shared/freehand/setStrokePointRadii'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { interpolateSegments } from '../shared/interpolate-props'
import { useColorSpace } from '../shared/useColorSpace'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'

/** @public */
export interface HighlightShapeOptions {
	/**
	 * The maximum number of points in a line before the draw tool will begin a new shape.
	 * A higher number will lead to poor performance while drawing very long lines.
	 */
	readonly maxPointsPerShape: number
	readonly underlayOpacity: number
	readonly overlayOpacity: number
}

/** @public */
export class HighlightShapeUtil extends ShapeUtil<TLHighlightShape> {
	static override type = 'highlight' as const
	static override props = highlightShapeProps
	static override migrations = highlightShapeMigrations

	override options: HighlightShapeOptions = {
		maxPointsPerShape: 600,
		underlayOpacity: 0.82,
		overlayOpacity: 0.35,
	}

	override hideResizeHandles(shape: TLHighlightShape) {
		return getIsDot(shape)
	}
	override hideRotateHandle(shape: TLHighlightShape) {
		return getIsDot(shape)
	}
	override hideSelectionBoundsFg(shape: TLHighlightShape) {
		return getIsDot(shape)
	}

	override getDefaultProps(): TLHighlightShape['props'] {
		return {
			segments: [],
			color: 'black',
			size: 'm',
			isComplete: false,
			isPen: false,
			scale: 1,
			scaleX: 1,
			scaleY: 1,
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
		const forceSolid = useHighlightForceSolid(this.editor, shape)
		const strokeWidth = getStrokeWidth(shape)

		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					opacity={this.options.overlayOpacity}
				/>
			</SVGContainer>
		)
	}

	override backgroundComponent(shape: TLHighlightShape) {
		const forceSolid = useHighlightForceSolid(this.editor, shape)
		const strokeWidth = getStrokeWidth(shape)
		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					opacity={this.options.underlayOpacity}
				/>
			</SVGContainer>
		)
	}

	indicator(shape: TLHighlightShape) {
		const forceSolid = useHighlightForceSolid(this.editor, shape)
		const strokeWidth = getStrokeWidth(shape)

		const { strokePoints, sw } = getHighlightStrokePoints(shape, strokeWidth, forceSolid)
		const allPointsFromSegments = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)

		let strokePath
		if (strokePoints.length < 2) {
			strokePath = getIndicatorDot(allPointsFromSegments[0], sw)
		} else {
			strokePath = getSvgPathFromStrokePoints(strokePoints, false)
		}

		return <path d={strokePath} />
	}

	override toSvg(shape: TLHighlightShape) {
		const strokeWidth = getStrokeWidth(shape)
		const forceSolid = strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					shape={shape}
					opacity={this.options.overlayOpacity}
				/>
			</g>
		)
	}

	override toBackgroundSvg(shape: TLHighlightShape) {
		const strokeWidth = getStrokeWidth(shape)
		const forceSolid = strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					shape={shape}
					opacity={this.options.underlayOpacity}
				/>
			</g>
		)
	}

	override onResize(shape: TLHighlightShape, info: TLResizeInfo<TLHighlightShape>) {
		const { scaleX, scaleY } = info

		return {
			props: {
				scaleX: scaleX * shape.props.scaleX,
				scaleY: scaleY * shape.props.scaleY,
			},
		}
	}
	override getInterpolatedProps(
		startShape: TLHighlightShape,
		endShape: TLHighlightShape,
		t: number
	): TLHighlightShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			...endShape.props,
			segments: interpolateSegments(startShape.props.segments, endShape.props.segments, t),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
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
	const allPointsFromSegments = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)
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

function getStrokeWidth(shape: TLHighlightShape) {
	return FONT_SIZES[shape.props.size] * 1.12 * shape.props.scale
}

function getIsDot(shape: TLHighlightShape) {
	// First point is 16 base64 chars (3 Float32s = 12 bytes)
	// Each delta point is 8 base64 chars (3 Float16s = 6 bytes)
	// 1 point = 16 chars, 2 points = 24 chars
	// Check if we have less than 2 points without decoding
	return shape.props.segments.length === 1 && shape.props.segments[0].path.length < 24
}

function HighlightRenderer({
	strokeWidth,
	forceSolid,
	shape,
	opacity,
}: {
	strokeWidth: number
	forceSolid: boolean
	shape: TLHighlightShape
	opacity: number
}) {
	const theme = useDefaultColorTheme()

	const allPointsFromSegments = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)

	let sw = strokeWidth
	if (!forceSolid && !shape.props.isPen && allPointsFromSegments.length === 1) {
		sw += rng(shape.id)() * (sw / 6)
	}

	const options = getHighlightFreehandSettings({
		strokeWidth: sw,
		showAsComplete: shape.props.isComplete || last(shape.props.segments)?.type === 'straight',
	})

	const strokePoints = getStrokePoints(allPointsFromSegments, options)

	const solidStrokePath =
		strokePoints.length > 1
			? getSvgPathFromStrokePoints(strokePoints, false)
			: getShapeDot(allPointsFromSegments[0])

	const colorSpace = useColorSpace()

	const color = getColorValue(
		theme,
		shape.props.color,
		colorSpace === 'p3' ? 'highlightP3' : 'highlightSrgb'
	)

	return (
		<path
			d={solidStrokePath}
			strokeLinecap="round"
			fill="none"
			pointerEvents="all"
			stroke={color}
			strokeWidth={sw}
			opacity={opacity}
		/>
	)
}

function useHighlightForceSolid(editor: Editor, shape: TLHighlightShape) {
	return useValue(
		'forceSolid',
		() => {
			const sw = getStrokeWidth(shape)
			const zoomLevel = editor.getEfficientZoomLevel()
			if (sw / zoomLevel < 1.5) {
				return true
			}
			return false
		},
		[editor]
	)
}

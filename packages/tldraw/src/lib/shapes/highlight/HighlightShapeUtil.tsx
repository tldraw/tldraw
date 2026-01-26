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
	TLStyleContext,
	VecLike,
	getColorValue,
	highlightShapeMigrations,
	highlightShapeProps,
	last,
	lerp,
	rng,
	useShapeStyles,
	useValue,
} from '@tldraw/editor'

import { getHighlightFreehandSettings, getPointsFromDrawSegments } from '../draw/getPath'
import { FONT_SIZES } from '../shared/default-shape-constants'

/**
 * The resolved/computed styles for a highlight shape.
 *
 * @public
 */
export interface TLHighlightShapeResolvedStyles {
	strokeWidth: number
	strokeColor: string
}

declare module '@tldraw/editor' {
	interface TLShapeStylesMap {
		highlight: TLHighlightShapeResolvedStyles
	}
}

import { getStrokeOutlinePoints } from '../shared/freehand/getStrokeOutlinePoints'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { setStrokePointRadii } from '../shared/freehand/setStrokePointRadii'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { interpolateSegments } from '../shared/interpolate-props'

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

	override getDefaultStyles(
		shape: TLHighlightShape,
		ctx: TLStyleContext
	): TLHighlightShapeResolvedStyles {
		const strokeWidth = FONT_SIZES[shape.props.size] * 1.12 * shape.props.scale
		// Default to sRGB highlight color
		const strokeColor = getColorValue(ctx.theme, shape.props.color, 'highlightSrgb')
		return { strokeWidth, strokeColor }
	}

	getGeometry(shape: TLHighlightShape) {
		const styles = this.editor.getShapeStyles<TLHighlightShapeResolvedStyles>(shape)
		const strokeWidth = styles?.strokeWidth ?? getStrokeWidth(shape)
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
		const styles = useShapeStyles<TLHighlightShapeResolvedStyles>(shape)

		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					styles={styles}
					opacity={this.options.overlayOpacity}
				/>
			</SVGContainer>
		)
	}

	override backgroundComponent(shape: TLHighlightShape) {
		const forceSolid = useHighlightForceSolid(this.editor, shape)
		const styles = useShapeStyles<TLHighlightShapeResolvedStyles>(shape)
		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					styles={styles}
					opacity={this.options.underlayOpacity}
				/>
			</SVGContainer>
		)
	}

	indicator(shape: TLHighlightShape) {
		const forceSolid = useHighlightForceSolid(this.editor, shape)
		const styles = useShapeStyles<TLHighlightShapeResolvedStyles>(shape)

		const { strokePoints, sw } = getHighlightStrokePoints(shape, styles.strokeWidth, forceSolid)
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
		const styles = this.editor.getShapeStyles<TLHighlightShapeResolvedStyles>(shape)!
		const forceSolid = styles.strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					styles={styles}
					shape={shape}
					opacity={this.options.overlayOpacity}
				/>
			</g>
		)
	}

	override toBackgroundSvg(shape: TLHighlightShape) {
		const styles = this.editor.getShapeStyles<TLHighlightShapeResolvedStyles>(shape)!
		const forceSolid = styles.strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					styles={styles}
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
	// Each point is 8 base64 characters (3 Float16s = 6 bytes = 8 base64 chars)
	// Check if we have less than 2 points without decoding
	return shape.props.segments.length === 1 && shape.props.segments[0].points.length < 16
}

function HighlightRenderer({
	styles,
	forceSolid,
	shape,
	opacity,
}: {
	styles: TLHighlightShapeResolvedStyles
	forceSolid: boolean
	shape: TLHighlightShape
	opacity: number
}) {
	const allPointsFromSegments = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)

	let sw = styles.strokeWidth
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

	return (
		<path
			d={solidStrokePath}
			strokeLinecap="round"
			fill="none"
			pointerEvents="all"
			stroke={styles.strokeColor}
			strokeWidth={sw}
			opacity={opacity}
		/>
	)
}

function useHighlightForceSolid(editor: Editor, shape: TLHighlightShape) {
	return useValue(
		'forceSolid',
		() => {
			const styles = editor.getShapeStyles<TLHighlightShapeResolvedStyles>(shape)
			const sw = styles?.strokeWidth ?? getStrokeWidth(shape)
			const zoomLevel = editor.getEfficientZoomLevel()
			if (sw / zoomLevel < 1.5) {
				return true
			}
			return false
		},
		[editor, shape]
	)
}

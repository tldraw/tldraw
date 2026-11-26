import {
	Circle2d,
	Polygon2d,
	ShapeUtil,
	SvgExportContext,
	TLHighlightShape,
	TLHighlightShapeProps,
	TLResizeInfo,
	VecLike,
	b64Vecs,
	debugFlags,
	getColorValue,
	highlightShapeMigrations,
	highlightShapeProps,
	last,
	lerp,
	rng,
	tlenvReactive,
} from '@tldraw/editor'
import { getHighlightFreehandSettings, getPointsFromDrawSegments } from '../draw/getPath'
import { FONT_SIZES } from '../shared/default-shape-constants'
import { getStroke } from '../shared/freehand/getStroke'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import type { ShapeOptionsWithDisplayValues } from '../shared/getDisplayValues'
import { getDisplayValues } from '../shared/getDisplayValues'
import { interpolateSegments } from '../shared/interpolate-props'

/** @public */
export interface HighlightShapeUtilDisplayValues {
	strokeColor: string
	strokeWidth: number
	underlayOpacity: number
	overlayOpacity: number
}

/** @public */
export interface HighlightShapeOptions extends ShapeOptionsWithDisplayValues<
	TLHighlightShape,
	HighlightShapeUtilDisplayValues
> {
	/**
	 * The maximum number of points in a line before the draw tool will begin a new shape.
	 * A higher number will lead to poor performance while drawing very long lines.
	 */
	readonly maxPointsPerShape: number
}

/** @public */
export class HighlightShapeUtil extends ShapeUtil<TLHighlightShape> {
	static override type = 'highlight' as const
	static override props = highlightShapeProps
	static override migrations = highlightShapeMigrations

	override options: HighlightShapeOptions = {
		maxPointsPerShape: 600,
		getDefaultDisplayValues(_editor, shape, theme, colorMode): HighlightShapeUtilDisplayValues {
			const { color, size } = shape.props
			const colors = theme.colors[colorMode]
			const useP3 = !debugFlags.forceSrgb.get() && tlenvReactive.get().supportsP3ColorSpace
			const strokeColor = useP3
				? getColorValue(colors, color, 'highlightP3')
				: getColorValue(colors, color, 'highlightSrgb')
			return {
				strokeColor,
				strokeWidth: theme.fontSize * FONT_SIZES[size] * 1.12,
				underlayOpacity: 0.82,
				overlayOpacity: 0.35,
			}
		},
		getCustomDisplayValues(): Partial<HighlightShapeUtilDisplayValues> {
			return {}
		},
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
		const dv = getDisplayValues(this, shape)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		// No segments yet (the default props): treat it as a dot so geometry lookups don't throw.
		if (getIsDot(shape) || shape.props.segments.length === 0) {
			return new Circle2d({
				x: -strokeWidth / 2,
				y: -strokeWidth / 2,
				radius: strokeWidth / 2,
				isFilled: true,
			})
		}

		const allPointsFromSegments = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)
		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'
		const opts = getHighlightFreehandSettings({ strokeWidth, showAsComplete })

		return new Polygon2d({
			points: getStroke(allPointsFromSegments, opts),
			isFilled: true,
		})
	}

	// The React view draws the shape, see `highlightShapeView`. These methods call it so that a
	// subclass can override them or call `super`.
	component(shape: TLHighlightShape) {
		return this.getView()?.component(shape, this) ?? null
	}

	override backgroundComponent(shape: TLHighlightShape) {
		return this.getView()?.backgroundComponent?.(shape, this) ?? null
	}

	override getIndicatorPath(shape: TLHighlightShape): Path2D {
		const dv = getDisplayValues(this, shape)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		const zoomLevel = this.editor.getEfficientZoomLevel()
		const forceSolid = strokeWidth / zoomLevel < 1.5

		const { strokePoints, sw } = getHighlightStrokePoints(shape, strokeWidth, forceSolid)
		const allPointsFromSegments = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)

		let strokePath
		if (strokePoints.length < 2) {
			strokePath = getIndicatorDot(allPointsFromSegments[0] ?? { x: 0, y: 0 }, sw)
		} else {
			strokePath = getSvgPathFromStrokePoints(strokePoints, false)
		}

		return new Path2D(strokePath)
	}

	override toSvg(shape: TLHighlightShape, ctx: SvgExportContext) {
		return this.getView()?.toSvg?.(shape, ctx, this) ?? null
	}

	override toBackgroundSvg(shape: TLHighlightShape, ctx: SvgExportContext) {
		return this.getView()?.toBackgroundSvg?.(shape, ctx, this) ?? null
	}

	override canFlip() {
		return true
	}

	override onResize(shape: TLHighlightShape, info: TLResizeInfo<TLHighlightShape>) {
		const newScaleX = info.scaleX * shape.props.scaleX
		const newScaleY = info.scaleY * shape.props.scaleY
		if (newScaleX === 0 || newScaleY === 0) return

		return {
			props: {
				scaleX: newScaleX,
				scaleY: newScaleY,
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
			segments: interpolateSegments(startShape.props.segments, endShape.props.segments, t),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}
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

function getIsDot(shape: TLHighlightShape) {
	// A dot is a single-point segment. isSinglePoint knows the per-encoding length
	// (and takes the segment's dim), so this stays correct for both 2D and 3D paths.
	const segment = shape.props.segments[0]
	return shape.props.segments.length === 1 && b64Vecs.isSinglePoint(segment.path, segment.dim)
}

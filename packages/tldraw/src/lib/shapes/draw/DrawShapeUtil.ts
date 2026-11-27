import {
	Box,
	Circle2d,
	Polygon2d,
	Polyline2d,
	ShapeUtil,
	SvgExportContext,
	TLDrawShape,
	TLDrawShapeProps,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	b64Vecs,
	drawShapeMigrations,
	drawShapeProps,
	getColorValue,
	last,
	lerp,
	rng,
} from '@tldraw/editor'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { DEFAULT_FILL_COLOR_NAMES } from '../shared/defaultFills'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { interpolateSegments } from '../shared/interpolate-props'
import { getDot, getFreehandOptions, getPointsFromDrawSegments } from './getPath'

/** @public */
export interface DrawShapeUtilDisplayValues {
	strokeColor: string
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
}

/** @public */
export interface DrawShapeOptions extends ShapeOptionsWithDisplayValues<
	TLDrawShape,
	DrawShapeUtilDisplayValues
> {
	/**
	 * The maximum number of points in a line before the draw tool will begin a new shape.
	 * A higher number will lead to poor performance while drawing very long lines.
	 */
	readonly maxPointsPerShape: number
}

/** @public */
export class DrawShapeUtil extends ShapeUtil<TLDrawShape> {
	static override type = 'draw' as const
	static override props = drawShapeProps
	static override migrations = drawShapeMigrations

	override options: DrawShapeOptions = {
		maxPointsPerShape: 600,
		getDefaultDisplayValues(_editor, shape, theme, colorMode): DrawShapeUtilDisplayValues {
			const { color, fill, size } = shape.props
			const colors = theme.colors[colorMode]
			return {
				strokeColor: getColorValue(colors, color, 'solid'),
				strokeWidth: theme.strokeWidth * STROKE_SIZES[size],
				fillColor:
					fill === 'none'
						? 'transparent'
						: fill === 'semi'
							? colors.solid
							: getColorValue(colors, color, DEFAULT_FILL_COLOR_NAMES[fill]),
				patternFillFallbackColor: getColorValue(colors, color, 'semi'),
			}
		},
		getCustomDisplayValues(): Partial<DrawShapeUtilDisplayValues> {
			return {}
		},
	}

	override hideResizeHandles(shape: TLDrawShape) {
		return getIsDot(shape)
	}
	override hideRotateHandle(shape: TLDrawShape) {
		return getIsDot(shape)
	}
	override hideSelectionBoundsFg(shape: TLDrawShape) {
		return getIsDot(shape)
	}

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
			scale: 1,
			scaleX: 1,
			scaleY: 1,
		}
	}

	getGeometry(shape: TLDrawShape) {
		const points = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)

		const sw = (getDisplayValues(this, shape).strokeWidth + 1) * shape.props.scale

		// No decoded points (the default props have no segments): a dot at the origin, so geometry
		// lookups don't throw on a shape created from its defaults.
		if (points.length === 0) {
			return new Circle2d({ x: -sw, y: -sw, radius: sw, isFilled: true })
		}

		// A dot
		if (shape.props.segments.length === 1) {
			const box = Box.FromPoints(points)
			if (box.width < sw * 2 && box.height < sw * 2) {
				return new Circle2d({
					x: -sw,
					y: -sw,
					radius: sw,
					isFilled: true,
				})
			}
		}

		const strokePoints = getStrokePoints(
			points,
			getFreehandOptions(shape.props, sw, shape.props.isPen, true)
		).map((p) => p.point)

		// A closed draw stroke
		if (shape.props.isClosed && strokePoints.length > 2) {
			return new Polygon2d({
				points: strokePoints,
				isFilled: shape.props.fill !== 'none',
			})
		}

		if (strokePoints.length === 1) {
			return new Circle2d({
				x: -sw,
				y: -sw,
				radius: sw,
				isFilled: true,
			})
		}

		// An open draw stroke
		return new Polyline2d({
			points: strokePoints,
		})
	}

	// The React view draws the shape, see `drawShapeView`. These methods call it so that a
	// subclass can override them or call `super`.
	component(shape: TLDrawShape) {
		return this.getView()?.component(shape, this) ?? null
	}

	override getIndicatorPath(shape: TLDrawShape): Path2D {
		const allPointsFromSegments = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)

		let sw = (getDisplayValues(this, shape).strokeWidth + 1) * shape.props.scale

		const zoomLevel = this.editor.getEfficientZoomLevel()
		const forceSolid = zoomLevel < 0.5 && zoomLevel < 1.5 / sw

		if (
			!forceSolid &&
			!shape.props.isPen &&
			shape.props.dash === 'draw' &&
			allPointsFromSegments.length === 1
		) {
			sw += rng(shape.id)() * (sw / 6)
		}

		const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'
		const options = getFreehandOptions(shape.props, sw, showAsComplete, true)
		const strokePoints = getStrokePoints(allPointsFromSegments, options)
		const solidStrokePath =
			strokePoints.length > 1
				? getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)
				: getDot(allPointsFromSegments[0] ?? { x: 0, y: 0 }, sw)

		return new Path2D(solidStrokePath)
	}

	override toSvg(shape: TLDrawShape, ctx: SvgExportContext) {
		return this.getView()?.toSvg?.(shape, ctx, this) ?? null
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return this.getView()?.getCanvasSvgDefs?.(this) ?? []
	}

	override canFlip() {
		return true
	}

	override onResize(shape: TLDrawShape, info: TLResizeInfo<TLDrawShape>) {
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

	override expandSelectionOutlinePx(shape: TLDrawShape): number {
		const multiplier = shape.props.dash === 'draw' ? 1.6 : 1
		return ((getDisplayValues(this, shape).strokeWidth * multiplier) / 2) * shape.props.scale
	}
	override getInterpolatedProps(
		startShape: TLDrawShape,
		endShape: TLDrawShape,
		t: number
	): TLDrawShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			segments: interpolateSegments(startShape.props.segments, endShape.props.segments, t),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}
}

function getIsDot(shape: TLDrawShape) {
	// A dot is a single-point segment. isSinglePoint knows the per-encoding length
	// (and takes the segment's dim), so this stays correct for both 2D and 3D paths.
	// A bare length threshold can't: a 2-point 2D path is the same length as a 1-point
	// 3D path, so only the dim disambiguates them.
	const segment = shape.props.segments[0]
	return shape.props.segments.length === 1 && b64Vecs.isSinglePoint(segment.path, segment.dim)
}

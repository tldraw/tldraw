import {
	Box,
	Circle2d,
	Polygon2d,
	Polyline2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLDrawShape,
	TLDrawShapeProps,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	VecLike,
	drawShapeMigrations,
	drawShapeProps,
	getColorValue,
	last,
	lerp,
	rng,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { DEFAULT_FILL_COLOR_NAMES } from '../shared/defaultFills'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { svgInk } from '../shared/freehand/svgInk'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { interpolateSegments } from '../shared/interpolate-props'
import { PatternFill } from '../shared/PatternFill'
import {
	getDrawShapeStrokeDashArray,
	getFreehandOptions,
	getPointsFromDrawSegments,
} from './getPath'

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

	component(shape: TLDrawShape) {
		const dv = getDisplayValues(this, shape)
		return (
			<SVGContainer>
				<DrawShapeSvg
					shape={shape}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
				/>
			</SVGContainer>
		)
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
				: getDot(allPointsFromSegments[0], sw)

		return new Path2D(solidStrokePath)
	}

	override toSvg(shape: TLDrawShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		const dv = getDisplayValues(this, shape, ctx.colorMode)
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<DrawShapeSvg
					shape={shape}
					zoomOverride={1}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
				/>
			</g>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
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

function getDot(point: VecLike, sw: number) {
	const r = (sw + 1) * 0.5
	return `M ${point.x} ${point.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${
		r * 2
	},0`
}

function getIsDot(shape: TLDrawShape) {
	// First point is 16 base64 chars (3 Float32s = 12 bytes)
	// Each delta point is 8 base64 chars (3 Float16s = 6 bytes)
	// 1 point = 16 chars, 2 points = 24 chars
	// Check if we have less than 2 points without decoding
	return shape.props.segments.length === 1 && shape.props.segments[0].path.length < 24
}

function DrawShapeSvg({
	shape,
	zoomOverride,
	strokeColor,
	strokeWidth: baseStrokeWidth,
	fillColor,
	patternFillFallbackColor,
}: {
	shape: TLDrawShape
	zoomOverride?: number
	strokeColor: string
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
}) {
	const editor = useEditor()

	const allPointsFromSegments = getPointsFromDrawSegments(
		shape.props.segments,
		shape.props.scaleX,
		shape.props.scaleY
	)

	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	let sw = (baseStrokeWidth + 1) * shape.props.scale
	const forceSolid = useValue(
		'force solid',
		() => {
			const zoomLevel = zoomOverride ?? editor.getEfficientZoomLevel()
			return zoomLevel < 0.5 && zoomLevel < 1.5 / sw
		},
		[editor, sw, zoomOverride]
	)

	const dotAdjustment = useValue(
		'dot adjustment',
		() => {
			const zoomLevel = zoomOverride ?? editor.getEfficientZoomLevel()
			// If we're zoomed way out (10%), then we need to make the dotted line go to 9 instead 0.1
			// Chrome doesn't render anything otherwise.
			return zoomLevel < 0.2 ? 9 : 0.1
		},
		[editor, zoomOverride]
	)

	if (
		!forceSolid &&
		!shape.props.isPen &&
		shape.props.dash === 'draw' &&
		allPointsFromSegments.length === 1
	) {
		sw += rng(shape.id)() * (sw / 6)
	}

	const options = getFreehandOptions(shape.props, sw, showAsComplete, forceSolid)

	if (!forceSolid && shape.props.dash === 'draw') {
		return (
			<>
				{shape.props.isClosed &&
					shape.props.fill !== 'none' &&
					allPointsFromSegments.length > 1 &&
					(shape.props.fill === 'pattern' ? (
						<PatternFill
							d={getSvgPathFromStrokePoints(
								getStrokePoints(allPointsFromSegments, options),
								shape.props.isClosed
							)}
							fillColor={fillColor}
							patternFillFallbackColor={patternFillFallbackColor}
							scale={shape.props.scale}
						/>
					) : (
						<path
							fill={fillColor}
							d={getSvgPathFromStrokePoints(
								getStrokePoints(allPointsFromSegments, options),
								shape.props.isClosed
							)}
						/>
					))}
				<path d={svgInk(allPointsFromSegments, options)} strokeLinecap="round" fill={strokeColor} />
			</>
		)
	}

	const strokePoints = getStrokePoints(allPointsFromSegments, options)
	const isDot = strokePoints.length < 2
	const solidStrokePath = isDot
		? getDot(allPointsFromSegments[0], 0)
		: getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)

	const fill = isDot || shape.props.isClosed ? shape.props.fill : 'none'

	return (
		<>
			{isDot || !shape.props.isClosed || fill === 'none' ? null : fill === 'pattern' ? (
				<PatternFill
					d={solidStrokePath}
					fillColor={fillColor}
					patternFillFallbackColor={patternFillFallbackColor}
					scale={shape.props.scale}
				/>
			) : (
				<path fill={fillColor} d={solidStrokePath} />
			)}
			{shape.props.dash !== 'none' && (
				<path
					d={solidStrokePath}
					strokeLinecap="round"
					fill={isDot ? strokeColor : 'none'}
					stroke={strokeColor}
					strokeWidth={sw}
					strokeDasharray={isDot ? 'none' : getDrawShapeStrokeDashArray(shape, sw, dotAdjustment)}
					strokeDashoffset="0"
				/>
			)}
		</>
	)
}

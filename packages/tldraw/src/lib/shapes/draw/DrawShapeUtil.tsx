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
	TLDrawShapeResolvedStyles,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	TLStyleContext,
	VecLike,
	drawShapeMigrations,
	drawShapeProps,
	getColorValue,
	getDefaultColorTheme,
	last,
	lerp,
	rng,
	useEditor,
	useShapeStyles,
	useValue,
} from '@tldraw/editor'

import { ShapeFill, ShapeFillProps } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getFillDefForCanvas, getFillDefForExport, useGetHashPatternZoomName } from '../shared/defaultStyleDefs'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { svgInk } from '../shared/freehand/svgInk'
import { interpolateSegments } from '../shared/interpolate-props'
import {
	getDrawShapeStrokeDashArray,
	getFreehandOptions,
	getPointsFromDrawSegments,
} from './getPath'

/** @public */
export interface DrawShapeOptions {
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

	override getDefaultStyles(shape: TLDrawShape, ctx: TLStyleContext): TLDrawShapeResolvedStyles {
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })
		const { props } = shape
		const scale = props.scale

		// Stroke width with +1 adjustment for draw shapes
		const strokeWidth = (STROKE_SIZES[props.size] + 1) * scale

		// Compute fill type and color
		const fillType = props.fill === 'none' ? 'none' : props.fill === 'pattern' ? 'pattern' : 'solid'
		const fillColor =
			fillType === 'pattern'
				? getColorValue(theme, props.color, 'pattern')
				: getColorValue(theme, props.color, 'semi')

		return {
			// Stroke
			strokeWidth,
			strokeColor: getColorValue(theme, props.color, 'solid'),
			strokeOpacity: 1,

			// Fill
			fillType,
			fillColor,
			fillOpacity: 1,

			// Pattern (patternUrl computed at render time based on zoom)
			patternColor: getColorValue(theme, props.color, 'pattern'),
		}
	}

	getGeometry(shape: TLDrawShape) {
		const points = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)

		const sw = (STROKE_SIZES[shape.props.size] + 1) * shape.props.scale

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
		return (
			<SVGContainer>
				<DrawShapeSvg shape={shape} />
			</SVGContainer>
		)
	}

	indicator(shape: TLDrawShape) {
		const allPointsFromSegments = getPointsFromDrawSegments(
			shape.props.segments,
			shape.props.scaleX,
			shape.props.scaleY
		)

		let sw = (STROKE_SIZES[shape.props.size] + 1) * shape.props.scale

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const forceSolid = useValue(
			'force solid',
			() => {
				const zoomLevel = this.editor.getEfficientZoomLevel()
				return zoomLevel < 0.5 && zoomLevel < 1.5 / sw
			},
			[this.editor, sw]
		)

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

		return <path d={solidStrokePath} />
	}

	override toSvg(shape: TLDrawShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<DrawShapeSvg shape={shape} zoomOverride={1} />
			</g>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}

	override onResize(shape: TLDrawShape, info: TLResizeInfo<TLDrawShape>) {
		const { scaleX, scaleY } = info

		return {
			props: {
				scaleX: scaleX * shape.props.scaleX,
				scaleY: scaleY * shape.props.scaleY,
			},
		}
	}

	override expandSelectionOutlinePx(shape: TLDrawShape): number {
		const multiplier = shape.props.dash === 'draw' ? 1.6 : 1
		return ((STROKE_SIZES[shape.props.size] * multiplier) / 2) * shape.props.scale
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
	// Each point is 8 base64 characters (3 Float16s = 6 bytes = 8 base64 chars)
	// Check if we have less than 2 points without decoding
	return shape.props.segments.length === 1 && shape.props.segments[0].points.length < 16
}

function DrawShapeSvg({ shape, zoomOverride }: { shape: TLDrawShape; zoomOverride?: number }) {
	const editor = useEditor()
	const styles = useShapeStyles<TLDrawShapeResolvedStyles>(shape)
	const getPatternZoomName = useGetHashPatternZoomName()
	const isDarkMode = editor.user.getIsDarkMode()

	const allPointsFromSegments = getPointsFromDrawSegments(shape.props.segments, shape.props.scaleX, shape.props.scaleY)
	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	// Get stroke width from resolved styles
	let sw = styles?.strokeWidth ?? (STROKE_SIZES[shape.props.size] + 1) * shape.props.scale

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

	// Add random jitter for non-pen draw mode with single point
	if (
		!forceSolid &&
		!shape.props.isPen &&
		shape.props.dash === 'draw' &&
		allPointsFromSegments.length === 1
	) {
		sw += rng(shape.id)() * (sw / 6)
	}

	const options = getFreehandOptions(shape.props, sw, showAsComplete, forceSolid)

	// Use resolved styles for colors
	const strokeColor = styles.strokeColor
	const fillColor = styles.fillColor
	const fillType = styles.fillType
	const patternColor = styles.patternColor
	const fillOpacity = styles.fillOpacity

	// Get pattern URL for pattern fills
	const patternUrl = getPatternZoomName(
		zoomOverride ?? editor.getZoomLevel(),
		isDarkMode ? 'dark' : 'light'
	)

	// Helper to build fill props based on fill type
	const buildFillProps = (d: string, type: 'none' | 'solid' | 'pattern'): ShapeFillProps => {
		switch (type) {
			case 'none':
				return { d, type: 'none' }
			case 'solid':
				return { d, type: 'solid', color: fillColor, opacity: fillOpacity }
			case 'pattern':
				return { d, type: 'pattern', color: patternColor, patternUrl, opacity: fillOpacity }
		}
	}

	if (!forceSolid && shape.props.dash === 'draw') {
		// Hand-drawn style rendering
		const fillPath = getSvgPathFromStrokePoints(
			getStrokePoints(allPointsFromSegments, options),
			shape.props.isClosed
		)

		return (
			<>
				{shape.props.isClosed && fillType !== 'none' && allPointsFromSegments.length > 1 ? (
					<ShapeFill {...buildFillProps(fillPath, fillType)} />
				) : null}
				<path
					d={svgInk(allPointsFromSegments, options)}
					strokeLinecap="round"
					fill={strokeColor}
				/>
			</>
		)
	}

	const strokePoints = getStrokePoints(allPointsFromSegments, options)
	const isDot = strokePoints.length < 2
	const solidStrokePath = isDot
		? getDot(allPointsFromSegments[0], 0)
		: getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)

	// Determine effective fill type for this render
	const effectiveFillType = isDot || shape.props.isClosed ? fillType : 'none'

	return (
		<>
			<ShapeFill {...buildFillProps(solidStrokePath, effectiveFillType)} />
			<path
				d={solidStrokePath}
				strokeLinecap="round"
				fill={isDot ? strokeColor : 'none'}
				stroke={strokeColor}
				strokeWidth={sw}
				strokeDasharray={isDot ? 'none' : getDrawShapeStrokeDashArray(shape, sw, dotAdjustment)}
				strokeDashoffset="0"
			/>
		</>
	)
}

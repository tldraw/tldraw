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
	TLDrawShapeSegment,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	VecLike,
	drawShapeMigrations,
	drawShapeProps,
	getColorValue,
	last,
	lerp,
	rng,
	toFixed,
	useEditor,
	useValue,
} from '@tldraw/editor'

import { ShapeFill } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'
import { svgInk } from '../shared/freehand/svgInk'
import { interpolateSegments } from '../shared/interpolate-props'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { getDrawShapeStrokeDashArray, getFreehandOptions, getPointsFromSegments } from './getPath'

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
		}
	}

	getGeometry(shape: TLDrawShape) {
		const points = getPointsFromSegments(shape.props.segments)

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
		const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

		let sw = (STROKE_SIZES[shape.props.size] + 1) * shape.props.scale

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const forceSolid = useValue(
			'force solid',
			() => {
				const zoomLevel = this.editor.getZoomLevel()
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
	return shape.props.segments.length === 1 && shape.props.segments[0].points.length < 2
}

function DrawShapeSvg({ shape, zoomOverride }: { shape: TLDrawShape; zoomOverride?: number }) {
	const theme = useDefaultColorTheme()
	const editor = useEditor()

	const allPointsFromSegments = getPointsFromSegments(shape.props.segments)

	const showAsComplete = shape.props.isComplete || last(shape.props.segments)?.type === 'straight'

	let sw = (STROKE_SIZES[shape.props.size] + 1) * shape.props.scale
	const forceSolid = useValue(
		'force solid',
		() => {
			const zoomLevel = zoomOverride ?? editor.getZoomLevel()
			return zoomLevel < 0.5 && zoomLevel < 1.5 / sw
		},
		[editor, sw, zoomOverride]
	)

	const dotAdjustment = useValue(
		'dot adjustment',
		() => {
			const zoomLevel = zoomOverride ?? editor.getZoomLevel()
			// If we're zoomed way out (10%), then we need to make the dotted line go to 9 instead 0.1
			// Chrome doesn't render anything otherwise.
			return zoomLevel < 0.2 ? 0 : 0.1
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
				{shape.props.isClosed && shape.props.fill && allPointsFromSegments.length > 1 ? (
					<ShapeFill
						d={getSvgPathFromStrokePoints(
							getStrokePoints(allPointsFromSegments, options),
							shape.props.isClosed
						)}
						theme={theme}
						color={shape.props.color}
						fill={shape.props.isClosed ? shape.props.fill : 'none'}
						scale={shape.props.scale}
					/>
				) : null}
				<path
					d={svgInk(allPointsFromSegments, options)}
					strokeLinecap="round"
					fill={getColorValue(theme, shape.props.color, 'solid')}
				/>
			</>
		)
	}

	const strokePoints = getStrokePoints(allPointsFromSegments, options)
	const isDot = strokePoints.length < 2
	const solidStrokePath = isDot
		? getDot(allPointsFromSegments[0], 0)
		: getSvgPathFromStrokePoints(strokePoints, shape.props.isClosed)

	return (
		<>
			<ShapeFill
				d={solidStrokePath}
				theme={theme}
				color={shape.props.color}
				fill={isDot || shape.props.isClosed ? shape.props.fill : 'none'}
				scale={shape.props.scale}
			/>
			<path
				d={solidStrokePath}
				strokeLinecap="round"
				fill={isDot ? getColorValue(theme, shape.props.color, 'solid') : 'none'}
				stroke={getColorValue(theme, shape.props.color, 'solid')}
				strokeWidth={sw}
				strokeDasharray={isDot ? 'none' : getDrawShapeStrokeDashArray(shape, sw, dotAdjustment)}
				strokeDashoffset="0"
			/>
		</>
	)
}

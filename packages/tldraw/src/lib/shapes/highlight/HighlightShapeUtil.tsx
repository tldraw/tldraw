/* eslint-disable react-hooks/rules-of-hooks */
import {
	Circle2d,
	Editor,
	Polygon2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLHighlightShape,
	TLHighlightShapeProps,
	TLResizeInfo,
	VecLike,
	debugFlags,
	getColorValue,
	highlightShapeMigrations,
	highlightShapeProps,
	last,
	lerp,
	rng,
	tlenvReactive,
	useCurrentThemeId,
	useValue,
} from '@tldraw/editor'

import { getHighlightFreehandSettings, getPointsFromDrawSegments } from '../draw/getPath'
import { FONT_SIZES } from '../shared/default-shape-constants'
import { getStrokeOutlinePoints } from '../shared/freehand/getStrokeOutlinePoints'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { setStrokePointRadii } from '../shared/freehand/setStrokePointRadii'
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
	/**
	 * Per-theme, per-color highlight values for highlight shapes.
	 * Maps `themeId` → `colorName` → `{ srgb, p3 }`.
	 */
	highlightColors: Record<string, Record<string, { srgb: string; p3: string }>>
}

/** @public */
export class HighlightShapeUtil extends ShapeUtil<TLHighlightShape> {
	static override type = 'highlight' as const
	static override props = highlightShapeProps
	static override migrations = highlightShapeMigrations

	override options: HighlightShapeOptions = {
		maxPointsPerShape: 600,
		highlightColors: {
			light: {
				black: { srgb: '#fddd00', p3: 'color(display-p3 0.972 0.8205 0.05)' },
				blue: { srgb: '#10acff', p3: 'color(display-p3 0.308 0.6632 0.9996)' },
				green: { srgb: '#00ffc8', p3: 'color(display-p3 0.2536 0.984 0.7981)' },
				grey: { srgb: '#cbe7f1', p3: 'color(display-p3 0.8163 0.9023 0.9416)' },
				'light-blue': { srgb: '#00f4ff', p3: 'color(display-p3 0.1512 0.9414 0.9996)' },
				'light-green': { srgb: '#65f641', p3: 'color(display-p3 0.563 0.9495 0.3857)' },
				'light-red': { srgb: '#ff7fa3', p3: 'color(display-p3 0.9988 0.5301 0.6397)' },
				'light-violet': { srgb: '#ff88ff', p3: 'color(display-p3 0.9676 0.5652 0.9999)' },
				orange: { srgb: '#ffa500', p3: 'color(display-p3 0.9988 0.6905 0.266)' },
				red: { srgb: '#ff636e', p3: 'color(display-p3 0.9992 0.4376 0.45)' },
				violet: { srgb: '#c77cff', p3: 'color(display-p3 0.7469 0.5089 0.9995)' },
				yellow: { srgb: '#fddd00', p3: 'color(display-p3 0.972 0.8705 0.05)' },
				white: { srgb: '#ffffff', p3: 'color(display-p3 1 1 1)' },
			},
			dark: {
				black: { srgb: '#d2b700', p3: 'color(display-p3 0.8078 0.6225 0.0312)' },
				blue: { srgb: '#0079d2', p3: 'color(display-p3 0.0032 0.4655 0.7991)' },
				green: { srgb: '#009774', p3: 'color(display-p3 0.0085 0.582 0.4604)' },
				grey: { srgb: '#9cb4cb', p3: 'color(display-p3 0.6299 0.7012 0.7856)' },
				'light-blue': { srgb: '#00bdc8', p3: 'color(display-p3 0.0023 0.7259 0.7735)' },
				'light-green': { srgb: '#00a000', p3: 'color(display-p3 0.2711 0.6172 0.0195)' },
				'light-red': { srgb: '#db005b', p3: 'color(display-p3 0.7849 0.0585 0.3589)' },
				'light-violet': { srgb: '#c400c7', p3: 'color(display-p3 0.7024 0.0403 0.753)' },
				orange: { srgb: '#d07a00', p3: 'color(display-p3 0.7699 0.4937 0.0085)' },
				red: { srgb: '#de002c', p3: 'color(display-p3 0.7978 0.0509 0.2035)' },
				violet: { srgb: '#9e00ee', p3: 'color(display-p3 0.5651 0.0079 0.8986)' },
				yellow: { srgb: '#d2b700', p3: 'color(display-p3 0.8078 0.7225 0.0312)' },
				white: { srgb: '#ffffff', p3: 'color(display-p3 1 1 1)' },
			},
		},
		getDisplayValues(
			_editor,
			shape,
			theme,
			options: HighlightShapeOptions
		): HighlightShapeUtilDisplayValues {
			const { color, size } = shape.props
			const useP3 = !debugFlags.forceSrgb.get() && tlenvReactive.get().supportsP3ColorSpace
			const highlightColor =
				options.highlightColors[theme.id]?.[color] ?? options.highlightColors['light']?.[color]
			const strokeColor = highlightColor
				? useP3
					? highlightColor.p3
					: highlightColor.srgb
				: getColorValue(theme, color, 'solid')
			return {
				strokeColor,
				strokeWidth: theme.fontSize * FONT_SIZES[size] * 1.12,
				underlayOpacity: 0.82,
				overlayOpacity: 0.35,
			}
		},
		getDisplayValueOverrides(
			_editor,
			_shape,
			_theme,
			_options
		): Partial<HighlightShapeUtilDisplayValues> {
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
		const dv = getDisplayValues(this, shape)
		const sw = dv.strokeWidth * shape.props.scale
		const forceSolid = useHighlightForceSolid(this.editor, sw)

		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					strokeWidth={sw}
					opacity={dv.overlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</SVGContainer>
		)
	}

	override backgroundComponent(shape: TLHighlightShape) {
		const themeId = useCurrentThemeId()
		const dv = getDisplayValues(this, shape, themeId)
		const sw = dv.strokeWidth * shape.props.scale
		const forceSolid = useHighlightForceSolid(this.editor, sw)
		return (
			<SVGContainer>
				<HighlightRenderer
					shape={shape}
					forceSolid={forceSolid}
					strokeWidth={sw}
					opacity={dv.underlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</SVGContainer>
		)
	}

	indicator(shape: TLHighlightShape) {
		const dv = getDisplayValues(this, shape)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		const forceSolid = useHighlightForceSolid(this.editor, strokeWidth)

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

	override useLegacyIndicator() {
		return false
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
			strokePath = getIndicatorDot(allPointsFromSegments[0], sw)
		} else {
			strokePath = getSvgPathFromStrokePoints(strokePoints, false)
		}

		return new Path2D(strokePath)
	}

	override toSvg(shape: TLHighlightShape, ctx: SvgExportContext) {
		const dv = getDisplayValues(this, shape, ctx.themeId)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		const forceSolid = strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					shape={shape}
					opacity={dv.overlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</g>
		)
	}

	override toBackgroundSvg(shape: TLHighlightShape, ctx: SvgExportContext) {
		const dv = getDisplayValues(this, shape, ctx.themeId)
		const strokeWidth = dv.strokeWidth * shape.props.scale
		const forceSolid = strokeWidth < 1.5
		const scaleFactor = 1 / shape.props.scale
		return (
			<g transform={`scale(${scaleFactor})`}>
				<HighlightRenderer
					forceSolid={forceSolid}
					strokeWidth={strokeWidth}
					shape={shape}
					opacity={dv.underlayOpacity}
					strokeColor={dv.strokeColor}
				/>
			</g>
		)
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
	strokeColor,
}: {
	strokeWidth: number
	forceSolid: boolean
	shape: TLHighlightShape
	opacity: number
	strokeColor: string
}) {
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

	return (
		<path
			d={solidStrokePath}
			strokeLinecap="round"
			fill="none"
			pointerEvents="all"
			stroke={strokeColor}
			strokeWidth={sw}
			opacity={opacity}
		/>
	)
}

function useHighlightForceSolid(editor: Editor, scaledStrokeWidth: number) {
	return useValue(
		'forceSolid',
		() => {
			const zoomLevel = editor.getEfficientZoomLevel()
			return scaledStrokeWidth / zoomLevel < 1.5
		},
		[editor, scaledStrokeWidth]
	)
}

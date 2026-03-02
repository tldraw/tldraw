/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Box,
	DefaultColorThemePalette,
	EMPTY_ARRAY,
	Group2d,
	HTMLContainer,
	HandleSnapGeometry,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLGeoShape,
	TLGeoShapeProps,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	Vec,
	WeakCache,
	exhaustiveSwitchError,
	geoShapeMigrations,
	geoShapeProps,
	getColorValue,
	getFontsFromRichText,
	isEqual,
	lerp,
	toRichText,
	useIsDarkMode,
	useValue,
} from '@tldraw/editor'
import {
	isEmptyRichText,
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { DEFAULT_FILL_COLOR_NAMES } from '../shared/defaultFills'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { GeoShapeBody } from './GeoShapeBody'
import { getGeoShapePath } from './getGeoShapePath'

// imperfect but good enough, should be the width of the W in the font / size combo
const GEO_SHAPE_MIN_WIDTHS = Object.freeze({
	s: 12,
	m: 14,
	l: 16,
	xl: 20,
})

const GEO_SHAPE_EXTRA_PADDINGS = Object.freeze({
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
})

const GEO_SHAPE_HORIZONTAL_ALIGNS = Object.freeze({
	start: 'start',
	middle: 'center',
	end: 'end',
	'start-legacy': 'start',
	'end-legacy': 'end',
	'middle-legacy': 'center',
} as const)

const GEO_SHAPE_VERTICAL_ALIGNS = Object.freeze({
	start: 'start',
	middle: 'center',
	end: 'end',
} as const)

const GEO_SHAPE_EMPTY_LABEL_SIZE = Object.freeze({ w: 0, h: 0 })

/** @public */
export interface GeoShapeUtilDisplayValues {
	strokeColor: string
	strokeRoundness: number
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
	labelColor: string
	labelFontFamily: string
	labelFontSize: number
	labelMinWidth: number
	labelExtraPadding: number
	labelLineHeight: number
	labelFontWeight: string
	labelFontVariant: string
	labelFontStyle: string
	labelHorizontalAlign: 'start' | 'center' | 'end'
	labelVerticalAlign: 'start' | 'center' | 'end'
	labelPadding: number
	labelEdgeMargin: number
	minSizeWithLabel: number
}

/** @public */
export interface GeoShapeUtilOptions
	extends ShapeOptionsWithDisplayValues<TLGeoShape, GeoShapeUtilDisplayValues> {
	showTextOutline: boolean
}

/** @public */
export class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
	static override type = 'geo' as const
	static override props = geoShapeProps
	static override migrations = geoShapeMigrations

	override options: GeoShapeUtilOptions = {
		showTextOutline: true,
		getDisplayValues(_editor, shape, isDarkMode): GeoShapeUtilDisplayValues {
			const { color, size, labelColor, fill, align, verticalAlign, font } = shape.props

			const theme = DefaultColorThemePalette[isDarkMode ? 'darkMode' : 'lightMode']

			return {
				strokeColor: getColorValue(theme, color, 'solid'),
				strokeRoundness: STROKE_SIZES[size] * 2,
				strokeWidth: STROKE_SIZES[size],
				fillColor:
					fill === 'none'
						? 'transparent'
						: fill === 'semi'
							? theme.solid
							: getColorValue(theme, color, DEFAULT_FILL_COLOR_NAMES[fill]),
				patternFillFallbackColor: getColorValue(theme, color, 'semi'),
				labelColor: getColorValue(theme, labelColor, 'solid'), // todo: separate from the solid color (or create more named colors in the palette so that these could be configured separately)
				labelFontFamily: FONT_FAMILIES[font],
				labelFontSize: LABEL_FONT_SIZES[size],
				labelMinWidth: GEO_SHAPE_MIN_WIDTHS[size],
				labelExtraPadding: GEO_SHAPE_EXTRA_PADDINGS[size],
				labelLineHeight: 1.35,
				labelFontWeight: 'normal',
				labelFontVariant: 'normal',
				labelFontStyle: 'normal',
				labelHorizontalAlign: GEO_SHAPE_HORIZONTAL_ALIGNS[align],
				labelVerticalAlign: GEO_SHAPE_VERTICAL_ALIGNS[verticalAlign],
				labelPadding: LABEL_PADDING,
				// Margin between label edge and shape edge (in unscaled units)
				labelEdgeMargin: 8,
				// Minimum size of the shape to fit a label, based on font size and padding (in unscaled units)
				minSizeWithLabel: (LABEL_PADDING + 1) * 3,
			}
		},
		getDisplayValueOverrides(_editor, _shape, _isDarkMode): Partial<GeoShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLGeoShape['props'] {
		return {
			w: 100,
			h: 100,
			geo: 'rectangle',
			dash: 'draw',
			growY: 0,
			url: '',
			scale: 1,

			// Text properties
			color: 'black',
			labelColor: 'black',
			fill: 'none',
			size: 'm',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			richText: toRichText(''),
		}
	}

	override getGeometry(shape: TLGeoShape) {
		const { props } = shape
		const { scale } = props
		const path = getGeoShapePath(shape)
		const pathGeometry = path.toGeometry()

		const scaledW = Math.max(1, props.w)
		const scaledH = Math.max(1, props.h + props.growY)
		const unscaledShapeW = scaledW / scale
		const unscaledShapeH = scaledH / scale

		const isEmptyLabel = isEmptyRichText(props.richText)
		const unscaledLabelSize = isEmptyLabel
			? GEO_SHAPE_EMPTY_LABEL_SIZE
			: this.getUnscaledLabelSize(shape)

		const dv = getDisplayValues(this, shape, false)

		// Calculate minimum label dimensions based on font size and shape size
		const unscaledMinWidth = Math.min(100, unscaledShapeW / 2)
		const unscaledMinHeight = Math.min(
			dv.labelFontSize * dv.labelLineHeight + dv.labelPadding * 2,
			unscaledShapeH / 2
		)

		// Label dimensions: at least the measured size, but constrained to shape bounds
		const unscaledLabelW = Math.min(
			unscaledShapeW,
			Math.max(
				unscaledLabelSize.w,
				Math.min(unscaledMinWidth, Math.max(1, unscaledShapeW - dv.labelEdgeMargin))
			)
		)
		const unscaledLabelH = Math.min(
			unscaledShapeH,
			Math.max(
				unscaledLabelSize.h,
				Math.min(unscaledMinHeight, Math.max(1, unscaledShapeH - dv.labelEdgeMargin))
			)
		)

		// Calculate position based on alignment
		const unscaledX =
			dv.labelHorizontalAlign === 'start'
				? 0
				: dv.labelHorizontalAlign === 'end'
					? unscaledShapeW - unscaledLabelW
					: (unscaledShapeW - unscaledLabelW) / 2

		const unscaledY =
			dv.labelVerticalAlign === 'start'
				? 0
				: dv.labelVerticalAlign === 'end'
					? unscaledShapeH - unscaledLabelH
					: (unscaledShapeH - unscaledLabelH) / 2

		const labelBounds = {
			x: unscaledX * scale,
			y: unscaledY * scale,
			width: unscaledLabelW * scale,
			height: unscaledLabelH * scale,
		}

		return new Group2d({
			children: [
				pathGeometry,
				new Rectangle2d({
					...labelBounds,
					isFilled: true,
					isLabel: true,
					excludeFromShapeBounds: true,
					isEmptyLabel: isEmptyLabel,
				}),
			],
		})
	}

	override getHandleSnapGeometry(shape: TLGeoShape): HandleSnapGeometry {
		const geometry = this.getGeometry(shape)
		// we only want to snap handles to the outline of the shape - not to its label etc.
		const outline = geometry.children[0]
		switch (shape.props.geo) {
			case 'arrow-down':
			case 'arrow-left':
			case 'arrow-right':
			case 'arrow-up':
			case 'check-box':
			case 'diamond':
			case 'hexagon':
			case 'octagon':
			case 'pentagon':
			case 'rectangle':
			case 'rhombus':
			case 'rhombus-2':
			case 'star':
			case 'trapezoid':
			case 'triangle':
			case 'x-box':
				// poly-line type shapes hand snap points for each vertex & the center
				return { outline: outline, points: [...outline.vertices, geometry.bounds.center] }
			case 'cloud':
			case 'ellipse':
			case 'heart':
			case 'oval':
				// blobby shapes only have a snap point in their center
				return { outline: outline, points: [geometry.bounds.center] }
			default:
				exhaustiveSwitchError(shape.props.geo)
		}
	}

	override getText(shape: TLGeoShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override getFontFaces(shape: TLGeoShape) {
		if (isEmptyRichText(shape.props.richText)) {
			return EMPTY_ARRAY
		}
		return getFontsFromRichText(this.editor, shape.props.richText, {
			family: `tldraw_${shape.props.font}`,
			weight: 'normal',
			style: 'normal',
		})
	}

	component(shape: TLGeoShape) {
		const { id, type, props } = shape
		const { editor } = this
		const isOnlySelected = useValue(
			'isGeoOnlySelected',
			() => shape.id === editor.getOnlySelectedShapeId(),
			[editor]
		)
		const isReadyForEditing = useIsReadyForEditing(editor, shape.id)
		const isForceSolid = useEfficientZoomThreshold(0.25 / shape.props.scale)
		const isDarkMode = useIsDarkMode()
		const dv = getDisplayValues(this, shape, isDarkMode)

		const { w, h, richText, url } = props

		const isEmpty = isEmptyRichText(richText)
		const showHtmlContainer = isReadyForEditing || !isEmpty

		return (
			<>
				<SVGContainer>
					<GeoShapeBody
						shape={shape}
						shouldScale={true}
						forceSolid={isForceSolid}
						strokeColor={dv.strokeColor}
						strokeWidth={dv.strokeWidth}
						fillColor={dv.fillColor}
						patternFillFallbackColor={dv.patternFillFallbackColor}
					/>
				</SVGContainer>
				{showHtmlContainer && (
					<HTMLContainer
						style={{
							overflow: 'hidden',
							width: w,
							height: h + props.growY,
						}}
					>
						<RichTextLabel
							shapeId={id}
							type={type}
							fontFamily={dv.labelFontFamily}
							fontSize={dv.labelFontSize * props.scale}
							lineHeight={dv.labelLineHeight}
							padding={dv.labelPadding * props.scale}
							textAlign={dv.labelHorizontalAlign}
							verticalAlign={dv.labelVerticalAlign}
							richText={richText}
							isSelected={isOnlySelected}
							labelColor={dv.labelColor}
							wrap
							showTextOutline={this.options.showTextOutline}
						/>
					</HTMLContainer>
				)}
				{url && <HyperlinkButton url={url} />}
			</>
		)
	}

	indicator(shape: TLGeoShape) {
		const isZoomedOut = useEfficientZoomThreshold(0.25 / shape.props.scale)

		const { dash, scale } = shape.props
		const dv = getDisplayValues(this, shape, false)

		const path = getGeoShapePath(shape)

		return path.toSvg({
			style: dash === 'draw' ? 'draw' : 'solid',
			strokeWidth: 1,
			passes: 1,
			randomSeed: shape.id,
			offset: 0,
			roundness: dv.strokeRoundness * scale,
			props: { strokeWidth: undefined },
			forceSolid: isZoomedOut,
		})
	}

	override useLegacyIndicator() {
		return false
	}

	override getIndicatorPath(shape: TLGeoShape): Path2D | undefined {
		const isForceSolid = this.editor.getEfficientZoomLevel() < 0.25 / shape.props.scale

		const { dash, scale } = shape.props
		const dv = getDisplayValues(this, shape, false)

		const path = getGeoShapePath(shape)

		return path.toPath2D({
			style: dash === 'draw' ? 'draw' : 'solid',
			strokeWidth: 1,
			passes: 1,
			randomSeed: shape.id,
			offset: 0,
			roundness: dv.strokeRoundness * scale,
			forceSolid: isForceSolid,
		})
	}

	override toSvg(shape: TLGeoShape, ctx: SvgExportContext) {
		const dv = getDisplayValues(this, shape, ctx.isDarkMode)
		const { richText, fill, scale, growY, w, h } = shape.props
		// We need to scale the shape to 1x for export
		const newShape = {
			...shape,
			props: {
				...shape.props,
				w: w / scale,
				h: (h + growY) / scale,
				growY: 0, // growY throws off the path calculations, so we set it to 0
			},
		}
		ctx.addExportDef(getFillDefForExport(fill))

		let textEl
		if (!isEmptyRichText(richText)) {
			const bounds = new Box(0, 0, newShape.props.w, (h + growY) / scale)
			textEl = (
				<RichTextSVG
					fontSize={dv.labelFontSize}
					fontFamily={dv.labelFontFamily}
					lineHeight={dv.labelLineHeight}
					textAlign={dv.labelHorizontalAlign}
					verticalAlign={dv.labelVerticalAlign}
					labelColor={dv.labelColor}
					padding={dv.labelPadding}
					showTextOutline={this.options.showTextOutline}
					bounds={bounds}
					richText={richText}
				/>
			)
		}

		return (
			<>
				<GeoShapeBody
					shouldScale={false}
					shape={newShape}
					forceSolid={false}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
				/>
				{textEl}
			</>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}

	override onResize(
		shape: TLGeoShape,
		{ handle, newPoint, scaleX, scaleY, initialShape }: TLResizeInfo<TLGeoShape>
	) {
		const unscaledInitial = this.getUnscaledGeoProps(initialShape.props)
		// use the w/h from props here instead of the initialBounds here,
		// since cloud shapes calculated bounds can differ from the props w/h.
		let unscaledW = unscaledInitial.w * scaleX
		let unscaledH = (unscaledInitial.h + unscaledInitial.growY) * scaleY
		let overShrinkX = 0
		let overShrinkY = 0

		const dv = getDisplayValues(this, shape, false)

		if (!isEmptyRichText(shape.props.richText)) {
			const absUnscaledW = Math.abs(unscaledW)
			const absUnscaledH = Math.abs(unscaledH)

			// Measure the label at the constrained target dimensions so text wrapping is
			// accounted for. We call measureUnscaledLabelSize directly (bypassing WeakCache)
			// since temp shapes with resize dimensions change every frame. The WeakCache
			// still helps getGeometry, onBeforeCreate, and onBeforeUpdate.
			const measureW = Math.max(absUnscaledW, dv.minSizeWithLabel)
			const measureH = Math.max(absUnscaledH, dv.minSizeWithLabel)
			const unscaledLabelSize = this.measureUnscaledLabelSize({
				...shape,
				props: {
					...shape.props,
					w: measureW * shape.props.scale,
					h: measureH * shape.props.scale,
				},
			} as TLGeoShape)

			const constrainedW = Math.max(absUnscaledW, unscaledLabelSize.w)
			const constrainedH = Math.max(absUnscaledH, unscaledLabelSize.h)

			overShrinkX = constrainedW - absUnscaledW
			overShrinkY = constrainedH - absUnscaledH

			unscaledW = constrainedW * Math.sign(unscaledW || 1)
			unscaledH = constrainedH * Math.sign(unscaledH || 1)
		}

		const scaledW = unscaledW * shape.props.scale
		const scaledH = unscaledH * shape.props.scale

		const offset = new Vec(0, 0)

		// x offsets

		if (scaleX < 0) {
			offset.x += scaledW
		}

		if (handle === 'left' || handle === 'top_left' || handle === 'bottom_left') {
			offset.x += scaleX < 0 ? overShrinkX : -overShrinkX
		}

		// y offsets

		if (scaleY < 0) {
			offset.y += scaledH
		}

		if (handle === 'top' || handle === 'top_left' || handle === 'top_right') {
			offset.y += scaleY < 0 ? overShrinkY : -overShrinkY
		}

		const { x, y } = offset.rot(shape.rotation).add(newPoint)

		return {
			x,
			y,
			props: {
				w: Math.max(Math.abs(scaledW), 1),
				h: Math.max(Math.abs(scaledH), 1),
				growY: 0,
			},
		}
	}

	override onBeforeCreate(shape: TLGeoShape) {
		const { props } = shape

		// No text - ensure growY is 0
		if (isEmptyRichText(props.richText)) {
			return props.growY !== 0 ? { ...shape, props: { ...props, growY: 0 } } : undefined
		}

		// Has text - calculate growY needed to fit label
		const unscaledShapeH = props.h / props.scale
		const unscaledLabelH = this.getUnscaledLabelSize(shape).h
		const unscaledGrowY = this.calculateGrowY(
			unscaledShapeH,
			unscaledLabelH,
			props.growY / props.scale
		)

		if (unscaledGrowY !== null) {
			return {
				...shape,
				props: { ...props, growY: unscaledGrowY * props.scale },
			}
		}

		return undefined
	}

	override onBeforeUpdate(prev: TLGeoShape, next: TLGeoShape) {
		const { props: prevProps } = prev
		const { props: nextProps } = next

		// No change to text, font, or size - no update needed
		if (
			isEqual(prevProps.richText, nextProps.richText) &&
			prevProps.font === nextProps.font &&
			prevProps.size === nextProps.size
		) {
			return undefined
		}

		const wasEmpty = isEmptyRichText(prevProps.richText)
		const isEmpty = isEmptyRichText(nextProps.richText)

		// If label is empty and used to be empty, skip label measurement and dimension adjustment
		if (wasEmpty && isEmpty) {
			return undefined
		}

		// Text was removed - reset growY
		if (isEmpty) {
			return nextProps.growY !== 0 ? { ...next, props: { ...nextProps, growY: 0 } } : undefined
		}

		const unscaledPrev = this.getUnscaledGeoProps(prevProps)
		const unscaledLabelSize = this.getUnscaledLabelSize(next)
		const { scale } = nextProps

		// Text was added for the first time - expand shape to fit (if wasEmpty and now there's text...
		// It might be just whitespace but it is faster to assume that it is NOT just whitespace and expand
		// the shape in either case (a label with just spaces text will be less performant but that's acceptable)
		if (wasEmpty && !isEmpty) {
			const expanded = this.expandShapeForFirstLabel(
				next,
				unscaledPrev.w,
				unscaledPrev.h,
				unscaledLabelSize
			)
			return {
				...next,
				props: {
					...nextProps,
					w: expanded.w * scale,
					h: expanded.h * scale,
					growY: 0,
				},
			}
		}

		// Text was modified - adjust dimensions to fit new label
		const unscaledNextW = next.props.w / scale
		const needsWidthExpand = unscaledLabelSize.w > unscaledNextW
		const unscaledGrowY = this.calculateGrowY(
			unscaledPrev.h,
			unscaledLabelSize.h,
			unscaledPrev.growY
		)

		if (unscaledGrowY !== null || needsWidthExpand) {
			return {
				...next,
				props: {
					...nextProps,
					growY: (unscaledGrowY ?? unscaledPrev.growY) * scale,
					w: Math.max(unscaledNextW, unscaledLabelSize.w) * scale,
				},
			}
		}

		return undefined
	}

	override onDoubleClick(shape: TLGeoShape) {
		// Little easter egg: double-clicking a rectangle / checkbox while
		// holding alt will toggle between check-box and rectangle
		if (this.editor.inputs.getAltKey()) {
			switch (shape.props.geo) {
				case 'rectangle': {
					return {
						...shape,
						props: {
							geo: 'check-box' as const,
						},
					}
				}
				case 'check-box': {
					return {
						...shape,
						props: {
							geo: 'rectangle' as const,
						},
					}
				}
			}
		}

		return
	}

	override getInterpolatedProps(
		startShape: TLGeoShape,
		endShape: TLGeoShape,
		t: number
	): TLGeoShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}

	/**
	 * Get the unscaled dimensions from a geo shape's props
	 */
	private getUnscaledGeoProps(props: TLGeoShapeProps) {
		const { w, h, growY, scale } = props
		return {
			w: w / scale,
			h: h / scale,
			growY: growY / scale,
		}
	}

	/**
	 * Calculate the growY needed to fit a label within a shape.
	 * Returns null if no change is needed, otherwise returns the new unscaled growY value.
	 */
	private calculateGrowY(
		unscaledShapeH: number,
		unscaledLabelH: number,
		unscaledCurrentGrowY: number
	): number | null {
		if (unscaledLabelH > unscaledShapeH) {
			// Label is taller than shape - need to grow
			return unscaledLabelH - unscaledShapeH
		}
		if (unscaledCurrentGrowY > 0) {
			// Label fits and we have existing growY - reset it
			return 0
		}
		// No change needed
		return null
	}

	/**
	 * Calculate expanded dimensions when adding a label to a shape for the first time.
	 * Ensures the shape meets minimum size requirements and is square if originally small.
	 */
	private expandShapeForFirstLabel(
		shape: TLGeoShape,
		unscaledW: number,
		unscaledH: number,
		unscaledLabelSize: { w: number; h: number }
	): { w: number; h: number } {
		let w = Math.max(unscaledW, unscaledLabelSize.w)
		let h = Math.max(unscaledH, unscaledLabelSize.h)

		const dv = getDisplayValues(this, shape, false)

		// If shape was smaller than min size in both dimensions, make it square
		if (unscaledW < dv.minSizeWithLabel && unscaledH < dv.minSizeWithLabel) {
			w = Math.max(w, dv.minSizeWithLabel)
			h = Math.max(h, dv.minSizeWithLabel)
			// Make square by using the larger dimension
			const maxDim = Math.max(w, h)
			w = maxDim
			h = maxDim
		}

		return { w, h }
	}

	private _labelSizesForGeoCache = new WeakCache<TLGeoShape, { w: number; h: number }>()

	/**
	 * Get the cached label size for the shape. Don't call with empty rich text.
	 */
	private getUnscaledLabelSize(shape: TLGeoShape) {
		return this._labelSizesForGeoCache.get(shape, () => {
			return this.measureUnscaledLabelSize(shape)
		})
	}

	/**
	 * Expensively measure the unscaled label size for the shape. Avoid using it if we can.
	 */
	private measureUnscaledLabelSize(shape: TLGeoShape) {
		const dv = getDisplayValues(this, shape, false)

		const html = renderHtmlFromRichTextForMeasurement(this.editor, shape.props.richText)

		const textSize = this.editor.textMeasure.measureHtml(html, {
			...TEXT_PROPS,
			fontFamily: dv.labelFontFamily,
			fontSize: dv.labelFontSize,
			lineHeight: dv.labelLineHeight,
			minWidth: dv.labelMinWidth,
			maxWidth: Math.max(
				// Guard because a DOM nodes can't be less 0
				0,
				// A 'w' width that we're setting as the min-width
				Math.ceil(dv.labelMinWidth + dv.labelExtraPadding),
				// The actual text size
				Math.ceil(shape.props.w / shape.props.scale - dv.labelPadding * 2)
			),
		})

		return {
			w: textSize.w + dv.labelPadding * 2,
			h: textSize.h + dv.labelPadding * 2,
		}
	}
}

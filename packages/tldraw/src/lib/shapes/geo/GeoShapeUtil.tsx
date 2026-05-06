/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Box,
	EMPTY_ARRAY,
	Editor,
	GeoShapeGeoStyle,
	Group2d,
	HTMLContainer,
	HandleSnapGeometry,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLGeoShape,
	TLGeoShapeProps,
	TLMeasureTextOpts,
	TLResizeInfo,
	TLShape,
	TLShapeId,
	TLShapeUtilCanvasSvgDef,
	TLShapeUtilConstructor,
	Vec,
	VecLike,
	WeakCache,
	approximately,
	areAnglesCompatible,
	geoShapeMigrations,
	geoShapeProps,
	getColorValue,
	getFontsFromRichText,
	isEqual,
	lerp,
	toRichText,
	useColorMode,
	useValue,
} from '@tldraw/editor'
import {
	isEmptyRichText,
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import {
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	STROKE_SIZES,
	TEXT_PROPS,
	getFontFamily,
} from '../shared/default-shape-constants'
import { DEFAULT_FILL_COLOR_NAMES } from '../shared/defaultFills'
import { getThemeFontFaces } from '../shared/defaultFonts'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { GeoShapeBody } from './GeoShapeBody'
import {
	defaultGeoTypeDefinitions,
	type GeoTypeDefinition,
	getGeoShapePath,
	getGeoTypeDefinition,
} from './getGeoShapePath'

// imperfect but good enough, should be the width of the W in the font / size combo
const GEO_SHAPE_MIN_WIDTHS = Object.freeze({
	s: 12,
	m: 14,
	l: 16,
	xl: 20,
})

// Extra padding for geo shape labels matches the stroke width
// Computed dynamically in getDisplayValues via theme.strokeWidth * STROKE_SIZES[size]

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
	middle: 'middle',
	end: 'end',
} as const)

const GEO_SHAPE_EMPTY_LABEL_SIZE = Object.freeze({ w: 0, h: 0 })

// Snapshot the built-in geo types at module init so that collision detection
// in `configure()` only fires against the built-ins, not against keys added
// by previous `configure()` calls. This lets repeat `configure()` calls reuse
// the same custom key (e.g. when wrapping/extending the util) without having
// the entry stripped from `options.customGeoTypes`.
const BUILTIN_GEO_TYPES: ReadonlySet<string> = new Set(Object.keys(defaultGeoTypeDefinitions))

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
	labelVerticalAlign: 'start' | 'middle' | 'end'
	labelPadding: number
	labelEdgeMargin: number
	minSizeWithLabel: number
}

/** @public */
export interface GeoShapeOptions extends ShapeOptionsWithDisplayValues<
	TLGeoShape,
	GeoShapeUtilDisplayValues
> {
	showTextOutline: boolean
	/**
	 * A map of custom geo type definitions. Each key becomes a new value for
	 * {@link @tldraw/editor#GeoShapeGeoStyle} that can be used in the style panel
	 * and on shapes. Custom geo types inherit all standard geo shape behavior
	 * (labels, resizing, styling, etc.).
	 *
	 * @example
	 * ```ts
	 * const MyGeoShapeUtil = GeoShapeUtil.configure({
	 *   customGeoTypes: {
	 *     'my-shape': {
	 *       getPath: (w, h) => new PathBuilder().moveTo(0, 0).lineTo(w, 0).lineTo(w, h).lineTo(0, h).close(),
	 *       snapType: 'polygon',
	 *       icon: 'geo-rectangle',
	 *     },
	 *   },
	 * })
	 * ```
	 */
	customGeoTypes?: Record<string, GeoTypeDefinition>
}

/** @public */
export class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
	static override type = 'geo' as const
	static override props = geoShapeProps
	static override migrations = geoShapeMigrations

	static override configure<T extends TLShapeUtilConstructor<any, any>>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		const opts = options as Partial<GeoShapeOptions>
		if (opts.customGeoTypes) {
			const validEntries: Array<[string, GeoTypeDefinition]> = []
			for (const [key, def] of Object.entries(opts.customGeoTypes)) {
				if (BUILTIN_GEO_TYPES.has(key)) {
					if (process.env.NODE_ENV !== 'production') {
						console.warn(
							`[GeoShapeUtil.configure] customGeoTypes key "${key}" collides with a built-in geo type and will be ignored. Please use a unique name.`
						)
					}
					continue
				}
				validEntries.push([key, def])
			}
			if (validEntries.length > 0) {
				GeoShapeGeoStyle.addValues(
					...(validEntries.map(([k]) => k) as Parameters<typeof GeoShapeGeoStyle.addValues>)
				)
			}
			// Strip colliding entries from the options so runtime lookups (tool
			// defaultSize, style panel icons, double-click handlers) don't see them.
			const filtered = { ...opts, customGeoTypes: Object.fromEntries(validEntries) }
			return super.configure(filtered as unknown as typeof options) as T
		}
		return super.configure(options) as T
	}

	override options: GeoShapeOptions = {
		showTextOutline: true,
		getDefaultDisplayValues(_editor, shape, theme, colorMode): GeoShapeUtilDisplayValues {
			const { color, size, labelColor, fill, align, verticalAlign, font } = shape.props
			const colors = theme.colors[colorMode]

			return {
				strokeColor: getColorValue(colors, color, 'solid'),
				strokeRoundness: theme.strokeWidth * STROKE_SIZES[size] * 2,
				strokeWidth: theme.strokeWidth * STROKE_SIZES[size],
				fillColor:
					fill === 'none'
						? 'transparent'
						: fill === 'semi'
							? colors.solid
							: getColorValue(colors, color, DEFAULT_FILL_COLOR_NAMES[fill]),
				patternFillFallbackColor: getColorValue(colors, color, 'semi'),
				labelColor: getColorValue(colors, labelColor, 'solid'), // todo: separate from the solid color (or create more named colors in the palette so that these could be configured separately)
				labelFontFamily: getFontFamily(theme, font),
				labelFontSize: theme.fontSize * LABEL_FONT_SIZES[size],
				labelMinWidth: GEO_SHAPE_MIN_WIDTHS[size],
				labelExtraPadding: theme.strokeWidth * STROKE_SIZES[size],
				labelLineHeight: theme.lineHeight,
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
		getCustomDisplayValues(_editor, _shape): Partial<GeoShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEdit(shape: TLGeoShape) {
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
		const dv = getDisplayValues(this, shape)
		const path = getGeoShapePath(shape, dv.strokeWidth, this.options.customGeoTypes)
		const pathGeometry = path.toGeometry()

		const scaledW = Math.max(1, props.w)
		const scaledH = Math.max(1, props.h + props.growY)
		const unscaledShapeW = scaledW / scale
		const unscaledShapeH = scaledH / scale

		const isEmptyLabel = isEmptyRichText(props.richText)
		const unscaledLabelSize = isEmptyLabel
			? GEO_SHAPE_EMPTY_LABEL_SIZE
			: this.getUnscaledLabelSize(shape)

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
		const def = getGeoTypeDefinition(shape.props.geo, this.options.customGeoTypes)
		if (!def) {
			throw new Error(`Unknown geo type: ${shape.props.geo}`)
		}
		// blobby shapes only snap to the center; polygon shapes snap to vertices + center.
		if (def.snapType === 'blobby') {
			return { outline: outline, points: [geometry.bounds.center] }
		}
		return { outline: outline, points: [...outline.vertices, geometry.bounds.center] }
	}

	override getText(shape: TLGeoShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override getFontFaces(shape: TLGeoShape) {
		if (isEmptyRichText(shape.props.richText)) {
			return EMPTY_ARRAY
		}
		const themeFaces = getThemeFontFaces(this.editor.getCurrentTheme(), shape.props.font)
		if (themeFaces) return themeFaces
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
		const colorMode = useColorMode()
		const dv = getDisplayValues(this, shape, colorMode)

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
						customGeoTypes={this.options.customGeoTypes}
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
							fontSize={dv.labelFontSize}
							lineHeight={dv.labelLineHeight}
							padding={dv.labelPadding}
							textAlign={dv.labelHorizontalAlign}
							verticalAlign={dv.labelVerticalAlign}
							richText={richText}
							isSelected={isOnlySelected}
							labelColor={dv.labelColor}
							wrap
							showTextOutline={this.options.showTextOutline}
							style={
								shape.props.scale !== 1
									? {
											transform: `scale(${shape.props.scale})`,
											transformOrigin: 'top left',
											width: shape.props.w / shape.props.scale,
											height: (shape.props.h + props.growY) / shape.props.scale,
										}
									: undefined
							}
						/>
					</HTMLContainer>
				)}
				{url && <HyperlinkButton url={url} />}
			</>
		)
	}

	override getIndicatorPath(shape: TLGeoShape): Path2D | undefined {
		const isForceSolid = this.editor.getEfficientZoomLevel() < 0.25 / shape.props.scale

		const { dash, scale } = shape.props
		const dv = getDisplayValues(this, shape)

		const path = getGeoShapePath(shape, dv.strokeWidth, this.options.customGeoTypes)

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
		const dv = getDisplayValues(this, shape, ctx.colorMode)
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
					customGeoTypes={this.options.customGeoTypes}
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

		const dv = getDisplayValues(this, shape)

		if (!isEmptyRichText(shape.props.richText)) {
			const absUnscaledW = Math.abs(unscaledW)
			const absUnscaledH = Math.abs(unscaledH)
			// Check the batch cache first (set by Resizing.ts during multi-shape resize).
			// If not cached, measure the label at the constrained target dimensions so text
			// wrapping is accounted for. We call measureUnscaledLabelSize directly (bypassing
			// WeakCache) since temp shapes with resize dimensions change every frame.
			const cached = getBatchLabelSizeCache(this.editor)?.get(shape.id)
			let unscaledLabelSize: { w: number; h: number }
			if (cached) {
				unscaledLabelSize = cached
			} else {
				const measureW = Math.max(absUnscaledW, dv.minSizeWithLabel)
				const measureH = Math.max(absUnscaledH, dv.minSizeWithLabel)
				unscaledLabelSize = this.measureUnscaledLabelSize({
					...shape,
					props: {
						...shape.props,
						w: measureW * shape.props.scale,
						h: measureH * shape.props.scale,
					},
				} as TLGeoShape)
			}

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

		const def = getGeoTypeDefinition(shape.props.geo, this.options.customGeoTypes)
		if (def?.onDoubleClick) {
			const result = def.onDoubleClick(shape)
			if (result) {
				return { ...shape, props: { ...shape.props, ...result.props } }
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

		const dv = getDisplayValues(this, shape)

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
		const batchCached = getBatchLabelSizeCache(this.editor)?.get(shape.id)
		if (batchCached) return batchCached

		return this._labelSizesForGeoCache.get(shape, () => {
			return this.measureUnscaledLabelSize(shape)
		})
	}

	/**
	 * Expensively measure the unscaled label size for the shape. Avoid using it if we can.
	 */
	private measureUnscaledLabelSize(shape: TLGeoShape) {
		const dv = getDisplayValues(this, shape)

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

const MIN_SIZE_WITH_LABEL = (LABEL_PADDING + 1) * 3
const MIN_WIDTHS = GEO_SHAPE_MIN_WIDTHS

// Per-editor batch cache, set by batchMeasureGeoLabels before the resize loop and cleared after.
// When set, onResize will use pre-computed label sizes instead of measuring individually.
// Uses a WeakMap keyed by editor to avoid issues with multiple editors on the same page.
const _batchLabelSizeCaches = new WeakMap<Editor, Map<TLShapeId, { w: number; h: number }>>()

/** @internal */
export function setBatchLabelSizeCache(
	editor: Editor,
	cache: Map<TLShapeId, { w: number; h: number }> | null
) {
	if (cache) {
		_batchLabelSizeCaches.set(editor, cache)
	} else {
		_batchLabelSizeCaches.delete(editor)
	}
}

function getBatchLabelSizeCache(editor: Editor) {
	return _batchLabelSizeCaches.get(editor)
}

/**
 * Build the measurement request params (html + opts) for a geo shape's label
 * without actually performing the measurement. Used by batch measurement.
 */
function getGeoLabelMeasurementRequest(
	editor: Editor,
	shape: TLGeoShape
): { html: string; opts: TLMeasureTextOpts } {
	const { richText, font, size, w } = shape.props
	const theme = editor.getCurrentTheme()
	const minWidth = MIN_WIDTHS[size]
	const html = renderHtmlFromRichTextForMeasurement(editor, richText)
	const opts: TLMeasureTextOpts = {
		...TEXT_PROPS,
		fontFamily: getFontFamily(theme, font),
		fontSize: theme.fontSize * LABEL_FONT_SIZES[size],
		lineHeight: theme.lineHeight,
		minWidth: minWidth,
		maxWidth: Math.max(
			// Guard because a DOM node can't be less than 0
			0,
			// A 'w' width that we're setting as the min-width
			Math.ceil(minWidth + theme.strokeWidth * STROKE_SIZES[size]),
			// The actual text size
			Math.ceil(w / shape.props.scale - LABEL_PADDING * 2)
		),
	}
	return { html, opts }
}

/**
 * Compute the target unscaled width for label measurement during resize.
 * This replicates the measureW computation from onResize so batch measurement can
 * build measurement requests without duplicating GeoShapeUtil internals.
 */
function getGeoResizeTargetWidth(initialProps: TLGeoShapeProps, scaleX: number): number {
	const unscaledInitialW = initialProps.w / initialProps.scale
	const absUnscaledW = Math.abs(unscaledInitialW * scaleX)
	return Math.max(absUnscaledW, MIN_SIZE_WITH_LABEL)
}

/**
 * Batch-measure all geo shape labels before the resize loop to avoid layout thrashing.
 * For each geo shape with a non-empty label that has compatible rotation, compute the
 * measurement request and batch all measurements in a single DOM pass.
 * Sets the per-editor batch cache so onResize and getGeometry can use pre-computed sizes.
 * @internal
 */
export function batchMeasureGeoLabels(
	editor: Editor,
	shapeSnapshots: Map<
		TLShapeId,
		{
			shape: TLShape
			pageRotation: number
			isAspectRatioLocked: boolean
		}
	>,
	scale: VecLike,
	selectionRotation: number,
	isAspectRatioLocked: boolean
) {
	const requests: Array<{ id: TLShapeId; html: string; opts: TLMeasureTextOpts }> = []

	for (const [id, snapshot] of shapeSnapshots) {
		// Only process geo shapes with non-empty text labels
		if (!editor.isShapeOfType<TLGeoShape>(snapshot.shape, 'geo')) continue
		const geoShape = snapshot.shape as TLGeoShape
		if (isEmptyRichText(geoShape.props.richText)) continue

		// Skip unaligned shapes — they take a different resize path (_resizeUnalignedShape)
		// and won't use the standard onResize, so caching wouldn't help.
		if (!areAnglesCompatible(snapshot.pageRotation, selectionRotation)) continue

		// Compute the effective scaleX for this shape, replicating Editor.resizeShape logic.
		// Shapes rotated 90° from the selection axis have their x/y scale swapped.
		const areWidthAndHeightAlignedWithCorrectAxis = approximately(
			(snapshot.pageRotation - selectionRotation) % Math.PI,
			0
		)

		let effectiveScaleX: number
		if (isAspectRatioLocked || snapshot.isAspectRatioLocked) {
			// When aspect ratio is locked, both axes get the same absolute scale
			const uniformScale = Math.max(Math.abs(scale.x), Math.abs(scale.y))
			effectiveScaleX = uniformScale
		} else {
			effectiveScaleX = Math.abs(areWidthAndHeightAlignedWithCorrectAxis ? scale.x : scale.y)
		}

		// Compute the target width for measurement (same logic as onResize)
		const targetW = getGeoResizeTargetWidth(geoShape.props, effectiveScaleX)

		// Build a temporary shape with the target width for measurement
		const tempShape = {
			...geoShape,
			props: {
				...geoShape.props,
				w: targetW * geoShape.props.scale,
			},
		} as TLGeoShape

		const { html, opts } = getGeoLabelMeasurementRequest(editor, tempShape)
		requests.push({ id, html, opts })
	}

	if (requests.length === 0) return

	// Batch measure all labels in one DOM pass
	const results = editor.textMeasure.measureHtmlBatch(
		requests.map(({ html, opts }) => ({ html, opts }))
	)

	// Build the cache map with label sizes (adding padding)
	const cache = new Map<TLShapeId, { w: number; h: number }>()
	for (let i = 0; i < requests.length; i++) {
		cache.set(requests[i].id, {
			w: results[i].w + LABEL_PADDING * 2,
			h: results[i].h + LABEL_PADDING * 2,
		})
	}

	setBatchLabelSizeCache(editor, cache)
}

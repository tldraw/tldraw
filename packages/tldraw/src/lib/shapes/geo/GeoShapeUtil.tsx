/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Box,
	EMPTY_ARRAY,
	Editor,
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
	getDefaultColorTheme,
	getFontsFromRichText,
	isEqual,
	lerp,
	toRichText,
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
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { GeoShapeBody } from './components/GeoShapeBody'
import { getGeoShapePath } from './getGeoShapePath'

const MIN_SIZE_WITH_LABEL = 17 * 3

/** @public */
export class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
	static override type = 'geo' as const
	static override props = geoShapeProps
	static override migrations = geoShapeMigrations

	override options = {
		showTextOutline: true,
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
		const unscaledW = scaledW / scale
		const unscaledH = scaledH / scale

		const isEmptyLabel = isEmptyRichText(props.richText)
		const unscaledLabelSize = isEmptyLabel
			? EMPTY_LABEL_SIZE
			: getUnscaledLabelSize(this.editor, shape)

		const labelBounds = getLabelBounds(
			unscaledW,
			unscaledH,
			unscaledLabelSize,
			props.size,
			props.align,
			props.verticalAlign,
			scale
		)

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
		const { fill, font, align, verticalAlign, size, richText } = props
		const theme = useDefaultColorTheme()
		const { editor } = this
		const isOnlySelected = useValue(
			'isGeoOnlySelected',
			() => shape.id === editor.getOnlySelectedShapeId(),
			[editor]
		)
		const isReadyForEditing = useIsReadyForEditing(editor, shape.id)
		const isEmpty = isEmptyRichText(shape.props.richText)
		const showHtmlContainer = isReadyForEditing || !isEmpty
		const isForceSolid = useEfficientZoomThreshold(shape.props.scale * 0.25)

		return (
			<>
				<SVGContainer>
					<GeoShapeBody shape={shape} shouldScale={true} forceSolid={isForceSolid} />
				</SVGContainer>
				{showHtmlContainer && (
					<HTMLContainer
						style={{
							overflow: 'hidden',
							width: shape.props.w,
							height: shape.props.h + props.growY,
						}}
					>
						<RichTextLabel
							shapeId={id}
							type={type}
							font={font}
							fontSize={LABEL_FONT_SIZES[size] * shape.props.scale}
							lineHeight={TEXT_PROPS.lineHeight}
							padding={LABEL_PADDING * shape.props.scale}
							fill={fill}
							align={align}
							verticalAlign={verticalAlign}
							richText={richText}
							isSelected={isOnlySelected}
							labelColor={getColorValue(theme, props.labelColor, 'solid')}
							wrap
							showTextOutline={this.options.showTextOutline}
						/>
					</HTMLContainer>
				)}
				{shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</>
		)
	}

	indicator(shape: TLGeoShape) {
		const isZoomedOut = useEfficientZoomThreshold(shape.props.scale * 0.25)

		const { size, dash, scale } = shape.props
		const strokeWidth = STROKE_SIZES[size]

		const path = getGeoShapePath(shape)

		return path.toSvg({
			style: dash === 'draw' ? 'draw' : 'solid',
			strokeWidth: 1,
			passes: 1,
			randomSeed: shape.id,
			offset: 0,
			roundness: strokeWidth * 2 * scale,
			props: { strokeWidth: undefined },
			forceSolid: isZoomedOut,
		})
	}

	override toSvg(shape: TLGeoShape, ctx: SvgExportContext) {
		const scale = shape.props.scale
		// We need to scale the shape to 1x for export
		const newShape = {
			...shape,
			props: {
				...shape.props,
				w: shape.props.w / scale,
				h: (shape.props.h + shape.props.growY) / scale,
				growY: 0, // growY throws off the path calculations, so we set it to 0
			},
		}
		const props = newShape.props
		ctx.addExportDef(getFillDefForExport(props.fill))

		let textEl
		if (!isEmptyRichText(props.richText)) {
			const theme = getDefaultColorTheme(ctx)
			const bounds = new Box(0, 0, props.w, (shape.props.h + shape.props.growY) / scale)
			textEl = (
				<RichTextSVG
					fontSize={LABEL_FONT_SIZES[props.size]}
					font={props.font}
					align={props.align}
					verticalAlign={props.verticalAlign}
					richText={props.richText}
					labelColor={getColorValue(theme, props.labelColor, 'solid')}
					bounds={bounds}
					padding={LABEL_PADDING}
					showTextOutline={this.options.showTextOutline}
				/>
			)
		}

		return (
			<>
				<GeoShapeBody shouldScale={false} shape={newShape} forceSolid={false} />
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
		const unscaledInitial = getUnscaledGeoProps(initialShape.props)
		// use the w/h from props here instead of the initialBounds here,
		// since cloud shapes calculated bounds can differ from the props w/h.
		let unscaledW = unscaledInitial.w * scaleX
		let unscaledH = (unscaledInitial.h + unscaledInitial.growY) * scaleY
		let overShrinkX = 0
		let overShrinkY = 0

		if (!isEmptyRichText(shape.props.richText)) {
			// Use initialShape for label measurement to hit the cache.
			// Creating a temp shape with new dimensions would break WeakCache and cause
			// expensive measurements on every resize frame.
			const unscaledLabelSize = getUnscaledLabelSize(this.editor, initialShape)

			const absUnscaledW = Math.abs(unscaledW)
			const absUnscaledH = Math.abs(unscaledH)

			// Constrain to label size (primary constraint) and min size with label (secondary)
			const constrainedW = Math.max(absUnscaledW, unscaledLabelSize.w, MIN_SIZE_WITH_LABEL)
			const constrainedH = Math.max(absUnscaledH, unscaledLabelSize.h, MIN_SIZE_WITH_LABEL)

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
		const unscaledLabelH = getUnscaledLabelSize(this.editor, shape).h
		const unscaledGrowY = calculateGrowY(unscaledShapeH, unscaledLabelH, props.growY / props.scale)

		if (unscaledGrowY !== null) {
			return {
				...shape,
				props: { ...props, growY: unscaledGrowY * props.scale },
			}
		}
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
			return
		}

		const wasEmpty = isEmptyRichText(prevProps.richText)
		const isEmpty = isEmptyRichText(nextProps.richText)

		// If label is empty and used to be empty, skip label measurement and dimension adjustment
		if (wasEmpty && isEmpty) {
			return
		}

		// Text was removed - reset growY
		if (isEmpty) {
			return nextProps.growY !== 0 ? { ...next, props: { ...nextProps, growY: 0 } } : undefined
		}

		const unscaledPrev = getUnscaledGeoProps(prevProps)
		const unscaledLabelSize = getUnscaledLabelSize(this.editor, next)
		const { scale } = nextProps

		// Text was added for the first time - expand shape to fit (if wasEmpty and now there's text...
		// It might be just whitespace but it is faster to assume that it is NOT just whitespace and expand
		// the shape in either case (a label with just spaces text will be less performant but that's acceptable)
		if (wasEmpty && !isEmpty) {
			const expanded = expandShapeForFirstLabel(unscaledPrev.w, unscaledPrev.h, unscaledLabelSize)
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
		const unscaledGrowY = calculateGrowY(unscaledPrev.h, unscaledLabelSize.h, unscaledPrev.growY)

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
}

// imperfect but good enough, should be the width of the W in the font / size combo
const MIN_WIDTHS = Object.freeze({
	s: 12,
	m: 14,
	l: 16,
	xl: 20,
})

const EXTRA_PADDINGS = Object.freeze({
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
})

const EMPTY_LABEL_SIZE = Object.freeze({ w: 0, h: 0 })

// Margin between label edge and shape edge (in unscaled units)
const LABEL_EDGE_MARGIN = 8

/** Calculate label bounds for hit testing */
function getLabelBounds(
	unscaledShapeW: number,
	unscaledShapeH: number,
	unscaledLabelSize: { w: number; h: number },
	size: TLGeoShapeProps['size'],
	align: TLGeoShapeProps['align'],
	verticalAlign: TLGeoShapeProps['verticalAlign'],
	scale: number
): { x: number; y: number; width: number; height: number } {
	// Calculate minimum label dimensions based on font size and shape size
	const unscaledMinWidth = Math.min(100, unscaledShapeW / 2)
	const unscaledMinHeight = Math.min(
		LABEL_FONT_SIZES[size] * TEXT_PROPS.lineHeight + LABEL_PADDING * 2,
		unscaledShapeH / 2
	)

	// Label dimensions: at least the measured size, but constrained to shape bounds
	const unscaledLabelW = Math.min(
		unscaledShapeW,
		Math.max(
			unscaledLabelSize.w,
			Math.min(unscaledMinWidth, Math.max(1, unscaledShapeW - LABEL_EDGE_MARGIN))
		)
	)
	const unscaledLabelH = Math.min(
		unscaledShapeH,
		Math.max(
			unscaledLabelSize.h,
			Math.min(unscaledMinHeight, Math.max(1, unscaledShapeH - LABEL_EDGE_MARGIN))
		)
	)

	// Calculate position based on alignment
	const unscaledX =
		align === 'start'
			? 0
			: align === 'end'
				? unscaledShapeW - unscaledLabelW
				: (unscaledShapeW - unscaledLabelW) / 2

	const unscaledY =
		verticalAlign === 'start'
			? 0
			: verticalAlign === 'end'
				? unscaledShapeH - unscaledLabelH
				: (unscaledShapeH - unscaledLabelH) / 2

	return {
		x: unscaledX * scale,
		y: unscaledY * scale,
		width: unscaledLabelW * scale,
		height: unscaledLabelH * scale,
	}
}

/** Get the unscaled dimensions from a geo shape's props */
function getUnscaledGeoProps(props: TLGeoShapeProps) {
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
function calculateGrowY(
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
function expandShapeForFirstLabel(
	unscaledW: number,
	unscaledH: number,
	unscaledLabelSize: { w: number; h: number }
): { w: number; h: number } {
	let w = Math.max(unscaledW, unscaledLabelSize.w)
	let h = Math.max(unscaledH, unscaledLabelSize.h)

	// If shape was smaller than min size in both dimensions, make it square
	if (unscaledW < MIN_SIZE_WITH_LABEL && unscaledH < MIN_SIZE_WITH_LABEL) {
		w = Math.max(w, MIN_SIZE_WITH_LABEL)
		h = Math.max(h, MIN_SIZE_WITH_LABEL)
		// Make square by using the larger dimension
		const maxDim = Math.max(w, h)
		w = maxDim
		h = maxDim
	}

	return { w, h }
}

const labelSizesForGeo = new WeakCache<TLGeoShape, { w: number; h: number }>()

// Returns cached label size for the shape. Don't call with empty rich text.
function getUnscaledLabelSize(editor: Editor, shape: TLGeoShape) {
	return labelSizesForGeo.get(shape, () => {
		return measureUnscaledLabelSize(editor, shape)
	})
}

// This is the expensive part of the code so we want to avoid calling it if we can
function measureUnscaledLabelSize(editor: Editor, shape: TLGeoShape) {
	const { richText, font, size, w } = shape.props

	const minWidth = MIN_WIDTHS[size]

	const html = renderHtmlFromRichTextForMeasurement(editor, richText)
	const textSize = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: LABEL_FONT_SIZES[size],
		minWidth: minWidth,
		maxWidth: Math.max(
			// Guard because a DOM nodes can't be less 0
			0,
			// A 'w' width that we're setting as the min-width
			Math.ceil(minWidth + EXTRA_PADDINGS[size]),
			// The actual text size
			Math.ceil(w / shape.props.scale - LABEL_PADDING * 2)
		),
	})

	return {
		w: textSize.w + LABEL_PADDING * 2,
		h: textSize.h + LABEL_PADDING * 2,
	}
}

/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLGeometryOpts,
	TLMeasureTextOpts,
	TLResizeInfo,
	TLShapeId,
	TLTextShape,
	Vec,
	createComputedCache,
	getColorValue,
	getFontsFromRichText,
	isEqual,
	resizeScaled,
	textShapeMigrations,
	textShapeProps,
	toRichText,
	useColorMode,
	useEditor,
} from '@tldraw/editor'
import { useCallback } from 'react'
import {
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { FONT_SIZES, TEXT_PROPS, getFontFamily } from '../shared/default-shape-constants'
import { getThemeFontFaces } from '../shared/defaultFonts'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'

const ZERO_OVERFLOW = { left: 0, right: 0, top: 0, bottom: 0 }

/** How far glyph ink spills past each side of the advance box, in unscaled px. */
interface TextInkOverflow {
	left: number
	right: number
	top: number
	bottom: number
}

interface TextShapeBounds {
	width: number
	height: number
	overflow: TextInkOverflow
}

// Measures a text shape's advance box (the wrapped layout, which genuinely changes with width) and
// its glyph ink overflow (cursive/RTL/italic side bearings and tall diacritics that spill past the
// box, see #8803/#8802). The overflow is derived from per-word bleeds (see
// `measureWordsInkOverflow`): lines only break at word boundaries, so the box's spill on each side
// is bounded by the max bleed over the text's words — which doesn't depend on the wrap. So a resize
// re-measures only the advance (one reflow), while the ink padding comes from cached, wrap-invariant
// per-word measurements. Latin text fits its advance box, so its overflow is zero and nothing
// changes.
const textBoundsCache = createComputedCache(
	'text bounds',
	(editor: Editor, shape: TLTextShape): TextShapeBounds => {
		editor.fonts.trackFontsForShape(shape)
		const util = editor.getShapeUtil(shape) as TextShapeUtil
		const dv = getDisplayValues(util, shape)
		const { html, opts, maybeFixedWidth, minWidth } = getTextMeasureSpec(editor, shape.props, dv)
		const advance = editor.textMeasure.measureHtml(html, opts)
		const { width, height } = resolveTextSize(advance, maybeFixedWidth, minWidth, dv.fontSize)
		// Italic/bold widen a word's bleed, and the marks live on runs not on `opts`; measure
		// conservatively in that style when any run uses it (a mixed-format word would otherwise
		// under-measure and clip).
		const words = renderPlaintextFromRichText(editor, shape.props.richText)
			.split(/\s+/)
			.filter(Boolean)
		const overflow = editor.textMeasure.measureWordsInkOverflow(words, {
			...opts,
			fontStyle: richTextHasMark(shape.props.richText, 'italic') ? 'italic' : opts.fontStyle,
			fontWeight: richTextHasMark(shape.props.richText, 'bold') ? 'bold' : opts.fontWeight,
		})
		return { width, height, overflow }
	},
	{ areRecordsEqual: (a, b) => a.props === b.props }
)

// Whether any run in the rich text carries a given mark (e.g. italic/bold).
function richTextHasMark(node: any, type: string): boolean {
	if (node?.marks?.some((m: any) => m.type === type)) return true
	return Array.isArray(node?.content) && node.content.some((c: any) => richTextHasMark(c, type))
}
/** @public */
export interface TextShapeUtilDisplayValues {
	color: string
	fontFamily: string
	fontSize: number
	lineHeight: number
	fontWeight: string
	fontStyle: string
	fontVariant: string
}

/** @public */
export interface TextShapeOptions extends ShapeOptionsWithDisplayValues<
	TLTextShape,
	TextShapeUtilDisplayValues
> {
	/** How much addition padding should be added to the horizontal geometry of the shape when binding to an arrow? */
	extraArrowHorizontalPadding: number
	/** Whether to show the outline of the text shape (using the same color as the canvas). This helps with overlapping shapes. It does not show up on Safari, where text outline is a performance issues. */
	showTextOutline: boolean
}

/** @public */
export class TextShapeUtil extends ShapeUtil<TLTextShape> {
	static override type = 'text' as const
	static override props = textShapeProps
	static override migrations = textShapeMigrations

	override options: TextShapeOptions = {
		extraArrowHorizontalPadding: 10,
		showTextOutline: true,
		getDefaultDisplayValues(_editor, shape, theme, colorMode): TextShapeUtilDisplayValues {
			const { color, font, size } = shape.props
			return {
				color: getColorValue(theme.colors[colorMode], color, 'solid'),
				fontFamily: getFontFamily(theme, font),
				fontSize: theme.fontSize * FONT_SIZES[size],
				lineHeight: theme.lineHeight,
				fontWeight: TEXT_PROPS.fontWeight,
				fontStyle: TEXT_PROPS.fontStyle,
				fontVariant: TEXT_PROPS.fontVariant,
			}
		},
		getCustomDisplayValues(): Partial<TextShapeUtilDisplayValues> {
			return {}
		},
	}

	getDefaultProps(): TLTextShape['props'] {
		return {
			color: 'black',
			size: 'm',
			w: 8,
			font: 'draw',
			textAlign: 'start',
			autoSize: true,
			scale: 1,
			richText: toRichText(''),
		}
	}

	getMinDimensions(shape: TLTextShape) {
		const { width, height } = textBoundsCache.get(this.editor, shape.id)!
		return { width, height }
	}

	getGeometry(shape: TLTextShape, opts: TLGeometryOpts) {
		const { scale } = shape.props
		const { width, height, overflow } = textBoundsCache.get(this.editor, shape.id)!
		const context = opts?.context ?? 'none'
		const isArrowLabel = context === '@tldraw/arrow-without-arrowhead'
		const arrowPadding = isArrowLabel ? this.options.extraArrowHorizontalPadding : 0

		// Pad the geometry by however far glyph ink spills past the advance box so the indicator,
		// selection bounds, hit-testing, snapping, and export viewport all enclose the rendered
		// text (cursive/RTL/italic side bearings, see #8803). The text still renders at the
		// unpadded width, so its position is unchanged. Skipped for arrow labels, whose layout is
		// driven by the advance box.
		const ink = isArrowLabel ? ZERO_OVERFLOW : overflow

		return new Rectangle2d({
			x: (-arrowPadding - ink.left) * scale,
			y: -ink.top * scale,
			width: (width + arrowPadding * 2 + ink.left + ink.right) * scale,
			height: (height + ink.top + ink.bottom) * scale,
			isFilled: true,
			isLabel: true,
		})
	}

	override getFontFaces(shape: TLTextShape) {
		const themeFaces = getThemeFontFaces(this.editor.getCurrentTheme(), shape.props.font)
		if (themeFaces) return themeFaces
		return getFontsFromRichText(this.editor, shape.props.richText, {
			family: `tldraw_${shape.props.font}`,
			weight: 'normal',
			style: 'normal',
		})
	}

	override getText(shape: TLTextShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override canEdit(shape: TLTextShape) {
		return true
	}

	override isAspectRatioLocked(shape: TLTextShape) {
		return true
	} // WAIT NO THIS IS HARD CODED IN THE RESIZE HANDLER

	component(shape: TLTextShape) {
		const {
			id,
			props: { richText, scale, textAlign },
		} = shape

		const { width, height } = this.getMinDimensions(shape)
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const colorMode = useColorMode()
		const dv = getDisplayValues(this, shape, colorMode)
		const handleKeyDown = useTextShapeKeydownHandler(id)

		return (
			<RichTextLabel
				shapeId={id}
				classNamePrefix="tl-text-shape"
				type="text"
				fontFamily={dv.fontFamily}
				fontSize={dv.fontSize}
				lineHeight={dv.lineHeight}
				textAlign={textAlign === 'middle' ? 'center' : textAlign}
				verticalAlign="middle"
				richText={richText}
				labelColor={dv.color}
				isSelected={isSelected}
				textWidth={width}
				textHeight={height}
				showTextOutline={this.options.showTextOutline}
				style={{
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
				wrap
				onKeyDown={handleKeyDown}
			/>
		)
	}

	override getIndicatorPath(shape: TLTextShape): Path2D | undefined {
		if (shape.props.autoSize && this.editor.getEditingShapeId() === shape.id) return undefined
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const path = new Path2D()
		path.rect(bounds.x, bounds.y, bounds.width, bounds.height)
		return path
	}

	override toSvg(shape: TLTextShape, ctx: SvgExportContext) {
		const { width, height, overflow } = textBoundsCache.get(this.editor, shape.id)!
		const dv = getDisplayValues(this, shape, ctx.colorMode)

		// A shape's <foreignObject> clips its content to its bounds during rasterization (a
		// foreignObject establishes a clipping viewport, and the SVG→image rasterizer ignores
		// `overflow: visible`), so cursive/RTL/italic glyph ink that spills past the layout box
		// gets cut from the export (#8802). Grow the box by the ink overflow and pad the content
		// back to its original position so the text lays out identically — only the clip region
		// grows. We grow symmetrically by the largest overflow and use uniform padding, which
		// keeps the content box centered in place without per-side bookkeeping.
		const pad = Math.max(overflow.left, overflow.right, overflow.top, overflow.bottom)
		const exportBounds = new Box(-pad, -pad, width + pad * 2, height + pad * 2)
		return (
			<RichTextSVG
				fontSize={dv.fontSize}
				fontFamily={dv.fontFamily}
				lineHeight={dv.lineHeight}
				textAlign={shape.props.textAlign === 'middle' ? 'center' : shape.props.textAlign}
				verticalAlign="middle"
				richText={shape.props.richText}
				labelColor={dv.color}
				bounds={exportBounds}
				padding={pad}
				showTextOutline={this.options.showTextOutline}
			/>
		)
	}

	override onResize(shape: TLTextShape, info: TLResizeInfo<TLTextShape>) {
		const { newPoint, initialBounds, initialShape, scaleX, handle } = info

		if (info.mode === 'scale_shape' || (handle !== 'right' && handle !== 'left')) {
			return {
				id: shape.id,
				type: shape.type,
				...resizeScaled(shape, info),
			}
		} else {
			const nextWidth = Math.max(1, Math.abs(initialBounds.width * scaleX))
			const { x, y } =
				scaleX < 0 ? Vec.Sub(newPoint, Vec.FromAngle(shape.rotation).mul(nextWidth)) : newPoint

			return {
				id: shape.id,
				type: shape.type,
				x,
				y,
				props: {
					w: nextWidth / initialShape.props.scale,
					autoSize: false,
				},
			}
		}
	}

	override onEditEnd(shape: TLTextShape) {
		// todo: find a way to check if the rich text has any nodes that aren't empty spaces
		const trimmedText = renderPlaintextFromRichText(this.editor, shape.props.richText).trimEnd()

		if (trimmedText.length === 0) {
			this.editor.deleteShapes([shape.id])
		}
	}

	override onBeforeUpdate(prev: TLTextShape, next: TLTextShape) {
		if (!next.props.autoSize) return

		const styleDidChange =
			prev.props.size !== next.props.size ||
			prev.props.textAlign !== next.props.textAlign ||
			prev.props.font !== next.props.font ||
			(prev.props.scale !== 1 && next.props.scale === 1)

		const textDidChange = !isEqual(prev.props.richText, next.props.richText)

		// Only update position if either changed
		if (!styleDidChange && !textDidChange) return

		// Might return a cached value for the bounds
		const boundsA = this.getMinDimensions(prev)

		// Will always be a fresh call to getTextSize
		const dv = getDisplayValues(this, next)
		const boundsB = getTextSize(this.editor, next.props, dv)

		const wA = boundsA.width * prev.props.scale
		const hA = boundsA.height * prev.props.scale
		const wB = boundsB.width * next.props.scale
		const hB = boundsB.height * next.props.scale

		let delta: Vec | undefined

		switch (next.props.textAlign) {
			case 'middle': {
				delta = new Vec((wB - wA) / 2, textDidChange ? 0 : (hB - hA) / 2)
				break
			}
			case 'end': {
				delta = new Vec(wB - wA, textDidChange ? 0 : (hB - hA) / 2)
				break
			}
			default: {
				if (textDidChange) break
				delta = new Vec(0, (hB - hA) / 2)
				break
			}
		}

		if (delta) {
			// account for shape rotation when writing text:
			delta.rot(next.rotation)
			const { x, y } = next
			return {
				...next,
				x: x - delta.x,
				y: y - delta.y,
				props: { ...next.props, w: wB },
			}
		} else {
			return {
				...next,
				props: { ...next.props, w: wB },
			}
		}
	}

	// 	todo: The edge doubleclicking feels like a mistake more often than
	//  not, especially on multiline text. Removed June 16 2024

	// override onDoubleClickEdge = (shape: TLTextShape) => {
	// 	// If the shape has a fixed width, set it to autoSize.
	// 	if (!shape.props.autoSize) {
	// 		return {
	// 			id: shape.id,
	// 			type: shape.type,
	// 			props: {
	// 				autoSize: true,
	// 			},
	// 		}
	// 	}
	// 	// If the shape is scaled, reset the scale to 1.
	// 	if (shape.props.scale !== 1) {
	// 		return {
	// 			id: shape.id,
	// 			type: shape.type,
	// 			props: {
	// 				scale: 1,
	// 			},
	// 		}
	// 	}
	// }
}

// Build the html and measure options shared by the advance-size and ink-overflow measures, so
// they stay in lockstep (same font, wrapping width, and line breaks).
function getTextMeasureSpec(
	editor: Editor,
	props: TLTextShape['props'],
	dv: TextShapeUtilDisplayValues
) {
	const minWidth = 16
	const maybeFixedWidth = props.autoSize ? null : Math.max(minWidth, Math.floor(props.w))
	const html = renderHtmlFromRichTextForMeasurement(editor, props.richText)
	const opts: TLMeasureTextOpts = {
		fontStyle: dv.fontStyle,
		fontWeight: dv.fontWeight,
		fontFamily: dv.fontFamily,
		fontSize: dv.fontSize,
		lineHeight: dv.lineHeight,
		maxWidth: maybeFixedWidth,
		padding: '0px',
	}
	return { html, opts, maybeFixedWidth, minWidth }
}

// Turn a raw advance measurement into the shape's width/height. When autosizing, measureText
// floors fractional widths (`19` not `19.3`), so we +1 to avoid spurious wrapping.
function resolveTextSize(
	advance: { w: number; h: number },
	maybeFixedWidth: number | null,
	minWidth: number,
	fontSize: number
) {
	return {
		width: maybeFixedWidth ?? Math.max(minWidth, advance.w + 1),
		height: Math.max(fontSize, advance.h),
	}
}

// Advance-only size (no ink pass) — used by onBeforeUpdate to reposition autosized text.
function getTextSize(editor: Editor, props: TLTextShape['props'], dv: TextShapeUtilDisplayValues) {
	const { html, opts, maybeFixedWidth, minWidth } = getTextMeasureSpec(editor, props, dv)
	const result = editor.textMeasure.measureHtml(html, opts)
	return resolveTextSize(result, maybeFixedWidth, minWidth, dv.fontSize)
}

function useTextShapeKeydownHandler(id: TLShapeId) {
	const editor = useEditor()

	return useCallback(
		(e: KeyboardEvent) => {
			if (editor.getEditingShapeId() !== id) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, id]
	)
}

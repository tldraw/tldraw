/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLGeometryOpts,
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

const sizeCache = createComputedCache(
	'text size',
	(editor: Editor, shape: TLTextShape) => {
		editor.fonts.trackFontsForShape(shape)
		const util = editor.getShapeUtil(shape) as TextShapeUtil
		const dv = getDisplayValues(util, shape)
		return getTextSize(editor, shape.props, dv)
	},
	{ areRecordsEqual: (a, b) => a.props === b.props }
)

// How far the rendered ink extends beyond the advance-width box that `getTextSize`
// measures, per physical side. Used by `getGeometry` to pad the shape's bounds so
// cursive/RTL/italic glyphs (e.g. Arabic, see #8803) aren't drawn outside the box.
const inkOverflowCache = createComputedCache(
	'text ink overflow',
	(editor: Editor, shape: TLTextShape) => {
		const util = editor.getShapeUtil(shape) as TextShapeUtil
		const dv = getDisplayValues(util, shape)
		// Reuse the size cache so we measure the advance box once and stay consistent with
		// the geometry width. Reading it also tracks the shape's fonts, so this recomputes
		// when a webfont finishes loading.
		const size = sizeCache.get(editor, shape.id)!
		return getTextInkOverflow(editor, shape.props, dv, size)
	},
	{ areRecordsEqual: (a, b) => a.props === b.props }
)
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
		return sizeCache.get(this.editor, shape.id)!
	}

	getGeometry(shape: TLTextShape, opts: TLGeometryOpts) {
		const { scale } = shape.props
		const { width, height } = this.getMinDimensions(shape)!
		const context = opts?.context ?? 'none'
		const isArrowLabel = context === '@tldraw/arrow-without-arrowhead'
		const arrowPadding = isArrowLabel ? this.options.extraArrowHorizontalPadding : 0

		// Pad the geometry by however far glyph ink spills past the advance box so the
		// indicator, selection bounds, and export viewport all enclose the rendered text
		// (cursive/RTL/italic side bearings, see #8803). The text content still renders at
		// the unpadded width, so its position is unchanged. Skipped for arrow labels, whose
		// layout is driven by the advance box.
		const ink = isArrowLabel
			? ZERO_INK_OVERFLOW
			: (inkOverflowCache.get(this.editor, shape.id) ?? ZERO_INK_OVERFLOW)

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
		// Render the text in its unpadded content box (not the ink-padded geometry); the
		// geometry padding only widens the export viewport so glyphs aren't clipped.
		const { width, height } = this.getMinDimensions(shape)

		const dv = getDisplayValues(this, shape, ctx.colorMode)

		const exportBounds = new Box(0, 0, width, height)
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
				padding={0}
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

function getTextSize(editor: Editor, props: TLTextShape['props'], dv: TextShapeUtilDisplayValues) {
	const { richText, w } = props

	const minWidth = 16

	const maybeFixedWidth = props.autoSize ? null : Math.max(minWidth, Math.floor(w))

	const html = renderHtmlFromRichTextForMeasurement(editor, richText)
	const result = editor.textMeasure.measureHtml(html, {
		lineHeight: dv.lineHeight,
		fontWeight: dv.fontWeight,
		fontStyle: dv.fontStyle,
		padding: '0px',
		fontFamily: dv.fontFamily,
		fontSize: dv.fontSize,
		maxWidth: maybeFixedWidth,
	})

	// If we're autosizing the measureText will essentially `Math.floor`
	// the numbers so `19` rather than `19.3`, this means we must +1 to
	// whatever we get to avoid wrapping.
	return {
		width: maybeFixedWidth ?? Math.max(minWidth, result.w + 1),
		height: Math.max(dv.fontSize, result.h),
	}
}

// A lazily-created offscreen 2d context used to measure actual glyph ink bounds via the
// Canvas TextMetrics API (actualBoundingBoxLeft/Right), which the DOM advance-width
// measurement in getTextSize doesn't capture.
let inkCanvasCtx: CanvasRenderingContext2D | null | undefined
function getInkCanvasCtx(editor: Editor): CanvasRenderingContext2D | null {
	if (inkCanvasCtx !== undefined) return inkCanvasCtx
	const canvas = editor.getContainerDocument().createElement('canvas')
	inkCanvasCtx = canvas.getContext('2d')
	return inkCanvasCtx
}

// Resolve a CSS font-family value (which may be a `var(--tl-font-*)` reference) into the
// concrete family list the canvas font shorthand needs — the canvas API does not resolve
// CSS custom properties.
function resolveCanvasFontFamily(editor: Editor, fontFamily: string): string {
	const doc = editor.getContainerDocument()
	const probe = doc.createElement('span')
	probe.style.fontFamily = fontFamily
	probe.style.position = 'absolute'
	probe.style.visibility = 'hidden'
	probe.style.pointerEvents = 'none'
	editor.getContainer().appendChild(probe)
	const view = doc.defaultView ?? window
	const resolved = view.getComputedStyle(probe).fontFamily
	probe.remove()
	return resolved || fontFamily
}

// Scripts whose base direction is right-to-left (Hebrew, Arabic and its supplements,
// Syriac, Thaana, NKo, and the Arabic/Hebrew presentation forms). Used to figure out
// which physical edge a line's text aligns to so we can attribute ink overflow to the
// correct side.
const RTL_REGEX =
	/[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u0780-\u07BF\u07C0-\u07FF\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/

interface TextInkOverflow {
	left: number
	right: number
	top: number
	bottom: number
}

const ZERO_INK_OVERFLOW: TextInkOverflow = { left: 0, right: 0, top: 0, bottom: 0 }

// Scan the rich text for bold/italic marks anywhere in the document. Glyph side bearings
// differ for those styles, but the shape-level display values are always normal, so we'd
// otherwise under-measure styled text. Applying a style found anywhere is a safe
// over-estimate for mixed runs: the box can only get slightly looser, never clip.
function getRichTextMarkStyles(richText: TLTextShape['props']['richText']): {
	italic: boolean
	bold: boolean
} {
	let italic = false
	let bold = false
	const stack: unknown[] = [richText]
	while (stack.length) {
		const node = stack.pop()
		if (!node || typeof node !== 'object') continue
		const { marks, content } = node as { marks?: unknown[]; content?: unknown[] }
		if (Array.isArray(marks)) {
			for (const mark of marks) {
				const type =
					mark && typeof mark === 'object' ? (mark as { type?: unknown }).type : undefined
				if (type === 'italic') italic = true
				else if (type === 'bold') bold = true
			}
		}
		if (Array.isArray(content)) {
			for (const child of content) stack.push(child)
		}
		if (italic && bold) break
	}
	return { italic, bold }
}

// Measure how far the rendered ink extends past the advance-width box that `getTextSize`
// produces, per physical side, in local (unscaled) px. The DOM advance measurement only
// captures pen-advance, so cursive/RTL/italic side bearings (e.g. Arabic, see #8803) and
// tall diacritics get painted outside the box. We re-measure each line with the Canvas
// TextMetrics API, which reports the true ink extent.
//
// Known limitation: soft-wrapped lines in fixed-width shapes are skipped — the browser
// decides where to break them, so we can't attribute their ink to a side. Autosize text
// (the #8803 case) never wraps, so every line is measured.
function getTextInkOverflow(
	editor: Editor,
	props: TLTextShape['props'],
	dv: TextShapeUtilDisplayValues,
	size: { width: number; height: number }
): TextInkOverflow {
	const ctx = getInkCanvasCtx(editor)
	if (!ctx) return ZERO_INK_OVERFLOW

	const text = renderPlaintextFromRichText(editor, props.richText)
	if (text.trim() === '') return ZERO_INK_OVERFLOW

	const family = resolveCanvasFontFamily(editor, dv.fontFamily)
	const marks = getRichTextMarkStyles(props.richText)
	const fontStyle = marks.italic ? 'italic' : dv.fontStyle
	const fontWeight = marks.bold ? 'bold' : dv.fontWeight
	ctx.font = `${fontStyle} ${fontWeight} ${dv.fontSize}px ${family}`

	const boxWidth = size.width
	const boxHeight = size.height
	const lineHeightPx = dv.fontSize * dv.lineHeight
	const lines = text.split('\n')

	let overflowLeft = 0
	let overflowRight = 0
	let overflowTop = 0
	let overflowBottom = 0

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] === '' ? ' ' : lines[i]
		const m = ctx.measureText(line)
		const advance = m.width

		// Fixed-width text wraps; we can't tell where, so skip lines wider than the box.
		// Autosize text never wraps, so always measure it.
		if (!props.autoSize && advance > boxWidth + 1) continue

		const isRTL = RTL_REGEX.test(line)

		// The physical left edge of this line's advance box within [0, boxWidth]. `start`
		// and `end` resolve to a physical side based on the line's base direction (the DOM
		// uses dir="auto"), so an RTL line aligned to `start` sits against the right edge.
		let penX: number
		if (props.textAlign === 'middle') {
			penX = (boxWidth - advance) / 2
		} else {
			const alignsRight =
				(props.textAlign === 'start' && isRTL) || (props.textAlign === 'end' && !isRTL)
			penX = alignsRight ? boxWidth - advance : 0
		}

		// Horizontal: ink edges in box coordinates, then how far they spill past each side.
		// The `|| 0` guards engines that don't report ink bounds (metrics come back
		// undefined), which would otherwise poison the geometry with NaN.
		const inkLeftEdge = penX - (m.actualBoundingBoxLeft || 0)
		const inkRightEdge = penX + (m.actualBoundingBoxRight || 0)
		overflowLeft = Math.max(overflowLeft, -inkLeftEdge)
		overflowRight = Math.max(overflowRight, inkRightEdge - boxWidth)

		// Vertical: only the first line can spill past the top of the block, only the last
		// past the bottom. Place the baseline within the line box the way CSS line-height
		// does (half-leading above the font ascent).
		const fontAscent = m.fontBoundingBoxAscent || dv.fontSize
		const fontDescent = m.fontBoundingBoxDescent || 0
		const baselineFromTop = (lineHeightPx - (fontAscent + fontDescent)) / 2 + fontAscent
		if (i === 0) {
			const inkTop = baselineFromTop - (m.actualBoundingBoxAscent || 0)
			overflowTop = Math.max(overflowTop, -inkTop)
		}
		if (i === lines.length - 1) {
			const lastLineTop = boxHeight - lineHeightPx
			const inkBottom = lastLineTop + baselineFromTop + (m.actualBoundingBoxDescent || 0)
			overflowBottom = Math.max(overflowBottom, inkBottom - boxHeight)
		}
	}

	const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0)
	return {
		left: clamp(overflowLeft),
		right: clamp(overflowRight),
		top: clamp(overflowTop),
		bottom: clamp(overflowBottom),
	}
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

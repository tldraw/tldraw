/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	EMPTY_ARRAY,
	Group2d,
	IndexKey,
	Rectangle2d,
	SafeId,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLNoteShape,
	TLNoteShapeProps,
	TLResizeInfo,
	TLShape,
	TLShapeId,
	Vec,
	WeakCache,
	exhaustiveSwitchError,
	getColorValue,
	getFontsFromRichText,
	isEqual,
	lerp,
	noteShapeMigrations,
	noteShapeProps,
	resizeScaled,
	rng,
	toDomPrecision,
	toRichText,
	useCurrentThemeId,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback, useContext } from 'react'
import { startEditingShapeWithRichText } from '../../tools/SelectTool/selectHelpers'
import { TranslationsContext } from '../../ui/hooks/useTranslation/useTranslation'
import {
	isEmptyRichText,
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { isRightToLeftLanguage } from '../../utils/text/text'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { CLONE_HANDLE_MARGIN, getNoteShapeForAdjacentPosition } from './noteHelpers'

const NOTE_SHAPE_HORIZONTAL_ALIGNS = Object.freeze({
	start: 'start',
	middle: 'center',
	end: 'end',
	'start-legacy': 'start',
	'end-legacy': 'end',
	'middle-legacy': 'center',
} as const)

const NOTE_SHAPE_VERTICAL_ALIGNS = Object.freeze({
	start: 'start',
	middle: 'middle',
	end: 'end',
} as const)

/** @public */
export interface NoteShapeUtilDisplayValues {
	noteWidth: number
	noteHeight: number
	noteBackgroundColor: string
	borderColor: string
	borderWidth: number
	labelColor: string
	labelFontFamily: string
	labelFontSize: number
	labelLineHeight: number
	labelFontWeight: string
	labelFontVariant: string
	labelFontStyle: string
	labelPadding: number
	labelHorizontalAlign: 'start' | 'center' | 'end'
	labelVerticalAlign: 'start' | 'middle' | 'end'
}

/** @public */
export interface NoteShapeOptions extends ShapeOptionsWithDisplayValues<
	TLNoteShape,
	NoteShapeUtilDisplayValues
> {
	/**
	 * How should the note shape resize? By default it does not resize (except automatically based on its text content),
	 * but you can set it to be user-resizable using scale.
	 */
	resizeMode: 'none' | 'scale'
	/**
	 * Per-theme, per-color fill and text color values for note shapes.
	 * Maps `themeId` → `colorName` → `{ fill, text }`.
	 */
	noteColors: Record<string, Record<string, { fill: string; text: string }>>
	/**
	 * Per-theme border color for note shapes.
	 * Maps `themeId` → border color string.
	 */
	noteBorder: Record<string, string>
}

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override options: NoteShapeOptions = {
		resizeMode: 'none',
		noteColors: {
			light: {
				black: { fill: '#FCE19C', text: '#000000' },
				blue: { fill: '#8AA3FF', text: '#000000' },
				green: { fill: '#6FC896', text: '#000000' },
				grey: { fill: '#C0CAD3', text: '#000000' },
				'light-blue': { fill: '#9BC4FD', text: '#000000' },
				'light-green': { fill: '#98D08A', text: '#000000' },
				'light-red': { fill: '#F7A5A1', text: '#000000' },
				'light-violet': { fill: '#DFB0F9', text: '#000000' },
				orange: { fill: '#FAA475', text: '#000000' },
				red: { fill: '#FC8282', text: '#000000' },
				violet: { fill: '#DB91FD', text: '#000000' },
				yellow: { fill: '#FED49A', text: '#000000' },
				white: { fill: '#FFFFFF', text: '#000000' },
			},
			dark: {
				black: { fill: '#2c2c2c', text: '#f2f2f2' },
				blue: { fill: '#2A3F98', text: '#f2f2f2' },
				green: { fill: '#014429', text: '#f2f2f2' },
				grey: { fill: '#56595F', text: '#f2f2f2' },
				'light-blue': { fill: '#1F5495', text: '#f2f2f2' },
				'light-green': { fill: '#21581D', text: '#f2f2f2' },
				'light-red': { fill: '#7a3333', text: '#f2f2f2' },
				'light-violet': { fill: '#762F8E', text: '#f2f2f2' },
				orange: { fill: '#7c3905', text: '#f2f2f2' },
				red: { fill: '#7e201f', text: '#f2f2f2' },
				violet: { fill: '#5f1c70', text: '#f2f2f2' },
				yellow: { fill: '#8a5e1c', text: '#f2f2f2' },
				white: { fill: '#eaeaea', text: '#1d1d1d' },
			},
		},
		noteBorder: {
			light: 'rgb(144, 144, 144)',
			dark: 'rgb(20, 20, 20)',
		},
		getDisplayValues(_editor, shape, theme, options: NoteShapeOptions): NoteShapeUtilDisplayValues {
			const { color, labelColor, font, size, align, verticalAlign } = shape.props
			const noteColor =
				options.noteColors[theme.id]?.[color] ?? options.noteColors['light']?.[color]
			return {
				noteWidth: 200,
				noteHeight: 200,
				noteBackgroundColor: noteColor?.fill ?? getColorValue(theme, color, 'solid'),
				borderColor: options.noteBorder[theme.id] ?? options.noteBorder['light'],
				borderWidth: 2,
				labelColor:
					labelColor === 'black'
						? (noteColor?.text ?? getColorValue(theme, color, 'solid'))
						: getColorValue(theme, labelColor, 'fill'),
				labelFontFamily: FONT_FAMILIES[font],
				labelFontSize: theme.fontSize * LABEL_FONT_SIZES[size],
				labelLineHeight: theme.lineHeight,
				labelFontWeight: TEXT_PROPS.fontWeight,
				labelFontVariant: TEXT_PROPS.fontVariant,
				labelFontStyle: TEXT_PROPS.fontStyle,
				labelPadding: LABEL_PADDING,
				labelHorizontalAlign: NOTE_SHAPE_HORIZONTAL_ALIGNS[align],
				labelVerticalAlign: NOTE_SHAPE_VERTICAL_ALIGNS[verticalAlign],
			}
		},
		getDisplayValueOverrides(
			_editor,
			_shape,
			_theme,
			_options
		): Partial<NoteShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEdit() {
		return true
	}
	override hideResizeHandles() {
		const { resizeMode } = this.options
		switch (resizeMode) {
			case 'none': {
				return true
			}
			case 'scale': {
				return false
			}
			default: {
				throw exhaustiveSwitchError(resizeMode)
			}
		}
	}

	override isAspectRatioLocked() {
		return this.options.resizeMode === 'scale'
	}

	override hideSelectionBoundsFg() {
		return false
	}

	getDefaultProps(): TLNoteShape['props'] {
		return {
			color: 'black',
			richText: toRichText(''),
			size: 'm',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			labelColor: 'black',
			growY: 0,
			fontSizeAdjustment: 1,
			url: '',
			scale: 1,
		}
	}

	getGeometry(shape: TLNoteShape) {
		const { labelHeight, labelWidth } = this.getLabelSize(shape)
		const { scale } = shape.props

		const dv = getDisplayValues(this, shape)

		const lh = labelHeight * scale
		const lw = labelWidth * scale
		const nw = dv.noteWidth * scale
		const nh = getNoteHeight(shape, dv.noteHeight)

		return new Group2d({
			children: [
				new Rectangle2d({ width: nw, height: nh, isFilled: true }),
				new Rectangle2d({
					x:
						dv.labelHorizontalAlign === 'start'
							? 0
							: dv.labelHorizontalAlign === 'end'
								? nw - lw
								: (nw - lw) / 2,
					y:
						dv.labelVerticalAlign === 'start'
							? 0
							: dv.labelVerticalAlign === 'end'
								? nh - lh
								: (nh - lh) / 2,
					width: lw,
					height: lh,
					isFilled: true,
					isLabel: true,
					excludeFromShapeBounds: true,
				}),
			],
		})
	}

	override getHandles(shape: TLNoteShape): TLHandle[] {
		const { scale } = shape.props
		const isCoarsePointer = this.editor.getInstanceState().isCoarsePointer
		if (isCoarsePointer) return []

		const zoom = this.editor.getEfficientZoomLevel()
		if (zoom * scale < 0.25) return []

		const dv = getDisplayValues(this, shape)
		const nh = getNoteHeight(shape, dv.noteHeight)
		const nw = dv.noteWidth * scale
		const offset = (CLONE_HANDLE_MARGIN / zoom) * scale

		if (zoom * scale < 0.5) {
			return [
				{
					id: 'bottom',
					index: 'a3' as IndexKey,
					type: 'clone',
					x: nw / 2,
					y: nh + offset,
				},
			]
		}

		return [
			{
				id: 'top',
				index: 'a1' as IndexKey,
				type: 'clone',
				x: nw / 2,
				y: -offset,
			},
			{
				id: 'right',
				index: 'a2' as IndexKey,
				type: 'clone',
				x: nw + offset,
				y: nh / 2,
			},
			{
				id: 'bottom',
				index: 'a3' as IndexKey,
				type: 'clone',
				x: nw / 2,
				y: nh + offset,
			},
			{
				id: 'left',
				index: 'a4' as IndexKey,
				type: 'clone',
				x: -offset,
				y: nh / 2,
			},
		]
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		const { resizeMode } = this.options
		switch (resizeMode) {
			case 'none': {
				return undefined
			}
			case 'scale': {
				return resizeScaled(shape, info)
			}
			default: {
				throw exhaustiveSwitchError(resizeMode)
			}
		}
	}

	override getText(shape: TLNoteShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override getFontFaces(shape: TLNoteShape) {
		if (isEmptyRichText(shape.props.richText)) {
			return EMPTY_ARRAY
		}
		return getFontsFromRichText(this.editor, shape.props.richText, {
			family: `tldraw_${shape.props.font}`,
			weight: 'normal',
			style: 'normal',
		})
	}

	component(shape: TLNoteShape) {
		const { id, type, props } = shape
		const { scale, richText, fontSizeAdjustment } = props

		const handleKeyDown = useNoteKeydownHandler(id)

		const rotation = useValue(
			'shape rotation',
			() => this.editor.getShapePageTransform(id)?.rotation() ?? 0,
			[this.editor]
		)

		const themeId = useCurrentThemeId()
		const dv = getDisplayValues(this, shape, themeId)

		const nw = dv.noteWidth * scale
		const nh = getNoteHeight(shape, dv.noteHeight)

		// Shadows are hidden when zoomed out far enough or in dark mode
		let hideShadows = useEfficientZoomThreshold(0.25 / scale)
		if (themeId === 'dark') hideShadows = true

		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()

		const isReadyForEditing = useIsReadyForEditing(this.editor, shape.id)
		const isEmpty = isEmptyRichText(richText)

		return (
			<>
				<div
					id={id}
					className="tl-note__container"
					style={{
						width: nw,
						height: nh,
						backgroundColor: dv.noteBackgroundColor,
						borderBottom: hideShadows
							? `${dv.borderWidth * scale}px solid ${dv.borderColor}`
							: 'none',
						boxShadow: hideShadows ? 'none' : getNoteShadow(shape.id, rotation, scale),
					}}
				>
					{(isSelected || isReadyForEditing || !isEmpty) && (
						<RichTextLabel
							shapeId={id}
							type={type}
							fontFamily={dv.labelFontFamily}
							fontSize={(fontSizeAdjustment ?? 1) * dv.labelFontSize * scale}
							lineHeight={dv.labelLineHeight}
							textAlign={dv.labelHorizontalAlign}
							verticalAlign={dv.labelVerticalAlign}
							richText={richText}
							isSelected={isSelected}
							labelColor={dv.labelColor}
							wrap
							padding={dv.labelPadding * scale}
							hasCustomTabBehavior
							showTextOutline={false}
							onKeyDown={handleKeyDown}
						/>
					)}
				</div>
				{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</>
		)
	}

	indicator(shape: TLNoteShape) {
		const { scale } = shape.props
		const dv = getDisplayValues(this, shape)
		return (
			<rect
				rx={scale}
				width={toDomPrecision(dv.noteWidth * scale)}
				height={toDomPrecision(getNoteHeight(shape, dv.noteHeight))}
			/>
		)
	}

	override useLegacyIndicator() {
		return false
	}

	override getIndicatorPath(shape: TLNoteShape): Path2D {
		const { scale } = shape.props
		const dv = getDisplayValues(this, shape)
		const path = new Path2D()
		path.roundRect(0, 0, dv.noteWidth * scale, getNoteHeight(shape, dv.noteHeight), scale)
		return path
	}

	override toSvg(shape: TLNoteShape, ctx: SvgExportContext) {
		const dv = getDisplayValues(this, shape, ctx.themeId)
		const bounds = new Box(0, 0, dv.noteWidth, dv.noteHeight + shape.props.growY)

		const filterId = `note-shadow-${shape.id.replace(/:/g, '_')}` as SafeId

		ctx.addExportDef({
			key: filterId,
			getElement: () => (
				<filter id={filterId} x="-10%" y="-10%" width="130%" height="150%">
					<feMorphology in="SourceAlpha" operator="erode" radius="3" result="erode1" />
					<feGaussianBlur in="erode1" stdDeviation="3" result="blur1" />
					<feOffset in="blur1" dy="3" result="offsetBlur1" />
					<feComponentTransfer in="offsetBlur1" result="shadow1">
						<feFuncA type="linear" slope="0.5" />
					</feComponentTransfer>
					<feMorphology in="SourceAlpha" operator="erode" radius="10" result="erode2" />
					<feGaussianBlur in="erode2" stdDeviation="6" result="blur2" />
					<feOffset in="blur2" dy="6" result="offsetBlur2" />
					<feComponentTransfer in="offsetBlur2" result="shadow2">
						<feFuncA type="linear" slope="0.5" />
					</feComponentTransfer>
					<feMerge>
						<feMergeNode in="shadow1" />
						<feMergeNode in="shadow2" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			),
		})

		return (
			<>
				{ctx.isDarkMode ? null : (
					<rect
						rx={1}
						width={dv.noteWidth}
						height={bounds.h}
						fill={dv.noteBackgroundColor}
						filter={`url(#${filterId})`}
					/>
				)}
				<rect rx={1} width={dv.noteWidth} height={bounds.h} fill={dv.noteBackgroundColor} />
				<RichTextSVG
					fontSize={(shape.props.fontSizeAdjustment ?? 1) * dv.labelFontSize}
					fontFamily={dv.labelFontFamily}
					lineHeight={dv.labelLineHeight}
					textAlign={dv.labelHorizontalAlign}
					verticalAlign={dv.labelVerticalAlign}
					richText={shape.props.richText}
					labelColor={dv.labelColor}
					bounds={bounds}
					padding={dv.labelPadding}
					showTextOutline={false}
				/>
			</>
		)
	}

	override onBeforeCreate(next: TLNoteShape) {
		return this.getNoteSizeAdjustments(next)
	}

	override onBeforeUpdate(prev: TLNoteShape, next: TLNoteShape) {
		if (
			isEqual(prev.props.richText, next.props.richText) &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		return this.getNoteSizeAdjustments(next)
	}

	override getInterpolatedProps(
		startShape: TLNoteShape,
		endShape: TLNoteShape,
		t: number
	): TLNoteShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}

	/**
	 * Get the growY and fontSizeAdjustment for a shape.
	 */
	private getNoteSizeAdjustments(shape: TLNoteShape) {
		const dv = getDisplayValues(this, shape)
		const { labelHeight, fontSizeAdjustment } = this.getLabelSize(shape)
		// When the label height is more than the height of the shape, we add extra height to it
		const growY = Math.max(0, labelHeight - dv.noteHeight)

		if (growY !== shape.props.growY || fontSizeAdjustment !== shape.props.fontSizeAdjustment) {
			return {
				...shape,
				props: {
					...shape.props,
					growY,
					fontSizeAdjustment,
				},
			}
		}

		return undefined
	}

	private _labelSizesForNoteCache = new WeakCache<
		TLShape,
		{ labelHeight: number; labelWidth: number; fontSizeAdjustment: number }
	>()

	/**
	 * Get the cached label size for the shape.
	 */
	private getLabelSize(shape: TLNoteShape) {
		return this._labelSizesForNoteCache.get(shape, () => this.measureNoteLabelSize(shape))
	}

	/**
	 * Expensively measure the label size for a note shape.
	 */
	private measureNoteLabelSize(shape: TLNoteShape) {
		const dv = getDisplayValues(this, shape)
		const { richText } = shape.props

		if (isEmptyRichText(richText)) {
			const minHeight = dv.labelFontSize * dv.labelLineHeight + dv.labelPadding * 2
			return { labelHeight: minHeight, labelWidth: 100, fontSizeAdjustment: 1 }
		}

		const unadjustedFontSize = dv.labelFontSize

		let fontSizeAdjustment = 0
		let iterations = 0
		let labelHeight = dv.noteHeight
		let labelWidth = dv.noteWidth

		// N.B. For some note shapes with text like 'hjhjhjhjhjhjhjhj', you'll run into
		// some text measurement fuzziness where the browser swears there's no overflow (scrollWidth === width)
		// but really there is when you enable overflow-wrap again. This helps account for that little bit
		// of give.
		const FUZZ = 1

		// We slightly make the font smaller if the text is too big for the note, width-wise.
		do {
			fontSizeAdjustment = Math.min(unadjustedFontSize, unadjustedFontSize - iterations)
			const html = renderHtmlFromRichTextForMeasurement(this.editor, richText)
			const nextTextSize = this.editor.textMeasure.measureHtml(html, {
				...TEXT_PROPS,
				lineHeight: dv.labelLineHeight,
				fontFamily: dv.labelFontFamily,
				fontSize: fontSizeAdjustment,
				maxWidth: dv.noteWidth - dv.labelPadding * 2 - FUZZ,
				disableOverflowWrapBreaking: true,
				measureScrollWidth: true,
			})

			labelHeight = nextTextSize.h + dv.labelPadding * 2
			labelWidth = nextTextSize.w + dv.labelPadding * 2

			if (fontSizeAdjustment <= 14) {
				// Too small, just rely now on CSS `overflow-wrap: break-word`
				// We need to recalculate the text measurement here with break-word enabled.
				const html = renderHtmlFromRichTextForMeasurement(this.editor, richText)
				const nextTextSizeWithOverflowBreak = this.editor.textMeasure.measureHtml(html, {
					...TEXT_PROPS,
					lineHeight: dv.labelLineHeight,
					fontFamily: dv.labelFontFamily,
					fontSize: fontSizeAdjustment,
					maxWidth: dv.noteWidth - dv.labelPadding * 2 - FUZZ,
				})
				labelHeight = nextTextSizeWithOverflowBreak.h + dv.labelPadding * 2
				labelWidth = nextTextSizeWithOverflowBreak.w + dv.labelPadding * 2
				break
			}

			if (nextTextSize.scrollWidth.toFixed(0) === nextTextSize.w.toFixed(0)) {
				break
			}
		} while (iterations++ < 50)

		return {
			labelHeight: labelHeight,
			labelWidth: labelWidth,
			fontSizeAdjustment:
				fontSizeAdjustment === unadjustedFontSize ? 1 : fontSizeAdjustment / unadjustedFontSize,
		}
	}
}

function useNoteKeydownHandler(id: TLShapeId) {
	const editor = useEditor()
	// Try to get the translation context, but fallback to ltr if it doesn't exist
	const translation = useContext(TranslationsContext)

	return useCallback(
		(e: KeyboardEvent) => {
			const shape = editor.getShape<TLNoteShape>(id)
			if (!shape) return

			const isTab = e.key === 'Tab'
			const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === 'Enter'
			if (isTab || isCmdEnter) {
				e.preventDefault()

				const pageTransform = editor.getShapePageTransform(id)
				const pageRotation = pageTransform.rotation()

				// Based on the inputs, calculate the offset to the next note
				// tab controls x axis (shift inverts direction set by RTL)
				// cmd enter is the y axis (shift inverts direction)
				const isRTL = !!(
					translation?.dir === 'rtl' ||
					// todo: can we check a partial of the text, so that we don't have to render the whole thing?
					isRightToLeftLanguage(renderPlaintextFromRichText(editor, shape.props.richText))
				)

				const noteUtil = editor.getShapeUtil(shape) as NoteShapeUtil
				const dv = getDisplayValues(noteUtil, shape)

				const noteOffset = isTab
					? dv.noteWidth + editor.options.adjacentShapeMargin
					: dv.noteHeight +
						editor.options.adjacentShapeMargin +
						// If we're growing down, we need to account for the current shape's growY
						(isCmdEnter && !e.shiftKey ? shape.props.growY : 0)
				const offsetLength = noteOffset * shape.props.scale

				const adjacentCenter = new Vec(
					isTab ? (e.shiftKey != isRTL ? -1 : 1) : 0,
					isCmdEnter ? (e.shiftKey ? -1 : 1) : 0
				)
					.mul(offsetLength)
					.add(new Vec(dv.noteWidth / 2, dv.noteHeight / 2).mul(shape.props.scale))
					.rot(pageRotation)
					.add(pageTransform.point())

				const newNote = getNoteShapeForAdjacentPosition(editor, {
					shape,
					center: adjacentCenter,
					pageRotation,
					noteWidth: dv.noteWidth,
					noteHeight: dv.noteHeight,
				})

				if (newNote) {
					startEditingShapeWithRichText(editor, newNote, { selectAll: true })
				}
			}
		},
		[id, editor, translation?.dir]
	)
}

function getNoteHeight(shape: TLNoteShape, noteHeight: number) {
	return (noteHeight + shape.props.growY) * shape.props.scale
}

function getNoteShadow(id: string, rotation: number, scale: number) {
	const random = rng(id) // seeded based on id
	const lift = Math.abs(random()) + 0.5 // 0 to 1.5
	const oy = Math.cos(rotation)
	const a = 5 * scale
	const b = 4 * scale
	const c = 6 * scale
	const d = 7 * scale
	return `0px ${a - lift}px ${a}px -${a}px rgba(15, 23, 31, .6),
	0px ${(b + lift * d) * Math.max(0, oy)}px ${c + lift * d}px -${b + lift * c}px rgba(15, 23, 31, ${(0.3 + lift * 0.1).toFixed(2)}),
	0px ${48 * scale}px ${10 * scale}px -${10 * scale}px inset rgba(15, 23, 44, ${((0.022 + random() * 0.005) * ((1 + oy) / 2)).toFixed(2)})`
}

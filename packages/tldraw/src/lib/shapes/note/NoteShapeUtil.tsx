/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	Editor,
	Group2d,
	IndexKey,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLNoteShape,
	TLNoteShapeProps,
	TLShape,
	TLShapeId,
	Vec,
	WeakCache,
	getDefaultColorTheme,
	lerp,
	noteShapeMigrations,
	noteShapeProps,
	rng,
	toDomPrecision,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback } from 'react'
import { useCurrentTranslation } from '../../ui/hooks/useTranslation/useTranslation'
import { isRightToLeftLanguage } from '../../utils/text/text'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'

import { startEditingShapeWithLabel } from '../../tools/SelectTool/selectHelpers'

import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import {
	CLONE_HANDLE_MARGIN,
	NOTE_CENTER_OFFSET,
	NOTE_SIZE,
	getNoteShapeForAdjacentPosition,
} from './noteHelpers'

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override canEdit() {
		return true
	}
	override hideResizeHandles() {
		return true
	}
	override hideSelectionBoundsFg() {
		return false
	}

	getDefaultProps(): TLNoteShape['props'] {
		return {
			color: 'black',
			size: 'm',
			text: '',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			labelColor: 'black',
			growY: 0,
			fontSizeAdjustment: 0,
			url: '',
			scale: 1,
		}
	}

	getGeometry(shape: TLNoteShape) {
		const { labelHeight, labelWidth } = getLabelSize(this.editor, shape)
		const { scale } = shape.props

		const lh = labelHeight * scale
		const lw = labelWidth * scale
		const nw = NOTE_SIZE * scale
		const nh = getNoteHeight(shape)

		return new Group2d({
			children: [
				new Rectangle2d({ width: nw, height: nh, isFilled: true }),
				new Rectangle2d({
					x:
						shape.props.align === 'start'
							? 0
							: shape.props.align === 'end'
								? nw - lw
								: (nw - lw) / 2,
					y:
						shape.props.verticalAlign === 'start'
							? 0
							: shape.props.verticalAlign === 'end'
								? nh - lh
								: (nh - lh) / 2,
					width: lw,
					height: lh,
					isFilled: true,
					isLabel: true,
				}),
			],
		})
	}

	override getHandles(shape: TLNoteShape): TLHandle[] {
		const { scale } = shape.props
		const isCoarsePointer = this.editor.getInstanceState().isCoarsePointer
		if (isCoarsePointer) return []

		const zoom = this.editor.getZoomLevel()
		if (zoom * scale < 0.25) return []

		const nh = getNoteHeight(shape)
		const nw = NOTE_SIZE * scale
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

	override getText(shape: TLNoteShape) {
		return shape.props.text
	}

	component(shape: TLNoteShape) {
		const {
			id,
			type,
			props: {
				labelColor,
				scale,
				color,
				font,
				size,
				align,
				text,
				verticalAlign,
				fontSizeAdjustment,
			},
		} = shape

		const handleKeyDown = useNoteKeydownHandler(id)

		const theme = useDefaultColorTheme()
		const nw = NOTE_SIZE * scale
		const nh = getNoteHeight(shape)

		const rotation = useValue(
			'shape rotation',
			() => this.editor.getShapePageTransform(id)?.rotation() ?? 0,
			[this.editor]
		)

		// todo: consider hiding shadows on dark mode if they're invisible anyway

		const hideShadows = useValue('zoom', () => this.editor.getZoomLevel() < 0.35 / scale, [
			scale,
			this.editor,
		])

		const isDarkMode = useValue('dark mode', () => this.editor.user.getIsDarkMode(), [this.editor])

		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()

		return (
			<>
				<div
					id={id}
					className="tl-note__container"
					style={{
						width: nw,
						height: nh,
						backgroundColor: theme[color].note.fill,
						borderBottom: hideShadows
							? isDarkMode
								? `${2 * scale}px solid rgb(20, 20, 20)`
								: `${2 * scale}px solid rgb(144, 144, 144)`
							: 'none',
						boxShadow: hideShadows ? 'none' : getNoteShadow(shape.id, rotation, scale),
					}}
				>
					<TextLabel
						shapeId={id}
						type={type}
						font={font}
						fontSize={(fontSizeAdjustment || LABEL_FONT_SIZES[size]) * scale}
						lineHeight={TEXT_PROPS.lineHeight}
						align={align}
						verticalAlign={verticalAlign}
						text={text}
						isNote
						isSelected={isSelected}
						labelColor={labelColor === 'black' ? theme[color].note.text : theme[labelColor].fill}
						wrap
						padding={16 * scale}
						onKeyDown={handleKeyDown}
					/>
				</div>
				{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</>
		)
	}

	indicator(shape: TLNoteShape) {
		const { scale } = shape.props
		return (
			<rect
				rx={scale}
				width={toDomPrecision(NOTE_SIZE * scale)}
				height={toDomPrecision(getNoteHeight(shape))}
			/>
		)
	}

	override toSvg(shape: TLNoteShape, ctx: SvgExportContext) {
		if (shape.props.text) ctx.addExportDef(getFontDefForExport(shape.props.font))
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })
		const bounds = getBoundsForSVG(shape)

		return (
			<>
				<rect x={5} y={5} rx={1} width={NOTE_SIZE - 10} height={bounds.h} fill="rgba(0,0,0,.1)" />
				<rect
					rx={1}
					width={NOTE_SIZE}
					height={bounds.h}
					fill={theme[shape.props.color].note.fill}
				/>
				<SvgTextLabel
					fontSize={shape.props.fontSizeAdjustment || LABEL_FONT_SIZES[shape.props.size]}
					font={shape.props.font}
					align={shape.props.align}
					verticalAlign={shape.props.verticalAlign}
					text={shape.props.text}
					labelColor={theme[shape.props.color].note.text}
					bounds={bounds}
					stroke={false}
				/>
			</>
		)
	}

	override onBeforeCreate(next: TLNoteShape) {
		return getNoteSizeAdjustments(this.editor, next)
	}

	override onBeforeUpdate(prev: TLNoteShape, next: TLNoteShape) {
		if (
			prev.props.text === next.props.text &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		return getNoteSizeAdjustments(this.editor, next)
	}

	override onEditEnd(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.editor.updateShapes([
				{
					id,
					type,
					props: {
						text: text.trimEnd(),
					},
				},
			])
		}
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
}

/**
 * Get the growY and fontSizeAdjustment for a shape.
 */
function getNoteSizeAdjustments(editor: Editor, shape: TLNoteShape) {
	const { labelHeight, fontSizeAdjustment } = getLabelSize(editor, shape)
	// When the label height is more than the height of the shape, we add extra height to it
	const growY = Math.max(0, labelHeight - NOTE_SIZE)

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
}

/**
 * Get the label size for a note.
 */
function getNoteLabelSize(editor: Editor, shape: TLNoteShape) {
	const { text } = shape.props

	if (!text) {
		const minHeight = LABEL_FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + LABEL_PADDING * 2
		return { labelHeight: minHeight, labelWidth: 100, fontSizeAdjustment: 0 }
	}

	const unadjustedFontSize = LABEL_FONT_SIZES[shape.props.size]

	let fontSizeAdjustment = 0
	let iterations = 0
	let labelHeight = NOTE_SIZE
	let labelWidth = NOTE_SIZE

	// N.B. For some note shapes with text like 'hjhjhjhjhjhjhjhj', you'll run into
	// some text measurement fuzziness where the browser swears there's no overflow (scrollWidth === width)
	// but really there is when you enable overflow-wrap again. This helps account for that little bit
	// of give.
	const FUZZ = 1

	// We slightly make the font smaller if the text is too big for the note, width-wise.
	do {
		fontSizeAdjustment = Math.min(unadjustedFontSize, unadjustedFontSize - iterations)
		const nextTextSize = editor.textMeasure.measureText(text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: fontSizeAdjustment,
			maxWidth: NOTE_SIZE - LABEL_PADDING * 2 - FUZZ,
			disableOverflowWrapBreaking: true,
		})

		labelHeight = nextTextSize.h + LABEL_PADDING * 2
		labelWidth = nextTextSize.w + LABEL_PADDING * 2

		if (fontSizeAdjustment <= 14) {
			// Too small, just rely now on CSS `overflow-wrap: break-word`
			// We need to recalculate the text measurement here with break-word enabled.
			const nextTextSizeWithOverflowBreak = editor.textMeasure.measureText(text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES[shape.props.font],
				fontSize: fontSizeAdjustment,
				maxWidth: NOTE_SIZE - LABEL_PADDING * 2 - FUZZ,
			})
			labelHeight = nextTextSizeWithOverflowBreak.h + LABEL_PADDING * 2
			labelWidth = nextTextSizeWithOverflowBreak.w + LABEL_PADDING * 2
			break
		}

		if (nextTextSize.scrollWidth.toFixed(0) === nextTextSize.w.toFixed(0)) {
			break
		}
	} while (iterations++ < 50)

	return {
		labelHeight: labelHeight,
		labelWidth: labelWidth,
		fontSizeAdjustment: fontSizeAdjustment,
	}
}

const labelSizesForNote = new WeakCache<TLShape, ReturnType<typeof getNoteLabelSize>>()

function getLabelSize(editor: Editor, shape: TLNoteShape) {
	return labelSizesForNote.get(shape, () => getNoteLabelSize(editor, shape))
}

function useNoteKeydownHandler(id: TLShapeId) {
	const editor = useEditor()
	const translation = useCurrentTranslation()

	return useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
				const isRTL = !!(translation.dir === 'rtl' || isRightToLeftLanguage(shape.props.text))

				const offsetLength =
					(NOTE_SIZE +
						editor.options.adjacentShapeMargin +
						// If we're growing down, we need to account for the current shape's growY
						(isCmdEnter && !e.shiftKey ? shape.props.growY : 0)) *
					shape.props.scale

				const adjacentCenter = new Vec(
					isTab ? (e.shiftKey != isRTL ? -1 : 1) : 0,
					isCmdEnter ? (e.shiftKey ? -1 : 1) : 0
				)
					.mul(offsetLength)
					.add(NOTE_CENTER_OFFSET.clone().mul(shape.props.scale))
					.rot(pageRotation)
					.add(pageTransform.point())

				const newNote = getNoteShapeForAdjacentPosition(editor, shape, adjacentCenter, pageRotation)

				if (newNote) {
					editor.markHistoryStoppingPoint('editing adjacent shape')
					startEditingShapeWithLabel(editor, newNote, true /* selectAll */)
				}
			}
		},
		[id, editor, translation.dir]
	)
}

function getNoteHeight(shape: TLNoteShape) {
	return (NOTE_SIZE + shape.props.growY) * shape.props.scale
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

function getBoundsForSVG(shape: TLNoteShape) {
	// When rendering the SVG we don't want to adjust for scale
	return new Box(0, 0, NOTE_SIZE, NOTE_SIZE + shape.props.growY)
}

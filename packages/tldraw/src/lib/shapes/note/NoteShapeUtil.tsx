import {
	Editor,
	IndexKey,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLNoteShape,
	TLOnEditEndHandler,
	TLShapeId,
	Vec,
	getDefaultColorTheme,
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
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { useForceSolid } from '../shared/useForceSolid'
import {
	ADJACENT_NOTE_MARGIN,
	CENTER_OFFSET,
	CLONE_HANDLE_MARGIN,
	NOTE_SIZE,
	getNoteShapeForAdjacentPosition,
	startEditingNoteShape,
} from './noteHelpers'

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override canEdit = () => true
	override doesAutoEditOnKeyStroke = () => true
	override hideResizeHandles = () => true
	override hideSelectionBoundsFg = () => false

	getDefaultProps(): TLNoteShape['props'] {
		return {
			color: 'black',
			size: 'm',
			text: '',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			growY: 0,
			fontSizeAdjustment: 0,
			url: '',
		}
	}

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true, isLabel: true })
	}

	override getHandles(shape: TLNoteShape): TLHandle[] {
		const zoom = this.editor.getZoomLevel()
		const offset = CLONE_HANDLE_MARGIN / zoom

		if (zoom < 0.25) return []

		return [
			{
				id: 'top',
				index: 'a1' as IndexKey,
				type: 'clone',
				x: NOTE_SIZE / 2,
				y: -offset,
			},
			{
				id: 'right',
				index: 'a2' as IndexKey,
				type: 'clone',
				x: NOTE_SIZE + offset,
				y: this.getHeight(shape) / 2,
			},
			{
				id: 'bottom',
				index: 'a3' as IndexKey,
				type: 'clone',
				x: NOTE_SIZE / 2,
				y: this.getHeight(shape) + offset,
			},
			{
				id: 'left',
				index: 'a4' as IndexKey,
				type: 'clone',
				x: -offset,
				y: this.getHeight(shape) / 2,
			},
		]
	}

	component(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text, verticalAlign, fontSizeAdjustment },
		} = shape

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const handleKeyDown = useNoteKeydownHandler(id)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const noteHeight = this.getHeight(shape)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const rotation = useValue('shape rotation', () => this.editor.getShape(id)?.rotation ?? 0, [
			this.editor,
		])

		// todo: consider hiding shadows on dark mode if they're invisible anyway
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const hideShadows = useForceSolid()

		// Shadow stuff
		const oy = Math.cos(rotation)
		const ox = Math.sin(rotation)
		const random = rng(id)
		const lift = 1 + random() * 0.5

		return (
			<div
				id={id}
				className="tl-note__container"
				style={{
					width: NOTE_SIZE,
					height: noteHeight,
					color: theme[color].note.text,
					backgroundColor: theme[color].note.fill,
					borderBottom: hideShadows ? `3px solid rgb(144, 144, 144)` : 'none',
					boxShadow: hideShadows
						? 'none'
						: `${ox * 3}px ${4 - lift}px 4px -4px rgba(0,0,0,.8),
						${ox * 6}px ${(6 + lift * 8) * Math.max(0, oy)}px ${6 + lift * 8}px -${6 + lift * 6}px rgba(0,0,0,${0.3 + lift * 0.1}), 
						0px 50px 8px -10px inset rgba(0,0,0,${0.0375 + 0.025 * random()})`,
				}}
			>
				<TextLabel
					id={id}
					type={type}
					font={font}
					fontSize={fontSizeAdjustment || LABEL_FONT_SIZES[size]}
					lineHeight={TEXT_PROPS.lineHeight}
					align={align}
					verticalAlign={verticalAlign}
					text={text}
					isNote
					labelColor={color}
					wrap
					onKeyDown={handleKeyDown}
				/>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</div>
		)
	}

	indicator(shape: TLNoteShape) {
		return (
			<rect
				rx="1"
				width={toDomPrecision(NOTE_SIZE)}
				height={toDomPrecision(this.getHeight(shape))}
			/>
		)
	}

	override toSvg(shape: TLNoteShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFontDefForExport(shape.props.font))
		if (shape.props.text) ctx.addExportDef(getFontDefForExport(shape.props.font))
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const adjustedColor = shape.props.color === 'black' ? 'yellow' : shape.props.color

		return (
			<>
				<rect
					rx={10}
					width={NOTE_SIZE}
					height={bounds.h}
					fill={theme[adjustedColor].solid}
					stroke={theme[adjustedColor].solid}
					strokeWidth={1}
				/>
				<rect rx={10} width={NOTE_SIZE} height={bounds.h} fill={theme.background} opacity={0.28} />
				<SvgTextLabel
					fontSize={shape.props.fontSizeAdjustment || LABEL_FONT_SIZES[shape.props.size]}
					font={shape.props.font}
					align={shape.props.align}
					verticalAlign={shape.props.verticalAlign}
					text={shape.props.text}
					labelColor="black"
					bounds={bounds}
					stroke={false}
				/>
			</>
		)
	}

	override onBeforeCreate = (next: TLNoteShape) => {
		return getGrowY(this.editor, next, next.props.growY)
	}

	override onBeforeUpdate = (prev: TLNoteShape, next: TLNoteShape) => {
		if (
			prev.props.text === next.props.text &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		return getGrowY(this.editor, next, prev.props.growY)
	}

	override onEditEnd: TLOnEditEndHandler<TLNoteShape> = (shape) => {
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
}

function getGrowY(editor: Editor, shape: TLNoteShape, prevGrowY = 0) {
	const PADDING = 16
	const unadjustedFontSize = LABEL_FONT_SIZES[shape.props.size]

	let fontSizeAdjustment = 0
	let iterations = 0
	let nextHeight = NOTE_SIZE

	// We slightly make the font smaller if the text is too big for the note, width-wise.
	do {
		fontSizeAdjustment = Math.min(unadjustedFontSize, unadjustedFontSize - iterations)
		const nextTextSize = editor.textMeasure.measureText(shape.props.text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: fontSizeAdjustment,
			maxWidth: NOTE_SIZE - PADDING * 2,
			disableOverflowWrapBreaking: true,
		})

		nextHeight = nextTextSize.h + PADDING * 2

		if (fontSizeAdjustment <= 14) {
			// Too small, just rely now on CSS `overflow-wrap: break-word`
			break
		}
		if (nextTextSize.scrollWidth.toFixed(0) === nextTextSize.w.toFixed(0)) {
			break
		}
	} while (iterations++ < 50)

	let growY: number | null = null

	if (nextHeight > NOTE_SIZE) {
		growY = nextHeight - NOTE_SIZE
	} else {
		if (prevGrowY) {
			growY = 0
		}
	}

	if (
		growY !== null ||
		(shape.props.fontSizeAdjustment === 0
			? fontSizeAdjustment !== unadjustedFontSize
			: fontSizeAdjustment !== shape.props.fontSizeAdjustment)
	) {
		return {
			...shape,
			props: {
				...shape.props,
				growY: growY ?? 0,
				fontSizeAdjustment,
			},
		}
	}
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
				const isRTL = !!(translation.isRTL || isRightToLeftLanguage(shape.props.text))

				const offsetLength =
					NOTE_SIZE +
					ADJACENT_NOTE_MARGIN +
					// If we're growing down, we need to account for the current shape's growY
					(isCmdEnter && !e.shiftKey ? shape.props.growY : 0)

				const adjacentCenter = new Vec(
					isTab ? (e.shiftKey != isRTL ? -1 : 1) : 0,
					isCmdEnter ? (e.shiftKey ? -1 : 1) : 0
				)
					.mul(offsetLength)
					.add(CENTER_OFFSET)
					.rot(pageRotation)
					.add(pageTransform.point())

				const newNote = getNoteShapeForAdjacentPosition(editor, shape, adjacentCenter, pageRotation)

				if (newNote) {
					startEditingNoteShape(editor, newNote)
				}
			}
		},
		[id, editor, translation.isRTL]
	)
}

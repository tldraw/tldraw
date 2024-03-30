import {
	ANIMATION_MEDIUM_MS,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLNoteShape,
	TLOnEditEndHandler,
	TLShape,
	TLShapeId,
	Vec,
	createShapeId,
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

const NOTE_SIZE = 200
const NEW_NOTE_MARGIN = 20

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override canEdit = () => true
	override doesAutoEditOnKeyStroke = () => true
	override hideResizeHandles = () => true
	override hideSelectionBoundsFg = () => true

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
		const adjustedColor = color === 'black' ? 'yellow' : color
		const noteHeight = this.getHeight(shape)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const rotation = useValue('shape rotation', () => this.editor.getShape(id)?.rotation ?? 0, [
			this.editor,
		])

		// Shadow stuff
		const oy = Math.cos(rotation)
		const ox = Math.sin(rotation)
		const random = rng(id)
		const randomizedRotation = random() * 4
		const shadowBlur = 20 + random() * 2
		const shadowWidth = NOTE_SIZE - shadowBlur * 2 //(3 + Math.abs(ox))
		const heightRatio = noteHeight / NOTE_SIZE

		return (
			<>
				<div
					className="tl-note"
					style={{
						width: NOTE_SIZE,
						height: noteHeight,
					}}
				>
					<div
						className="tl-note__container"
						style={{
							color: theme[adjustedColor].solid,
						}}
					>
						<div
							className="tl-note__shadow"
							style={{
								height: noteHeight,
								boxShadow: `${ox * shadowBlur}px ${oy * 0.75 * shadowBlur}px ${shadowBlur}px rgba(0,0,0,.72), ${ox * shadowBlur}px ${oy * 0.75 * shadowBlur}px ${shadowBlur * 2}px ${shadowBlur / 2}px rgba(0,0,0,.55)`,
								transform: `scaleX(${shadowWidth / NOTE_SIZE}) translateY(${-shadowBlur}px) perspective(${noteHeight / heightRatio}px) rotateX(${shadowBlur}deg) rotateY(${ox * -2}deg) rotateZ(${randomizedRotation + -ox}deg) `,
							}}
						/>
						<div className="tl-note__body" />
						<div className="tl-note__scrim" />
					</div>
					<TextLabel
						id={id}
						type={type}
						font={font}
						fontSize={fontSizeAdjustment || LABEL_FONT_SIZES[size]}
						lineHeight={TEXT_PROPS.lineHeight}
						align={align}
						verticalAlign={verticalAlign}
						text={text}
						labelColor="black"
						wrap
						onKeyDown={handleKeyDown}
					/>
				</div>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</>
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
	const BORDER = 1
	const PADDING = 16 + BORDER
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

				const isRTL = !!(isRightToLeftLanguage(shape.props.text) || translation.isRTL)

				// Get the center of a default sized note at the current note's page position
				const centerInPageSpace = editor
					.getShapeParentTransform(id)
					.applyToPoint(new Vec(shape.x, shape.y))

				const pageRotation = editor.getShapePageTransform(id).rotation()

				// Based on the inputs, calculate the offset to the next note
				// tab controls x axis (shift inverts direction set by RTL)
				// cmd enter is the y axis (shift inverts direction)
				const offset = new Vec(
					isTab ? (e.shiftKey != isRTL ? -1 : 1) : 0,
					isCmdEnter ? (e.shiftKey ? -1 : 1) : 0
				).mul(NOTE_SIZE + NEW_NOTE_MARGIN)

				// If we're placing below, then we need to add th growY, too
				if (isCmdEnter && !e.shiftKey) {
					offset.y += shape.props.growY
				}

				// Rotate the offset to match the current note's page rotation, and
				// ddd the offset to the center to get the center of the next note
				const point = centerInPageSpace.add(offset.rot(pageRotation))

				// There might already be a note in that position! If there is, we'll
				// select the next note and switch focus to it. If there's not, then
				// we'll create a new note in that position.

				let nextNote: TLShape | undefined

				// Check the center of where a new note would be
				const pointToCheck = Vec.Add(point, new Vec(NOTE_SIZE / 2, NOTE_SIZE / 2).rot(pageRotation))

				// Start from the top of the stack, and work our way down
				const allShapesOnPage = editor.getCurrentPageShapesSorted()

				for (let i = allShapesOnPage.length - 1; i >= 0; i--) {
					const otherNote = allShapesOnPage[i]
					if (otherNote.type === 'note') {
						if (otherNote.id === id) continue
						if (editor.isPointInShape(otherNote, pointToCheck)) {
							nextNote = otherNote
							break
						}
					}
				}

				editor.complete()
				editor.mark()

				// If we didn't find any in that position, then create a new one
				if (!nextNote) {
					const id = createShapeId()
					editor
						.createShape({
							id,
							type: 'note',
							x: point.x,
							y: point.y,
							rotation: shape.rotation,
						})
						.select(id)
					nextNote = editor.getShape(id)!
				}

				// Finish this sticky and start editing the next one
				editor.select(nextNote)
				editor.setEditingShape(nextNote)
				editor.setCurrentTool('select.editing_shape', {
					target: 'shape',
					shape: nextNote,
				})

				// Select any text that's in the newly selected sticky
				;(document.getElementById(`text-input-${nextNote.id}`) as HTMLTextAreaElement)?.select()

				// Animate to the next sticky if it would be off screen
				const selectionPageBounds = editor.getSelectionPageBounds()
				const viewportPageBounds = editor.getViewportPageBounds()
				if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
					editor.centerOnPoint(selectionPageBounds.center, {
						duration: ANIMATION_MEDIUM_MS,
					})
				}
			}
		},
		[id, editor, translation.isRTL]
	)
}

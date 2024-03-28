import {
	ANIMATION_MEDIUM_MS,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLNoteShape,
	TLOnEditEndHandler,
	TLShapeId,
	Vec,
	getDefaultColorTheme,
	noteShapeMigrations,
	noteShapeProps,
	rng,
	toDomPrecision,
} from '@tldraw/editor'
import { useCurrentTranslation } from '../../ui/hooks/useTranslation/useTranslation'
import { isRightToLeftLanguage } from '../../utils/text/text'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { createSticky } from './toolStates/Pointing'

const NOTE_SIZE = 200

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

	getGeometry(shape: TLNoteShape) {
		const height = getNoteHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true, isLabel: true })
	}

	component(shape: TLNoteShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const translation = useCurrentTranslation()
		const {
			id,
			type,
			props: { color, font, size, align, text, verticalAlign, fontSizeAdjustment },
		} = shape

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const adjustedColor = color === 'black' ? 'yellow' : color
		const notesCount = getExtraNoteCount(shape)

		const noteHeight = getNoteHeight(shape)
		const shadowHeight = Math.max(getNoteHeight(shape) * 0.618, 200)
		const ratio = noteHeight / shadowHeight
		const random = rng(shape.id)
		const noteRotation = random() * 4

		return (
			<>
				<div
					className="tl-note"
					style={{
						position: 'relative',
						color: theme[adjustedColor].solid,
					}}
				>
					<div
						className="tl-note__shadow"
						style={{
							height: shadowHeight,
							transform: `perspective(300px) rotateZ(${noteRotation}deg) rotateX(30deg) translateY(${-Math.abs(noteRotation)}px) scaleX(${0.85}) scaleY(${ratio})`,
						}}
					/>

					{Array.from(Array(1 + notesCount)).map((_, i) => {
						return (
							<div
								className="tl-note__container"
								key={`${shape.id}-note-${i}`}
								style={{
									left: i > 0 ? random() * 5 : 0,
									width: NOTE_SIZE,
									height: NOTE_SIZE,
									transform: i > 0 ? `rotate(${random() * 2}deg)` : 'none',
									marginTop: getOffsetForPosition(shape, i),
									backgroundColor: theme[adjustedColor].solid,
								}}
							>
								<div className="tl-note__scrim" />
							</div>
						)
					})}
					<TextLabel
						id={id}
						type={type}
						font={font}
						fontSize={fontSizeAdjustment || LABEL_FONT_SIZES[size]}
						lineHeight={TEXT_PROPS.lineHeight}
						align={align}
						verticalAlign={shape.props.growY > 0 ? 'start' : verticalAlign}
						text={text}
						labelColor="black"
						padding={getPadding(shape)}
						wrap
						onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
							this.handleKeyDown(e, id, translation.isRTL)
						}
					/>
				</div>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</>
		)
	}

	private handleKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
		id: TLShapeId,
		isUiRTL: boolean | undefined
	) => {
		const shape = this.editor.getShape<TLNoteShape>(id)!
		const isCmdOrCtrlEnter = (e.metaKey || e.ctrlKey) && e.key === 'Enter'
		if (isCmdOrCtrlEnter || e.key === 'Tab') {
			this.editor.complete()

			// Create a new sticky
			const size = NOTE_SIZE
			const MARGIN = 10
			let offset = new Vec(shape.x, shape.y)
			if (isCmdOrCtrlEnter) {
				const vertDirection = e.shiftKey ? -1 : 1
				offset = Vec.Add(
					offset,
					new Vec(size / 2, vertDirection === 1 ? size * 1.5 + MARGIN : (-1 * size) / 2 - MARGIN)
				)
			} else {
				// This is a XOR gate: e.shiftKey != isRightToLeftLanguage(shape.props.text)
				const isRTL = !!(isRightToLeftLanguage(shape.props.text) || isUiRTL)
				const horzDirection = e.shiftKey != isRTL ? -1 : 1
				offset = Vec.Add(
					offset,
					new Vec(horzDirection === 1 ? size * 1.5 + MARGIN : (-1 * size) / 2 - MARGIN, size / 2)
				)
			}
			const newSticky = createSticky(this.editor, undefined, offset)

			// Go into edit mode on the new sticky
			this.editor.setEditingShape(newSticky.id)
			this.editor.setCurrentTool('select.editing_shape', {
				target: 'shape',
				shape: newSticky,
			})

			// Animate to the new sticky, if necessary.
			const selectionPageBounds = this.editor.getSelectionPageBounds()
			const viewportPageBounds = this.editor.getViewportPageBounds()
			if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
				this.editor.centerOnPoint(selectionPageBounds.center, {
					duration: ANIMATION_MEDIUM_MS,
				})
			}
		}
	}

	indicator(shape: TLNoteShape) {
		return (
			<rect
				rx="1"
				width={toDomPrecision(NOTE_SIZE)}
				height={toDomPrecision(getNoteHeight(shape))}
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

function getPadding(shape: TLNoteShape) {
	return (TEXT_PROPS.lineHeight * LABEL_FONT_SIZES[shape.props.size]) / 2 / 1.5
}

function getOffsetForPosition(shape: TLNoteShape, i: number) {
	return i === 0 ? 0 : i === 1 ? getPadding(shape) * -1 : getPadding(shape) * -2 + 2
}

function getGrowY(editor: Editor, shape: TLNoteShape, prevGrowY = 0) {
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
			maxWidth: NOTE_SIZE - getPadding(shape) * 2,
			disableOverflowWrapBreaking: true,
		})

		nextHeight = nextTextSize.h + getPadding(shape) * 2

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

function getExtraNoteCount(shape: TLNoteShape) {
	if (shape.props.growY > getPadding(shape)) {
		const noteCountIfUnstacked = Math.ceil(shape.props.growY / NOTE_SIZE)
		const totalOffsets = [...Array(noteCountIfUnstacked).keys()].reduce(
			(accumulator, currentValue) => accumulator + getOffsetForPosition(shape, currentValue),
			0
		)
		return Math.ceil((shape.props.growY - NOTE_SIZE - totalOffsets) / NOTE_SIZE) + 1
	}

	return 0
}

function getNoteHeight(shape: TLNoteShape) {
	if (shape.props.growY > getPadding(shape)) {
		const noteCount = getExtraNoteCount(shape) + 1
		return (
			noteCount * NOTE_SIZE -
			noteCount * getPadding(shape) * 2 +
			3 * getPadding(shape) +
			noteCount * 2 -
			4
		)
	} else {
		return NOTE_SIZE
	}
}

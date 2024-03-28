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

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
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

		const noteHeight = this.getHeight(shape)
		const random = rng(shape.id)
		const noteRotation = random() * 4

		return (
			<>
				<div
					style={{
						position: 'absolute',
						width: NOTE_SIZE,
						height: noteHeight,
					}}
				>
					<NoteShapeShadow height={noteHeight} rotation={noteRotation} />
					<div
						className="tl-note__container"
						style={{
							opacity: 1,
							color: theme[adjustedColor].solid,
							backgroundColor: theme[adjustedColor].solid,
						}}
					>
						<div className="tl-note__scrim" />
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
							onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) =>
								this.handleKeyDown(e, id, translation.isRTL)
							}
						/>
					</div>
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

function NoteShapeShadow({ height, rotation }: { height: number; rotation: number }) {
	const shadowHeight = Math.max(height * 0.618, 200)
	const ratio = height / shadowHeight
	return (
		<div
			className="tl-note__shadow"
			style={{
				height,
				transform: `perspective(300px) rotateZ(${rotation}deg) rotateX(30deg) translateY(${-Math.abs(rotation)}px) scaleX(${0.85}) scaleY(${ratio})`,
			}}
		/>
	)
}

import {
	ANIMATION_MEDIUM_MS,
	BaseBoxShapeUtil,
	DefaultColorStyle,
	DefaultFontFamilies,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultVerticalAlignStyle,
	Editor,
	Rectangle2d,
	SvgExportContext,
	T,
	TLNoteShape,
	TLOnEditEndHandler,
	TLShapeId,
	Vec,
	getDefaultColorTheme,
	noteShapeMigrations,
	toDomPrecision,
} from '@tldraw/editor'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { getTextLabelSvgElement } from '../shared/getTextLabelSvgElement'
import { createSticky } from './toolStates/Pointing'

export const INITIAL_NOTE_SIZE = 200

/** @public */
// @ts-ignore TODO hush, this is fine for now
export class NoteShapeUtil extends BaseBoxShapeUtil<TLNoteShape> {
	static override type = 'note' as const

	// TODO: overriding here for now so that size/align/verticalAlign can be optional
	static override props = {
		w: T.optional(T.nonZeroNumber),
		h: T.optional(T.nonZeroNumber),
		color: DefaultColorStyle,
		size: T.optional(DefaultSizeStyle),
		font: DefaultFontStyle,
		align: T.optional(DefaultHorizontalAlignStyle),
		verticalAlign: T.optional(DefaultVerticalAlignStyle),
		growY: T.positiveNumber,
		url: T.linkUrl,
		text: T.string,
	}
	static override migrations = noteShapeMigrations

	override canEdit = () => true
	override doesAutoEditOnKeyStroke = () => true
	override hideResizeHandles = () => true

	getDefaultProps(): TLNoteShape['props'] {
		// @ts-ignore TODO hush, this is fine for now
		return {
			w: INITIAL_NOTE_SIZE,
			h: INITIAL_NOTE_SIZE,
			color: 'black',
			size: 's',
			text: '',
			font: 'draw',
			align: 'start',
			verticalAlign: 'start',
			growY: 0,
			url: '',
		}
	}

	getSize(shape: TLNoteShape) {
		// TODO: This fallback is only for old notes as I experiment for now.
		return Math.max(
			INITIAL_NOTE_SIZE,
			((shape.props.w as number) || INITIAL_NOTE_SIZE) + shape.props.growY
		)
	}

	override getGeometry(shape: TLNoteShape) {
		const w = Math.max(1, this.getSize(shape) as number)
		return new Rectangle2d({ width: w, height: w, isFilled: true })
	}

	component(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { color, font, text },
		} = shape

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const adjustedColor = color === 'black' ? 'yellow' : color

		return (
			<>
				<div
					style={{
						position: 'absolute',
						width: this.getSize(shape),
						height: this.getSize(shape),
					}}
				>
					<div
						className="tl-sticky__container"
						style={{
							color: theme[adjustedColor].solid,
							backgroundColor: theme[adjustedColor].solid,
						}}
					>
						<div className="tl-note__scrim" />
						<TextLabel
							id={id}
							type={type}
							font={font}
							size="s"
							align="start"
							verticalAlign="start"
							text={text}
							labelColor="black"
							wrap
							onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => this.handleKeyDown(e, id)}
						/>
					</div>
				</div>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</>
		)
	}

	private handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: TLShapeId) => {
		const shape = this.editor.getShape<TLNoteShape>(id)!
		const isCmdOrCtrlEnter = (e.metaKey || e.ctrlKey) && e.key === 'Enter'
		if (isCmdOrCtrlEnter || e.key === 'Tab') {
			this.editor.complete()

			// Create a new sticky
			const size = this.getSize(shape)
			const offset = new Vec(shape.x + size * 1.5 + 10, shape.y + size / 2)
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
				width={toDomPrecision(this.getSize(shape) as number)}
				height={toDomPrecision(this.getSize(shape) as number)}
			/>
		)
	}

	override toSvg(shape: TLNoteShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFontDefForExport(shape.props.font))
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })
		const bounds = this.editor.getShapeGeometry(shape).bounds

		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const adjustedColor = shape.props.color === 'black' ? 'yellow' : shape.props.color

		const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect1.setAttribute('width', this.getSize(shape).toString())
		rect1.setAttribute('height', this.getSize(shape).toString())
		rect1.setAttribute('fill', theme[adjustedColor].solid)
		rect1.setAttribute('stroke', theme[adjustedColor].solid)
		rect1.setAttribute('stroke-width', '1')
		g.appendChild(rect1)

		const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect2.setAttribute('width', this.getSize(shape).toString())
		rect2.setAttribute('height', this.getSize(shape).toString())
		rect2.setAttribute('fill', theme.background)
		rect2.setAttribute('opacity', '.28')
		g.appendChild(rect2)

		const textElm = getTextLabelSvgElement({
			editor: this.editor,
			shape,
			font: DefaultFontFamilies[shape.props.font],
			bounds,
		})

		textElm.setAttribute('fill', theme.text)
		textElm.setAttribute('stroke', 'none')
		g.appendChild(textElm)

		return g
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

	let nextTextSize
	let iterations = 0

	// Auto-fit text to the right aspect-ratio.
	do {
		const textLen = shape.props.text.length
		// The formula is a power law of the text as it grows longer.
		// It then goes backwards a bit to make sure we don't get too big.
		const lineHeightPx = LABEL_FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight
		const closeEnoughSizeBasedOnTextLength = 16 * Math.pow(textLen, 0.5) - lineHeightPx
		const remainder = closeEnoughSizeBasedOnTextLength % lineHeightPx
		nextTextSize = editor.textMeasure.measureText(shape.props.text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: LABEL_FONT_SIZES[shape.props.size],
			minWidth: INITIAL_NOTE_SIZE.toString(),
			// We go in smaller chunks of 1/4 of the line height to make sure we don't miss the right size.
			maxWidth: Math.max(
				INITIAL_NOTE_SIZE - PADDING * 2,
				Math.floor(closeEnoughSizeBasedOnTextLength - remainder + (iterations * lineHeightPx) / 4)
			),
			aspectRatio: '1',
		})

		if (nextTextSize.h === nextTextSize.w) {
			break
		}
	} while (iterations++ < 50)

	const nextSize = nextTextSize.h + PADDING * 2

	let growY: number | null = null

	if (nextSize > INITIAL_NOTE_SIZE) {
		growY = nextSize - INITIAL_NOTE_SIZE
	} else {
		if (prevGrowY) {
			growY = 0
		}
	}

	if (growY !== null) {
		return {
			...shape,
			props: {
				...shape.props,
				growY,
			},
		}
	}
}

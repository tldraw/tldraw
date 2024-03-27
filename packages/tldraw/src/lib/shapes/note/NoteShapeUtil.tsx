import {
	DefaultFontFamilies,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLNoteShape,
	TLOnEditEndHandler,
	getDefaultColorTheme,
	noteShapeMigrations,
	noteShapeProps,
	rng,
	toDomPrecision,
} from '@tldraw/editor'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { getTextLabelSvgElement } from '../shared/getTextLabelSvgElement'

const NOTE_SIZE = 200

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override canEdit = () => true
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
			url: '',
		}
	}

	getGeometry(shape: TLNoteShape) {
		const height = getNoteHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true })
	}

	component(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text, verticalAlign },
		} = shape

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const adjustedColor = color === 'black' ? 'yellow' : color
		const notesCount = getExtraNoteCount(shape)
		const random = rng(shape.id)

		return (
			<>
				<div
					className="tl-note"
					style={{
						position: 'relative',
						color: theme[adjustedColor].solid,
					}}
				>
					{Array.from(Array(1 + notesCount)).map((_, i) => {
						return (
							<div
								className="tl-note__container"
								key={`${shape.id}-note-${i}`}
								style={{
									left: i > 0 ? random() * 5 : 0,
									width: NOTE_SIZE,
									height: NOTE_SIZE,
									// transform: i > 0 ? `rotate(${random() * 2}deg)` : 'none',
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
						size={size}
						align={align}
						verticalAlign={shape.props.growY > 0 ? 'start' : verticalAlign}
						text={text}
						labelColor="black"
						wrap
						padding={getPadding(shape)}
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
				rx="6"
				width={toDomPrecision(NOTE_SIZE)}
				height={toDomPrecision(getNoteHeight(shape))}
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
		rect1.setAttribute('rx', '10')
		rect1.setAttribute('width', NOTE_SIZE.toString())
		rect1.setAttribute('height', bounds.height.toString())
		rect1.setAttribute('fill', theme[adjustedColor].solid)
		rect1.setAttribute('stroke', theme[adjustedColor].solid)
		rect1.setAttribute('stroke-width', '1')
		g.appendChild(rect1)

		const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect2.setAttribute('rx', '10')
		rect2.setAttribute('width', NOTE_SIZE.toString())
		rect2.setAttribute('height', bounds.height.toString())
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

function getPadding(shape: TLNoteShape) {
	return (TEXT_PROPS.lineHeight * LABEL_FONT_SIZES[shape.props.size]) / 2 / 1.5
}

function getOffsetForPosition(shape: TLNoteShape, i: number) {
	return i === 0 ? 0 : i === 1 ? getPadding(shape) * -1 : getPadding(shape) * -2 + 2
}

function getGrowY(editor: Editor, shape: TLNoteShape, prevGrowY = 0) {
	const nextTextSize = editor.textMeasure.measureText(shape.props.text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		maxWidth: NOTE_SIZE - getPadding(shape) * 2,
	})

	const nextHeight = nextTextSize.h + getPadding(shape) * 2

	let growY: number | null = null

	if (nextHeight > NOTE_SIZE) {
		growY = nextHeight - NOTE_SIZE
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

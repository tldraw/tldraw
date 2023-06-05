import { Box2d, toDomPrecision, Vec2d } from '@tldraw/primitives'
import { noteShapeMigrations, noteShapePropsValidators, TLNoteShape } from '@tldraw/tlschema'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../../../constants'
import { getLegacyOffsetX } from '../../../utils/legacy'
import { Editor } from '../../Editor'
import { ShapeUtil, TLOnEditEndHandler } from '../ShapeUtil'
import { createTextSvgElementFromSpans } from '../shared/createTextSvgElementFromSpans'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { TextLabel } from '../shared/TextLabel'
import { TLExportColors } from '../shared/TLExportColors'

const NOTE_SIZE = 200

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note'
	override props = noteShapePropsValidators
	override migrations = noteShapeMigrations

	canEdit = () => true
	hideResizeHandles = () => true
	hideSelectionBoundsBg = () => true
	hideSelectionBoundsFg = () => true

	defaultProps(): TLNoteShape['props'] {
		return {
			color: 'black',
			size: 'm',
			text: '',
			font: 'draw',
			align: 'middle',
			growY: 0,
			url: '',
		}
	}

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getBounds(shape: TLNoteShape) {
		const height = this.getHeight(shape)
		return new Box2d(0, 0, NOTE_SIZE, height)
	}

	getOutline(shape: TLNoteShape) {
		return this.bounds(shape).corners
	}

	getCenter(_shape: TLNoteShape) {
		return new Vec2d(NOTE_SIZE / 2, this.getHeight(_shape) / 2)
	}

	render(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text },
		} = shape

		const adjustedColor = color === 'black' ? 'yellow' : color

		return (
			<>
				<div
					style={{
						position: 'absolute',
						width: NOTE_SIZE,
						height: this.getHeight(shape),
					}}
				>
					<div
						className="tl-note__container tl-hitarea-fill"
						style={{
							color: `var(--palette-${adjustedColor})`,
							backgroundColor: `var(--palette-${adjustedColor})`,
						}}
					>
						<div className="tl-note__scrim" />
						<TextLabel
							id={id}
							type={type}
							font={font}
							size={size}
							align={align}
							verticalAlign="middle"
							text={text}
							labelColor="inherit"
							wrap
						/>
					</div>
				</div>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.zoomLevel} />
				)}
			</>
		)
	}

	indicator(shape: TLNoteShape) {
		return (
			<rect
				rx="7"
				width={toDomPrecision(NOTE_SIZE)}
				height={toDomPrecision(this.getHeight(shape))}
			/>
		)
	}

	toSvg(shape: TLNoteShape, font: string, colors: TLExportColors) {
		const bounds = this.bounds(shape)

		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const adjustedColor = shape.props.color === 'black' ? 'yellow' : shape.props.color

		const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect1.setAttribute('rx', '10')
		rect1.setAttribute('width', NOTE_SIZE.toString())
		rect1.setAttribute('height', bounds.height.toString())
		rect1.setAttribute('fill', colors.fill[adjustedColor])
		rect1.setAttribute('stroke', colors.fill[adjustedColor])
		rect1.setAttribute('stroke-width', '1')
		g.appendChild(rect1)

		const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect2.setAttribute('rx', '10')
		rect2.setAttribute('width', NOTE_SIZE.toString())
		rect2.setAttribute('height', bounds.height.toString())
		rect2.setAttribute('fill', colors.background)
		rect2.setAttribute('opacity', '.28')
		g.appendChild(rect2)

		const PADDING = 17

		const opts = {
			fontSize: LABEL_FONT_SIZES[shape.props.size],
			fontFamily: font,
			textAlign: shape.props.align,
			verticalTextAlign: 'middle' as const,
			width: bounds.width - PADDING * 2,
			height: bounds.height - PADDING * 2,
			padding: 0,
			lineHeight: TEXT_PROPS.lineHeight,
			fontStyle: 'normal',
			fontWeight: 'normal',
			overflow: 'wrap' as const,
			offsetX: 0,
		}

		const spans = this.editor.textMeasure.measureTextSpans(shape.props.text, opts)

		opts.width = bounds.width
		const offsetX = getLegacyOffsetX(shape.props.align, PADDING, spans, bounds.width)
		if (offsetX) {
			opts.offsetX = offsetX
		}

		opts.padding = PADDING

		const textElm = createTextSvgElementFromSpans(this.editor, spans, opts)
		textElm.setAttribute('fill', colors.text)
		textElm.setAttribute('transform', `translate(0 ${PADDING})`)
		g.appendChild(textElm)

		return g
	}

	onBeforeCreate = (next: TLNoteShape) => {
		return getGrowY(this.editor, next, next.props.growY)
	}

	onBeforeUpdate = (prev: TLNoteShape, next: TLNoteShape) => {
		if (
			prev.props.text === next.props.text &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		return getGrowY(this.editor, next, prev.props.growY)
	}

	onEditEnd: TLOnEditEndHandler<TLNoteShape> = (shape) => {
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
	const PADDING = 17

	const nextTextSize = editor.textMeasure.measureText(shape.props.text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		width: NOTE_SIZE - PADDING * 2 + 'px',
	})

	const nextHeight = nextTextSize.h + PADDING * 2

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

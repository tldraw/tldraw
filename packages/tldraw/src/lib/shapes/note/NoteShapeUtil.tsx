import {
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLNoteShape,
	TLOnEditEndHandler,
	createShapeId,
	getDefaultColorTheme,
	noteShapeMigrations,
	noteShapeProps,
	toDomPrecision,
} from '@tldraw/editor'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'

export const NOTE_SIZE = 200
export const NOTE_GRID_OFFSET = 230
export type NoteHandleId =
	| 'note-button-up'
	| 'note-preview-up'
	| 'note-button-down'
	| 'note-preview-down'
	| 'note-button-left'
	| 'note-preview-left'
	| 'note-button-right'
	| 'note-preview-right'

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
			buttons: [
				{ x: 0.5, y: -0.1 },
				{ x: 1.1, y: 0.5 },
				{ x: 0.5, y: 1.1 },
				{ x: -0.1, y: 0.5 },
			],
			previews: [
				{ x: 0, y: -1.14 },
				{ x: 1.14, y: 0 },
				{ x: 0, y: 1.14 },
				{ x: -1.14, y: 0 },
			],
		}
	}

	override getHandles(shape: TLNoteShape): TLHandle[] {
		const { buttons, previews } = shape.props
		const directionArr = ['up', 'right', 'down', 'left']
		const buttonsArr = buttons.map((button, i) => ({
			id: 'note-button-' + directionArr[i],
			type: 'vertex',
			index: `${i}`,
			x: button.x * NOTE_SIZE,
			y: button.y * this.getHeight(shape),
			canSnap: true,
		}))
		const previewsArr = previews.map((preview, i) => ({
			id: 'note-preview-' + directionArr[i],
			type: 'note-create',
			index: `${i}`,
			x: preview.x * NOTE_SIZE,
			y: preview.y * NOTE_SIZE,
			canSnap: true,
		}))
		return [...previewsArr, ...buttonsArr] as TLHandle[]
	}

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
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
						className="tl-note__container"
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
							fontSize={LABEL_FONT_SIZES[size]}
							lineHeight={TEXT_PROPS.lineHeight}
							align={align}
							verticalAlign={verticalAlign}
							text={text}
							labelColor="black"
							wrap
						/>
					</div>
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
					fontSize={LABEL_FONT_SIZES[shape.props.size]}
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
	onHandlePointerDown = ({ shape, handleId }: { shape: TLNoteShape; handleId: NoteHandleId }) => {
		const getOffset = (handleId: NoteHandleId, shape: TLNoteShape) => {
			switch (handleId) {
				case 'note-button-right':
				case 'note-preview-right':
					return { x: shape.x + NOTE_GRID_OFFSET, y: shape.y }
				case 'note-button-left':
				case 'note-preview-left':
					return { x: shape.x - NOTE_GRID_OFFSET, y: shape.y }
				case 'note-button-up':
				case 'note-preview-up':
					return { x: shape.x, y: shape.y - NOTE_GRID_OFFSET }
				case 'note-button-down':
				case 'note-preview-down':
					return { x: shape.x, y: shape.y + NOTE_GRID_OFFSET }
				default:
					throw new Error('this should not happen')
			}
		}
		const offset = getOffset(handleId, shape)
		const id = createShapeId()
		this.editor.createShape({ id, type: 'note', x: offset.x, y: offset.y })
		this.editor.select(id)
	}
	override onDoubleClickHandle = (shape: TLNoteShape) => {
		return shape
	}
}

function getGrowY(editor: Editor, shape: TLNoteShape, prevGrowY = 0) {
	const PADDING = 17

	const nextTextSize = editor.textMeasure.measureText(shape.props.text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		maxWidth: NOTE_SIZE - PADDING * 2,
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

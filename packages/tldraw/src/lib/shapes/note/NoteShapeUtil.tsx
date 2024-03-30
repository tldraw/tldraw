import {
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLNoteShape,
	TLOnEditEndHandler,
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

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true })
	}

	component(shape: TLNoteShape, isCulled: boolean) {
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
						display: isCulled ? 'none' : undefined,
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
					<HyperlinkButton
						url={shape.props.url}
						zoomLevel={this.editor.getZoomLevel()}
						isCulled={isCulled}
					/>
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

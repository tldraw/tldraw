import {
	ANIMATION_MEDIUM_MS,
	DefaultFontFamilies,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLNoteShape,
	TLOnEditEndHandler,
	TLShapeId,
	VecLike,
	ZERO_INDEX_KEY,
	createShapeId,
	getDefaultColorTheme,
	noteShapeMigrations,
	noteShapeProps,
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
			buttons: [
				{ x: 0.5, y: -0.1 },
				{ x: 1.1, y: 0.5 },
				{ x: 0.5, y: 1.1 },
				{ x: -0.1, y: 0.5 },
			],
		}
	}

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true })
	}
	override getHandles(shape: TLNoteShape): TLHandle[] {
		const { buttons } = shape.props
		const directionArr = ['up', 'right', 'down', 'left']
		return buttons.map((button, i) => ({
			id: directionArr[i],
			type: 'vertex',
			index: ZERO_INDEX_KEY,
			x: button.x * NOTE_SIZE,
			y: button.y * this.getHeight(shape),
		}))
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
							size={size}
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
	onHandlePointerUp(info: { shape: TLNoteShape; handleId: 'up' | 'down' | 'left' | 'right' }) {
		this.duplicateShape(info.shape.id, info.handleId)
	}
	duplicateShape(shapeId: TLShapeId, direction: 'up' | 'down' | 'left' | 'right') {
		const shape = this.editor.getShape(shapeId) as TLNoteShape

		const rotationRadians = this.editor.getShapePageTransform(shape).rotation()
		const distance = NOTE_SIZE + 100

		// Calculate offsetX and offsetY based on the direction and rotation
		let offsetX = 0
		let offsetY = 0

		switch (direction) {
			case 'up':
				offsetX = distance * Math.sin(rotationRadians)
				offsetY = distance * -Math.cos(rotationRadians)
				break
			case 'down':
				offsetX = distance * -Math.sin(rotationRadians)
				offsetY = distance * Math.cos(rotationRadians)
				break
			case 'left':
				offsetX = distance * -Math.cos(rotationRadians)
				offsetY = distance * -Math.sin(rotationRadians)
				break
			case 'right':
				offsetX = distance * Math.cos(rotationRadians)
				offsetY = distance * Math.sin(rotationRadians)
				break
		}

		const newShapeId = createShapeId()
		const newShapeX = shape.x + offsetX
		const newShapeY = shape.y + offsetY
		const emptySpot = this.findPlaceForNewNoteShape({
			x: newShapeX + NOTE_SIZE / 2,
			y: newShapeY + NOTE_SIZE / 2,
		})
		this.editor.createShape({ type: 'note', id: newShapeId, x: emptySpot.x, y: emptySpot.y })
		this.editor.createShape({
			type: 'arrow',
			props: {
				start: {
					type: 'binding',
					boundShapeId: shapeId,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
				},
				end: {
					type: 'binding',
					boundShapeId: newShapeId,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: true,
				},
			},
		})
		this.editor.setEditingShape(newShapeId)
		// copied from editor.duplicateShapes
		const selectionPageBounds = this.editor.getSelectionPageBounds()
		const viewportPageBounds = this.editor.getViewportPageBounds()
		if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
			this.editor.centerOnPoint(selectionPageBounds.center, {
				duration: ANIMATION_MEDIUM_MS,
			})
		}
	}

	findPlaceForNewNoteShape(pos: VecLike): VecLike {
		console.log(this.editor.getShapeAtPoint(pos))
		if (!this.editor.getShapeAtPoint(pos)) {
			console.log('no shape at point')
			return { x: pos.x - NOTE_SIZE / 2, y: pos.y - NOTE_SIZE / 2 }
		} else {
			console.log('shape at point')
			return this.findPlaceForNewNoteShape({ x: pos.x + 50, y: pos.y + 50 })
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

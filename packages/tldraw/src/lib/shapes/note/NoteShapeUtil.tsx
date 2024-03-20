import {
	DefaultFontFamilies,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLNoteShape,
	TLOnEditEndHandler,
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

type NoteGridPositions = {
	up: VecLike[]
	down: VecLike[]
	left: VecLike[]
	right: VecLike[]
}

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
		this.duplicateShape(info.shape, info.handleId)
	}
	duplicateShape(shape: TLNoteShape, direction: 'up' | 'down' | 'left' | 'right') {
		const centerOffset = NOTE_SIZE / 2
		let count = 0
		let emptySpot = {} as VecLike
		const positions = this.positionsCached.get(shape.id)!
		while (count < positions[direction].length) {
			const position = positions[direction][count]
			/* A better version of this is to draw a box where you want the shape to go 
			and hit test for any shapes that may be inside the box, similar to the logic 
			in the select tool. For now, we're just checking a single point */
			const shapes = this.editor.getShapesAtPoint({
				x: position.x + centerOffset,
				y: position.y + centerOffset,
			})
			if (!shapes.length) {
				emptySpot = position
				break
			}
			count++
		}
		const newShapeId = createShapeId()
		const arrowId = createShapeId()
		this.editor.createShape({
			type: 'note',
			id: newShapeId,
			x: emptySpot.x,
			y: emptySpot.y,
			props: { color: shape.props.color, size: shape.props.size },
		})
		this.editor.createShape({
			type: 'arrow',
			id: arrowId,
			props: {
				color: shape.props.color,
				size: shape.props.size,
				start: {
					type: 'binding',
					boundShapeId: shape.id,
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
		this.editor.sendToBack([arrowId])
		this.editor.setEditingShape(shape.id)
	}

	override onDoubleClickHandle = (shape: TLNoteShape) => shape

	positionsCached = this.editor.store.createComputedCache<NoteGridPositions, TLNoteShape>(
		'note grid position infoCache',
		(shape) => generatePositionsForShape(shape, this.editor)
	)
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

function generatePositionsForShape(shape: TLNoteShape, editor: Editor) {
	// give the shape a bit of padding to make the arrows look better
	const distance = NOTE_SIZE + 100
	const positions = {
		up: [] as VecLike[],
		down: [] as VecLike[],
		left: [] as VecLike[],
		right: [] as VecLike[],
	}
	const LAYERS = 7

	const rotationRadians = editor.getShapePageTransform(shape).rotation()
	for (let layer = 1; layer <= LAYERS; layer++) {
		// Generate positions for up and down
		for (let dx = -layer; dx <= layer; dx++) {
			addPositionWithRotation(
				positions.up,
				shape,
				dx * distance,
				-layer * distance,
				rotationRadians
			)
			addPositionWithRotation(
				positions.down,
				shape,
				dx * distance,
				layer * distance,
				rotationRadians
			)
		}

		// Generate positions for left and right
		for (let dy = -layer; dy <= layer; dy++) {
			addPositionWithRotation(
				positions.left,
				shape,
				-layer * distance,
				dy * distance,
				rotationRadians
			)
			addPositionWithRotation(
				positions.right,
				shape,
				layer * distance,
				dy * distance,
				rotationRadians
			)
		}
	}

	function addPositionWithRotation(
		positionArray: VecLike[],
		shape: TLNoteShape,
		offsetX: number,
		offsetY: number,
		rotationRadians: number
	) {
		const cosR = Math.cos(rotationRadians)
		const sinR = Math.sin(rotationRadians)

		// Rotate offsetX and offsetY around (0, 0)
		const rotatedX = offsetX * cosR - offsetY * sinR
		const rotatedY = offsetX * sinR + offsetY * cosR

		// Translate the position back to the shape's location
		positionArray.push({ x: shape.x + rotatedX, y: shape.y + rotatedY })
	}

	// Function to calculate the Manhattan distance between two points
	const manhattanDistance = (a: VecLike, b: VecLike) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

	// Sort the positions in each direction based on their Manhattan distance to the shape's origin
	Object.keys(positions).forEach((direction) => {
		positions[direction as 'up' | 'down' | 'left' | 'right'].sort(
			(a: VecLike, b: VecLike) => manhattanDistance(a, shape) - manhattanDistance(b, shape)
		)
	})
	return positions
}

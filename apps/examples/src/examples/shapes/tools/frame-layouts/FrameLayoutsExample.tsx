import {
	BaseFrameLikeShapeUtil,
	Box,
	EASINGS,
	Editor,
	Geometry2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	T,
	TLComponents,
	TLDragShapesOutInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Tldraw,
	TldrawUiContextualToolbar,
	TldrawUiToolbarButton,
	createShapeId,
	track,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	BOARD_HEADER_HEIGHT,
	BOARD_LAYOUTS,
	BOARD_PADDING,
	BoardLayoutMode,
	arrangeBoard,
} from './BoardLayouts'
import {
	NOTE_CARD_SHAPE_TYPE,
	NoteCardShapeUtil,
	VIDEO_CARD_SHAPE_TYPE,
	VideoCardShapeUtil,
} from './MediaCardShapes'
import './frame-layouts.css'

// There's a guide at the bottom of this file!

const BOARD_SHAPE_TYPE = 'layout-board'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[BOARD_SHAPE_TYPE]: { w: number; h: number; name: string; layout: BoardLayoutMode }
	}
}

type BoardShape = TLShape<typeof BOARD_SHAPE_TYPE>

// [1]
class LayoutBoardShapeUtil extends BaseFrameLikeShapeUtil<BoardShape> {
	static override type = BOARD_SHAPE_TYPE
	static override props: RecordProps<BoardShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		name: T.string,
		layout: T.literalEnum('free', 'row', 'column', 'grid', 'spotlight'),
	}

	override getDefaultProps(): BoardShape['props'] {
		return { w: 320, h: 240, name: 'Board', layout: 'free' }
	}

	// [2]
	override canReceiveNewChildrenOfType(shape: BoardShape, type: TLShape['type']) {
		if (shape.isLocked) return false
		return type === VIDEO_CARD_SHAPE_TYPE || type === NOTE_CARD_SHAPE_TYPE
	}

	// [3]
	override canResize(shape: BoardShape) {
		return shape.props.layout === 'free'
	}

	override hideResizeHandles(shape: BoardShape) {
		return shape.props.layout !== 'free'
	}

	override canResizeChildren() {
		return false
	}

	// [4]
	override getGeometry(shape: BoardShape): Geometry2d {
		return new Group2d({
			children: [
				new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false }),
				new Rectangle2d({
					width: shape.props.w,
					height: BOARD_HEADER_HEIGHT,
					isFilled: true,
					isLabel: true,
				}),
			],
		})
	}

	// [5]
	override onChildrenChange(shape: BoardShape) {
		if (this.editor.isIn('select.translating')) return
		return getBoardLayoutChanges(this.editor, shape)
	}

	// [6]
	override onDropShapesOver(shape: BoardShape) {
		animateBoardLayout(this.editor, shape.id)
	}

	override onDragShapesOut(shape: BoardShape, shapes: TLShape[], info: TLDragShapesOutInfo) {
		super.onDragShapesOut(shape, shapes, info)
		animateBoardLayout(this.editor, shape.id)
	}

	override component(shape: BoardShape) {
		return <BoardComponent shape={shape} />
	}

	override getText(shape: BoardShape) {
		return shape.props.name
	}

	override getIndicatorPath(shape: BoardShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const EPSILON = 0.01

// [7]
function getBoardLayoutChanges(editor: Editor, board: BoardShape): TLShapePartial[] {
	const children = editor
		.getSortedChildIdsForParent(board.id)
		.map((id) => editor.getShape(id))
		.filter((child): child is TLShape => !!child)
		.map((child) => ({ child, size: editor.getShapeGeometry(child).bounds }))

	const byId = new Map(children.map((entry) => [entry.child.id, entry]))
	const originX = BOARD_PADDING
	const originY = BOARD_HEADER_HEIGHT + BOARD_PADDING

	const result = arrangeBoard(
		board.props.layout,
		children.map(({ child, size }) => ({
			id: child.id,
			x: child.x - originX,
			y: child.y - originY,
			w: size.width,
			h: size.height,
		}))
	)
	if (!result) return []

	const changes: TLShapePartial[] = []

	for (const box of result.boxes) {
		const { child, size } = byId.get(box.id)!
		const x = originX + box.x
		const y = originY + box.y
		const moved = Math.abs(child.x - x) > EPSILON || Math.abs(child.y - y) > EPSILON
		const resized =
			Math.abs(size.width - box.w) > EPSILON || Math.abs(size.height - box.h) > EPSILON
		if (!moved && !resized) continue
		changes.push({
			id: child.id,
			type: child.type,
			x,
			y,
			...(resized && { props: { w: box.w, h: box.h } }),
		} as TLShapePartial)
	}

	if (
		Math.abs(board.props.w - result.w) > EPSILON ||
		Math.abs(board.props.h - result.h) > EPSILON
	) {
		changes.push({ id: board.id, type: board.type, props: { w: result.w, h: result.h } })
	}

	return changes
}

function applyBoardLayout(editor: Editor, boardId: TLShapeId) {
	const board = editor.getShape<BoardShape>(boardId)
	if (board) editor.updateShapes(getBoardLayoutChanges(editor, board))
}

function animateBoardLayout(editor: Editor, boardId: TLShapeId) {
	const board = editor.getShape<BoardShape>(boardId)
	if (!board) return
	editor.animateShapes(getBoardLayoutChanges(editor, board), {
		animation: { duration: 220, easing: EASINGS.easeInOutCubic },
	})
}

function BoardComponent({ shape }: { shape: BoardShape }) {
	const editor = useEditor()
	const count = useValue('card count', () => editor.getSortedChildIdsForParent(shape.id).length, [
		editor,
		shape.id,
	])
	return (
		<HTMLContainer className="layout-board" style={{ width: shape.props.w, height: shape.props.h }}>
			<div className="layout-board__header" style={{ height: BOARD_HEADER_HEIGHT }}>
				<span className="layout-board__name">{shape.props.name}</span>
				<span className="layout-board__badge">
					{BOARD_LAYOUTS[shape.props.layout].label} · {count}
				</span>
			</div>
		</HTMLContainer>
	)
}

// [8]
const BoardLayoutToolbar = track(function BoardLayoutToolbar() {
	const editor = useEditor()
	const board = useValue(
		'selected board',
		() => {
			if (!editor.isIn('select.idle')) return null
			const shape = editor.getOnlySelectedShape()
			return shape?.type === BOARD_SHAPE_TYPE ? (shape as BoardShape) : null
		},
		[editor]
	)

	if (!board) return null

	const setLayout = (layout: BoardLayoutMode) => {
		editor.markHistoryStoppingPoint('change board layout')
		editor.run(() => {
			editor.updateShape({ id: board.id, type: board.type, props: { layout } })
			animateBoardLayout(editor, board.id)
		})
		editor.getContainer().focus()
	}

	const getSelectionBounds = () => {
		const bounds = editor.getSelectionRotatedScreenBounds()
		return bounds ? new Box(bounds.x, bounds.y, bounds.width, 0) : undefined
	}

	return (
		<TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Board layout">
			{Object.entries(BOARD_LAYOUTS).map(([mode, { label }]) => (
				<TldrawUiToolbarButton
					key={mode}
					type="icon"
					title={label}
					isActive={board.props.layout === mode}
					onClick={() => setLayout(mode as BoardLayoutMode)}
				>
					{label}
				</TldrawUiToolbarButton>
			))}
		</TldrawUiContextualToolbar>
	)
})

const shapeUtils = [LayoutBoardShapeUtil, VideoCardShapeUtil, NoteCardShapeUtil]
const components: TLComponents = { InFrontOfTheCanvas: BoardLayoutToolbar }

// [9]
const video = (url = '/fluid.mp4') => ({ type: VIDEO_CARD_SHAPE_TYPE, props: { url } }) as const
const note = (text: string, color: string) =>
	({ type: NOTE_CARD_SHAPE_TYPE, props: { text, color } }) as const

const DEMO_BOARDS: Array<{
	name: string
	layout: BoardLayoutMode
	x: number
	y: number
	w?: number
	h?: number
	cards: Array<ReturnType<typeof video> | ReturnType<typeof note>>
}> = [
	{
		name: 'Video wall',
		layout: 'grid',
		x: 80,
		y: 100,
		cards: [video(), video('/bonk.webm'), video(), note('Pick a hero shot', '#ffd43b')],
	},
	{
		name: 'Up next',
		layout: 'column',
		x: 860,
		y: 100,
		cards: [video('/bonk.webm'), note('Intro cut', '#b2f2bb'), note('Color pass', '#ffc9c9')],
	},
	{
		name: 'Moodboard',
		layout: 'free',
		x: 1140,
		y: 100,
		w: 460,
		h: 340,
		cards: [video(), note('Loose vibes', '#eebefa')],
	},
	{
		name: 'Filmstrip',
		layout: 'row',
		x: 80,
		y: 560,
		cards: [video(), video('/bonk.webm'), note('End card', '#99e9f2')],
	},
	{
		name: 'Stage',
		layout: 'spotlight',
		x: 860,
		y: 560,
		cards: [video(), video('/bonk.webm'), video(), note('Now playing', '#ffd43b')],
	},
]

function createDemoContent(editor: Editor) {
	for (const { name, layout, cards, x, y, ...size } of DEMO_BOARDS) {
		const id = createShapeId(name)
		editor.createShape({ id, type: BOARD_SHAPE_TYPE, x, y, props: { name, layout, ...size } })
		// Cascaded from the top of the content area, so every layout's position sort agrees
		// with this order and a `free` board still looks hand-placed
		editor.createShapes(
			cards.map((card, i) => ({
				...card,
				parentId: id,
				x: BOARD_PADDING + i * 130,
				y: BOARD_HEADER_HEIGHT + BOARD_PADDING + i * 80,
			}))
		)
		applyBoardLayout(editor, id)
	}

	// A few loose cards, ready to be dragged onto a board
	editor.createShapes([
		{ ...video('/bonk.webm'), x: 80, y: 960 },
		{ ...note('Add captions', '#ffd43b'), x: 340, y: 940 },
		{ ...note('B-roll', '#b2f2bb'), x: 560, y: 1000 },
	])
	editor.zoomToFit()
}

export default function FrameLayoutsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return
					createDemoContent(editor)
				}}
			/>
		</div>
	)
}

/*
This example shows one frame-like container arranging the same children in different ways. A
board shape has a `layout` prop, and swapping it swaps the arrangement. The layouts themselves
are pure functions over boxes and live in `BoardLayouts.ts`; this file is the SDK integration.

[1]
BaseFrameLikeShapeUtil gives the board its frame behavior: clipping children, providing their
background, and reparenting shapes in and out as they're dragged over it.

[2]
canReceiveNewChildrenOfType gates what the board picks up. This one takes cards only, so
dragging a drawn shape over it does nothing.

[3]
Only `free` boards are resizable by hand. The arranging layouts size the board to fit their
content, so its handles are hidden.

[4]
An unfilled body plus a filled header. Clicks inside the body pass through to the cards the way
a frame's interior does, while the header stays clickable for selecting and moving the board.
The header rectangle needs `isLabel` for that: frame-like shapes ignore interior fills so that
brush selection works inside them.

[5]
onChildrenChange is the main trigger. It runs whenever a child is added, removed, deleted,
restored by undo, moved, or resized, and whatever it returns gets applied. Re-running the
layout produces no further changes once everything sits in its slot, so this settles in a pass
rather than looping. The one case to skip is an in-progress drag, where correcting positions
would fight the pointer.

[6]
Drags finish through the frame-like callbacks instead: onDropShapesOver when cards land on the
board, onDragShapesOut when one leaves and the rest close the gap. Both animate, and because
every shape here extends BaseBoxShapeUtil, animateShapes tweens size as well as position.

[7]
Turn a layout into store changes: a new position for each card that has drifted from its slot,
new `w`/`h` for cards the layout resized, and a new size for the board so it hugs its content.

[8]
A contextual toolbar for the selected board, built from the same BOARD_LAYOUTS record that
defines the modes.

[9]
Seed a board per mode plus a few loose cards. The cards start on a diagonal and applyBoardLayout
snaps them into place, which is the same path the board takes at runtime.
*/

import { Editor, Geometry2d, HTMLContainer, Rectangle2d, ShapeUtil, StateNode, T, TLShape } from 'tldraw'

// ─── TYPE AUGMENTATION ────────────────────────────────────────────────────────

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		'ttt-xbox': { w: number; h: number }
		'ttt-ocircle': { w: number; h: number }
		'ttt-board-line': { w: number; h: number }
	}
}

export type IXBoxShape = TLShape<'ttt-xbox'>
export type IOCircleShape = TLShape<'ttt-ocircle'>
export type IBoardLineShape = TLShape<'ttt-board-line'>

// ─── GRID CONSTANTS ───────────────────────────────────────────────────────────

export const CELL_SIZE = 120
export const PIECE_SIZE = 80
const PIECE_OFFSET = (CELL_SIZE - PIECE_SIZE) / 2 // 20

/** Top-left canvas position for a piece placed in the given cell. */
export function cellCorner(col: number, row: number) {
	return {
		x: col * CELL_SIZE + PIECE_OFFSET,
		y: row * CELL_SIZE + PIECE_OFFSET,
	}
}

/**
 * Derive the board cell (col, row) from a piece's top-left position.
 * Returns null if the position doesn't correspond to a valid cell.
 */
export function getShapeCell(shape: TLShape): { col: number; row: number } | null {
	const col = Math.round((shape.x - PIECE_OFFSET) / CELL_SIZE)
	const row = Math.round((shape.y - PIECE_OFFSET) / CELL_SIZE)
	if (col < 0 || col > 2 || row < 0 || row > 2) return null
	return { col, row }
}

/**
 * Derive the cell (col, row) from a raw page point.
 * Returns null if the point is outside the 3×3 board area.
 */
export function getPointCell(x: number, y: number): { col: number; row: number } | null {
	const col = Math.floor(x / CELL_SIZE)
	const row = Math.floor(y / CELL_SIZE)
	if (col < 0 || col > 2 || row < 0 || row > 2) return null
	return { col, row }
}

// ─── X-BOX SHAPE ─────────────────────────────────────────────────────────────

/** Renders an X mark. Only Player X may create this shape. */
export class XBoxShapeUtil extends ShapeUtil<IXBoxShape> {
	static override type = 'ttt-xbox' as const
	static override props = { w: T.number, h: T.number }

	getDefaultProps(): IXBoxShape['props'] {
		return { w: PIECE_SIZE, h: PIECE_SIZE }
	}

	override canResize() {
		return false
	}
	override canEdit() {
		return false
	}
	override canBind() {
		return false
	}
	override isAspectRatioLocked() {
		return true
	}

	getGeometry(shape: IXBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: IXBoxShape) {
		const { w, h } = shape.props
		const pad = 14
		return (
			<HTMLContainer>
				<svg
					width={w}
					height={h}
					viewBox={`0 0 ${w} ${h}`}
					style={{ overflow: 'visible', display: 'block' }}
				>
					<line
						x1={pad}
						y1={pad}
						x2={w - pad}
						y2={h - pad}
						stroke="#cc2200"
						strokeWidth={9}
						strokeLinecap="round"
					/>
					<line
						x1={w - pad}
						y1={pad}
						x2={pad}
						y2={h - pad}
						stroke="#cc2200"
						strokeWidth={9}
						strokeLinecap="round"
					/>
				</svg>
			</HTMLContainer>
		)
	}

	indicator(shape: IXBoxShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={4} />
	}
}

// ─── O-CIRCLE SHAPE ──────────────────────────────────────────────────────────

/** Renders an O mark. Only Player O may create this shape. */
export class OCircleShapeUtil extends ShapeUtil<IOCircleShape> {
	static override type = 'ttt-ocircle' as const
	static override props = { w: T.number, h: T.number }

	getDefaultProps(): IOCircleShape['props'] {
		return { w: PIECE_SIZE, h: PIECE_SIZE }
	}

	override canResize() {
		return false
	}
	override canEdit() {
		return false
	}
	override canBind() {
		return false
	}
	override isAspectRatioLocked() {
		return true
	}

	getGeometry(shape: IOCircleShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: IOCircleShape) {
		const { w, h } = shape.props
		const cx = w / 2
		const cy = h / 2
		const r = w / 2 - 13
		return (
			<HTMLContainer>
				<svg
					width={w}
					height={h}
					viewBox={`0 0 ${w} ${h}`}
					style={{ overflow: 'visible', display: 'block' }}
				>
					<circle cx={cx} cy={cy} r={r} fill="none" stroke="#0055cc" strokeWidth={9} />
				</svg>
			</HTMLContainer>
		)
	}

	indicator(shape: IOCircleShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={shape.props.w / 2} />
	}
}

// ─── BOARD LINE SHAPE ─────────────────────────────────────────────────────────

/**
 * One of the four lines that form the tic-tac-toe grid.
 * These are created programmatically during game setup and marked with
 * `meta.isBoard = true`. Permission rules prevent any player from
 * selecting, moving, or deleting them.
 */
export class BoardLineShapeUtil extends ShapeUtil<IBoardLineShape> {
	static override type = 'ttt-board-line' as const
	static override props = { w: T.number, h: T.number }

	getDefaultProps(): IBoardLineShape['props'] {
		return { w: 6, h: CELL_SIZE * 3 }
	}

	override canResize() {
		return false
	}
	override canEdit() {
		return false
	}
	override canBind() {
		return false
	}

	getGeometry(shape: IBoardLineShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: IBoardLineShape) {
		return (
			<HTMLContainer>
				<div
					style={{
						width: shape.props.w,
						height: shape.props.h,
						backgroundColor: '#333',
						borderRadius: 3,
					}}
				/>
			</HTMLContainer>
		)
	}

	indicator(shape: IBoardLineShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// ─── PLACEMENT TOOLS ─────────────────────────────────────────────────────────

/**
 * Tool for Player X: click a cell to place an X-Box shape.
 * Prevents placing on an already-occupied cell.
 */
export class XPlaceTool extends StateNode {
	static override id = 'x-place'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const pt = this.editor.inputs.getCurrentPagePoint()
		const cell = getPointCell(pt.x, pt.y)
		if (!cell) return
		if (isCellOccupied(this.editor, cell)) return

		const corner = cellCorner(cell.col, cell.row)
		this.editor.createShape({ type: 'ttt-xbox', x: corner.x, y: corner.y })
	}
}

/**
 * Tool for Player O: click a cell to place an O-Circle shape.
 * Prevents placing on an already-occupied cell.
 */
export class OPlaceTool extends StateNode {
	static override id = 'o-place'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const pt = this.editor.inputs.getCurrentPagePoint()
		const cell = getPointCell(pt.x, pt.y)
		if (!cell) return
		if (isCellOccupied(this.editor, cell)) return

		const corner = cellCorner(cell.col, cell.row)
		this.editor.createShape({ type: 'ttt-ocircle', x: corner.x, y: corner.y })
	}
}

/** Returns true if the given grid cell already contains a piece. */
function isCellOccupied(editor: Editor, cell: { col: number; row: number }): boolean {
	return editor.getCurrentPageShapes().some((s) => {
		const m = s.meta as Record<string, unknown>
		if (m?.isBoard) return false
		const c = getShapeCell(s)
		return c?.col === cell.col && c?.row === cell.row
	})
}

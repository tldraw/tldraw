import { useCallback } from 'react'
import { Geometry2d, HTMLContainer, Rectangle2d, ShapeUtil, T, TLShape, useEditor } from 'tldraw'

// ─── TYPE AUGMENTATION ────────────────────────────────────────────────────────

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		'chk-board': {}
		'chk-piece': { fill: 'red' | 'blue'; label: string }
	}
}

export type IChkBoardShape = TLShape<'chk-board'>
export type IChkPieceShape = TLShape<'chk-piece'>

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const CELL_SIZE = 80
export const PIECE_SIZE = 56
export const BOARD_SIZE = CELL_SIZE * 8 // 640
const PIECE_OFFSET = (CELL_SIZE - PIECE_SIZE) / 2 // 12

const LIGHT_SQUARE = '#f0d9b5'
const DARK_SQUARE = '#b58863'

/** Top-left canvas position for a piece at the given grid cell. */
export function pieceCorner(col: number, row: number) {
	return {
		x: col * CELL_SIZE + PIECE_OFFSET,
		y: row * CELL_SIZE + PIECE_OFFSET,
	}
}

// ─── BOARD SHAPE ──────────────────────────────────────────────────────────────

/**
 * Renders the full 8×8 board as an inline SVG.
 * `canSelect() = false` prevents players from accidentally selecting the board.
 * Permission rules also block selection and mutation at the data layer.
 */
export class ChkBoardShapeUtil extends ShapeUtil<IChkBoardShape> {
	static override type = 'chk-board' as const
	static override props = {}

	getDefaultProps(): IChkBoardShape['props'] {
		return {}
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

	getGeometry(): Geometry2d {
		return new Rectangle2d({ width: BOARD_SIZE, height: BOARD_SIZE, isFilled: true })
	}

	component(_shape: IChkBoardShape) {
		const cells: React.ReactElement[] = []
		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {
				const isDark = (col + row) % 2 === 1
				cells.push(
					<rect
						key={`${row}-${col}`}
						x={col * CELL_SIZE}
						y={row * CELL_SIZE}
						width={CELL_SIZE}
						height={CELL_SIZE}
						fill={isDark ? DARK_SQUARE : LIGHT_SQUARE}
					/>
				)
			}
		}
		return (
			<HTMLContainer>
				<svg
					width={BOARD_SIZE}
					height={BOARD_SIZE}
					viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
					style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
				>
					{cells}
				</svg>
			</HTMLContainer>
		)
	}

	indicator(_shape: IChkBoardShape) {
		return <rect width={BOARD_SIZE} height={BOARD_SIZE} />
	}
}

// ─── PIECE SHAPE ──────────────────────────────────────────────────────────────

/**
 * Extracted function component so React hooks are called in a function
 * component, satisfying the rules-of-hooks lint rule.
 */
function ChkPieceComponent({ shape }: { shape: IChkPieceShape }) {
	const editor = useEditor()
	const isEditing = editor.getEditingShapeId() === shape.id
	const fillColor = shape.props.fill === 'red' ? '#cc2200' : '#0055cc'

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			editor.updateShape<IChkPieceShape>({
				id: shape.id,
				type: shape.type,
				props: { ...shape.props, label: e.target.value },
			})
			editor.setEditingShape(null)
		},
		[editor, shape]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				editor.updateShape<IChkPieceShape>({
					id: shape.id,
					type: shape.type,
					props: { ...shape.props, label: (e.target as HTMLInputElement).value },
				})
				editor.setEditingShape(null)
			} else if (e.key === 'Escape') {
				editor.setEditingShape(null)
			}
		},
		[editor, shape]
	)

	return (
		<HTMLContainer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<div
				style={{
					width: PIECE_SIZE,
					height: PIECE_SIZE,
					borderRadius: '50%',
					backgroundColor: fillColor,
					border: '3px solid rgba(255,255,255,0.4)',
					boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					position: 'relative',
					userSelect: 'none',
				}}
			>
				{isEditing ? (
					<input
						autoFocus
						defaultValue={shape.props.label}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						style={{
							width: '80%',
							textAlign: 'center',
							background: 'transparent',
							border: 'none',
							outline: 'none',
							color: 'white',
							fontWeight: 'bold',
							fontSize: 13,
						}}
					/>
				) : (
					<span
						style={{
							color: 'white',
							fontWeight: 'bold',
							fontSize: 13,
							pointerEvents: 'none',
						}}
					>
						{shape.props.label}
					</span>
				)}
			</div>
		</HTMLContainer>
	)
}

/**
 * A checkers piece: a colored circle with an optional label (e.g. "King").
 * Double-clicking your own piece (on your turn) opens an inline editor.
 * `canEdit() = true` enables tldraw's built-in double-click → editing state flow.
 */
export class ChkPieceShapeUtil extends ShapeUtil<IChkPieceShape> {
	static override type = 'chk-piece' as const
	static override props = {
		fill: T.literalEnum('red', 'blue'),
		label: T.string,
	}

	getDefaultProps(): IChkPieceShape['props'] {
		return { fill: 'red', label: '' }
	}

	override canResize() {
		return false
	}
	override canBind() {
		return false
	}
	override isAspectRatioLocked() {
		return true
	}
	override canEdit() {
		return true
	}

	getGeometry(): Geometry2d {
		return new Rectangle2d({ width: PIECE_SIZE, height: PIECE_SIZE, isFilled: true })
	}

	component(shape: IChkPieceShape) {
		return <ChkPieceComponent shape={shape} />
	}

	indicator(_shape: IChkPieceShape) {
		return <rect width={PIECE_SIZE} height={PIECE_SIZE} rx={PIECE_SIZE / 2} />
	}
}

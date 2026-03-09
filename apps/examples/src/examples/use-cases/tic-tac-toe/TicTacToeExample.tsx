/**
 * Tic-tac-toe: demonstrates TLPermissionsManager with declarative rules.
 *
 * X can only create xbox shapes, O only ocircle. Players can move/delete own
 * pieces but not resize or rotate them. Board lines are immutable.
 */

import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useMemo, useState } from 'react'
import {
	CORE_ACTIVITIES,
	DefaultToolbar,
	Editor,
	TLComponents,
	TLIdentityProvider,
	TLIdentityUser,
	TLPermissionRule,
	TLPermissionsManagerConfig,
	TLShape,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	getShapeCreatorId,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	BoardLineShapeUtil,
	CELL_SIZE,
	OCircleShapeUtil,
	OPlaceTool,
	XBoxShapeUtil,
	XPlaceTool,
	getShapeCell,
} from './shapes'

export const PLAYER_X_ID = 'player-x'
export const PLAYER_O_ID = 'player-o'

const PLAYER_USERS: Record<string, TLIdentityUser> = {
	[PLAYER_X_ID]: { id: PLAYER_X_ID, name: 'Player X', color: '#cc2200' },
	[PLAYER_O_ID]: { id: PLAYER_O_ID, name: 'Player O', color: '#0055cc' },
}

function createPlayerIdentity(userId: string): TLIdentityProvider {
	return {
		getCurrentUser: () => PLAYER_USERS[userId] ?? null,
		resolveUser: (id) => PLAYER_USERS[id] ?? null,
	}
}

const ticTacToeRules: Record<string, TLPermissionRule> = {
	[CORE_ACTIVITIES.CREATE_SHAPE]: ({ user, shapeType }) => {
		if (user.id === PLAYER_X_ID) return shapeType === 'ttt-xbox'
		if (user.id === PLAYER_O_ID) return shapeType === 'ttt-ocircle'
		return false
	},

	[CORE_ACTIVITIES.UPDATE_SHAPE]: ({ user, prevShape }) => {
		if (!prevShape) return false
		const meta = prevShape.meta as Record<string, unknown>
		if (meta?.isBoard) return false
		return getShapeCreatorId(prevShape) === user.id
	},

	// Granular update rules — these are checked AFTER update.shape passes,
	// and only revert the specific change type that was denied.
	[CORE_ACTIVITIES.ROTATE_SHAPE]: false,
	[CORE_ACTIVITIES.EDIT_SHAPE_PROPS]: false,

	[CORE_ACTIVITIES.DELETE_SHAPE]: ({ user, targetShape }) => {
		if (!targetShape) return false
		const meta = targetShape.meta as Record<string, unknown>
		if (meta?.isBoard) return false
		return getShapeCreatorId(targetShape) === user.id
	},

	[CORE_ACTIVITIES.SELECT_SHAPE]: ({ user, targetShape }) => {
		if (!targetShape) return false
		const meta = targetShape.meta as Record<string, unknown>
		if (meta?.isBoard) return false
		return getShapeCreatorId(targetShape) === user.id
	},
}

const WIN_LINES = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8], // rows
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8], // cols
	[0, 4, 8],
	[2, 4, 6], // diagonals
]

function checkWinner(shapes: TLShape[]): 'X' | 'O' | 'draw' | null {
	// Build a 3x3 grid indexed as [row * 3 + col]
	const grid: (string | null)[] = Array(9).fill(null)

	for (const shape of shapes) {
		const meta = shape.meta as Record<string, unknown>
		if (meta?.isBoard) continue
		const cell = getShapeCell(shape)
		if (!cell) continue
		const idx = cell.row * 3 + cell.col
		grid[idx] = shape.type === 'ttt-xbox' ? 'X' : 'O'
	}

	for (const [a, b, c] of WIN_LINES) {
		if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
			return grid[a] as 'X' | 'O'
		}
	}

	if (grid.every((cell) => cell !== null)) return 'draw'
	return null
}

const BOARD_SIZE = CELL_SIZE * 3 // 360
const LINE_THICKNESS = 6

function initBoard(editor: Editor, userId: string) {
	if (userId !== PLAYER_X_ID) return

	const hasBoard = editor.getCurrentPageShapes().some((s) => {
		const m = s.meta as Record<string, unknown>
		return m?.isBoard === true
	})
	if (hasBoard) return

	const halfThick = LINE_THICKNESS / 2

	editor.createShapes([
		// Vertical separator at x = 120
		{
			type: 'ttt-board-line',
			x: CELL_SIZE - halfThick,
			y: 0,
			props: { w: LINE_THICKNESS, h: BOARD_SIZE },
			meta: { isBoard: true },
		},
		// Vertical separator at x = 240
		{
			type: 'ttt-board-line',
			x: CELL_SIZE * 2 - halfThick,
			y: 0,
			props: { w: LINE_THICKNESS, h: BOARD_SIZE },
			meta: { isBoard: true },
		},
		// Horizontal separator at y = 120
		{
			type: 'ttt-board-line',
			x: 0,
			y: CELL_SIZE - halfThick,
			props: { w: BOARD_SIZE, h: LINE_THICKNESS },
			meta: { isBoard: true },
		},
		// Horizontal separator at y = 240
		{
			type: 'ttt-board-line',
			x: 0,
			y: CELL_SIZE * 2 - halfThick,
			props: { w: BOARD_SIZE, h: LINE_THICKNESS },
			meta: { isBoard: true },
		},
	])

	// Frame the camera on the board with some padding
	editor.zoomToBounds(
		{ x: -50, y: -50, w: BOARD_SIZE + 100, h: BOARD_SIZE + 100 },
		{ animation: { duration: 0 } }
	)
}

const CUSTOM_SHAPE_UTILS = [XBoxShapeUtil, OCircleShapeUtil, BoardLineShapeUtil]

const X_TOOLS = [XPlaceTool]
const O_TOOLS = [OPlaceTool]

function makeToolbarComponents(playerToolId: string): TLComponents {
	return {
		Toolbar: (props) => {
			const tools = useTools()
			const isPlayerToolSelected = useIsToolSelected(tools[playerToolId])
			const isHandSelected = useIsToolSelected(tools['hand'])
			const isSelectSelected = useIsToolSelected(tools['select'])
			return (
				// Only show the three tools this player is allowed to use.
				// All other shape/draw tools are intentionally hidden.
				<DefaultToolbar {...props}>
					{/* Select tool: needed to move/delete own pieces */}
					<TldrawUiMenuItem {...tools['select']} isSelected={isSelectSelected} />
					{/* Hand tool: for panning */}
					<TldrawUiMenuItem {...tools['hand']} isSelected={isHandSelected} />
					{/* Player-specific placement tool */}
					{tools[playerToolId] && (
						<TldrawUiMenuItem {...tools[playerToolId]} isSelected={isPlayerToolSelected} />
					)}
				</DefaultToolbar>
			)
		},
	}
}

function makeUiOverrides(playerId: string, playerToolId: string): TLUiOverrides {
	const isX = playerId === PLAYER_X_ID
	return {
		tools(editor, tools) {
			// Register the player-specific placement tool in the UI system.
			// Icons 'color' is used as a placeholder; a real implementation
			// would provide custom SVG icons for X and O.
			tools[playerToolId] = {
				id: playerToolId,
				icon: 'color',
				label: isX ? 'Place X' : 'Place O',
				kbd: isX ? 'x' : 'o',
				onSelect: () => {
					editor.setCurrentTool(playerToolId)
				},
			}
			return tools
		},
	}
}

const X_COMPONENTS = makeToolbarComponents('x-place')
const O_COMPONENTS = makeToolbarComponents('o-place')
const X_OVERRIDES = makeUiOverrides(PLAYER_X_ID, 'x-place')
const O_OVERRIDES = makeUiOverrides(PLAYER_O_ID, 'o-place')

interface PlayerPanelProps {
	label: string
	userId: typeof PLAYER_X_ID | typeof PLAYER_O_ID
	store: ReturnType<typeof useSyncDemo>
	tools: typeof X_TOOLS | typeof O_TOOLS
	toolId: string
	uiOverrides: TLUiOverrides
	components: TLComponents
	onShapesChange(shapes: TLShape[]): void
}

function PlayerPanel({
	label,
	userId,
	store,
	tools,
	toolId,
	uiOverrides,
	components,
	onShapesChange,
}: PlayerPanelProps) {
	const identity = useMemo(() => createPlayerIdentity(userId), [userId])

	const permissionsConfig = useMemo(
		(): TLPermissionsManagerConfig => ({ identity, rules: ticTacToeRules }),
		[identity]
	)

	const handleMount = useCallback(
		(editor: Editor) => {
			initBoard(editor, userId)

			// Stamp ownership (simulates PR #8147's tlmeta auto-stamping)
			const user = identity.getCurrentUser()!
			const cleanupAttribution = editor.sideEffects.registerBeforeCreateHandler(
				'shape',
				(shape, source) => {
					if (source !== 'user') return shape
					return { ...shape, meta: { ...shape.meta, createdBy: { id: user.id, name: user.name } } }
				}
			)

			editor.setCurrentTool(toolId)

			const cleanupListener = editor.store.listen(
				() => onShapesChange(editor.getCurrentPageShapes()),
				{ scope: 'document' }
			)

			return () => {
				cleanupAttribution()
				cleanupListener()
			}
		},
		[userId, toolId, onShapesChange, identity]
	)

	const isX = userId === PLAYER_X_ID
	const headerBg = isX ? '#fff0f0' : '#f0f0ff'
	const headerColor = isX ? '#cc2200' : '#0055cc'

	return (
		<div
			style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd' }}
		>
			<div
				style={{
					padding: '8px 12px',
					background: headerBg,
					color: headerColor,
					fontWeight: 700,
					fontSize: 14,
					borderBottom: '1px solid #ddd',
					userSelect: 'none',
				}}
			>
				{label}
			</div>
			<div style={{ flex: 1, position: 'relative' }}>
				<Tldraw
					store={store}
					shapeUtils={CUSTOM_SHAPE_UTILS}
					tools={tools}
					overrides={uiOverrides}
					components={components}
					onMount={handleMount}
					permissions={permissionsConfig}
					// Restrict to a single page (tic-tac-toe doesn't need multiple pages)
					options={{ maxPages: 1 }}
				/>
			</div>
		</div>
	)
}

export default function TicTacToeExample() {
	// A unique room per page load ensures a fresh game each time.
	const roomId = useMemo(() => `ttt-perms-${Math.random().toString(36).slice(2, 8)}`, [])

	const playerXInfo = useMemo(() => ({ id: PLAYER_X_ID, name: 'Player X', color: '#cc2200' }), [])
	const playerOInfo = useMemo(() => ({ id: PLAYER_O_ID, name: 'Player O', color: '#0055cc' }), [])

	// Both editors connect to the same multiplayer room so their canvases stay in sync.
	const storeX = useSyncDemo({ roomId, shapeUtils: CUSTOM_SHAPE_UTILS, userInfo: playerXInfo })
	const storeO = useSyncDemo({ roomId, shapeUtils: CUSTOM_SHAPE_UTILS, userInfo: playerOInfo })

	const [shapes, setShapes] = useState<TLShape[]>([])
	const winner = checkWinner(shapes)

	const xPieces = shapes.filter((s) => s.type === 'ttt-xbox').length
	const oPieces = shapes.filter((s) => s.type === 'ttt-ocircle').length
	const turn = xPieces <= oPieces ? 'X' : 'O'

	return (
		<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
			{/* Status bar */}
			<div
				style={{
					padding: '6px 16px',
					background: '#f8f8f8',
					borderBottom: '1px solid #ddd',
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					fontSize: 13,
				}}
			>
				{winner ? (
					<strong
						style={{ color: winner === 'draw' ? '#666' : winner === 'X' ? '#cc2200' : '#0055cc' }}
					>
						{winner === 'draw' ? "It's a draw!" : `Player ${winner} wins! 🎉`}
					</strong>
				) : (
					<>
						<span>Turn:</span>
						<strong style={{ color: turn === 'X' ? '#cc2200' : '#0055cc' }}>Player {turn}</strong>
					</>
				)}
				<span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
					Room: {roomId} &mdash; permissions demo
				</span>
			</div>

			{/* Two-player split view */}
			<div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
				<PlayerPanel
					label="Player X — can only place ✕ pieces"
					userId={PLAYER_X_ID}
					store={storeX}
					tools={X_TOOLS}
					toolId="x-place"
					uiOverrides={X_OVERRIDES}
					components={X_COMPONENTS}
					onShapesChange={setShapes}
				/>
				<PlayerPanel
					label="Player O — can only place ○ pieces"
					userId={PLAYER_O_ID}
					store={storeO}
					tools={O_TOOLS}
					toolId="o-place"
					uiOverrides={O_OVERRIDES}
					components={O_COMPONENTS}
					onShapesChange={setShapes}
				/>
			</div>
		</div>
	)
}

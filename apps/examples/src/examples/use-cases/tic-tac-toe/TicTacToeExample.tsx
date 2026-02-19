/**
 * Tic-Tac-Toe: Permissions Spike
 *
 * This example demonstrates a proposal for per-user, per-shape permissions in
 * the tldraw SDK, using a two-player tic-tac-toe game as a concrete test case.
 *
 * Permission rules enforced:
 *   • X can only create `ttt-xbox` shapes; O can only create `ttt-ocircle` shapes.
 *   • Players can move or delete their own pieces, but cannot edit them otherwise.
 *   • Players cannot select, move, or delete the board (4 `ttt-board-line` shapes).
 *   • Players cannot interact with the opponent's pieces at all.
 *
 * Architecture:
 *   • TLPermissionsPlugin installs store side-effects that act as an enforcement
 *     layer (analogous to server-side validation in a sync architecture).
 *   • The plugin is set up AFTER board initialization so the board lines are
 *     created before any permission rules are active.
 *   • Both panels share a multiplayer room via useSyncDemo so changes made by one
 *     player are immediately visible to the other.
 */

import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
	DefaultToolbar,
	Editor,
	TLComponents,
	TLShape,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

import { TLPermissionRules, TLPermissionsPlugin } from './TLPermissionsPlugin'
import {
	BoardLineShapeUtil,
	CELL_SIZE,
	OCircleShapeUtil,
	OPlaceTool,
	XBoxShapeUtil,
	XPlaceTool,
	getShapeCell,
} from './shapes'

// ─── PLAYER CONSTANTS ─────────────────────────────────────────────────────────

export const PLAYER_X_ID = 'player-x'
export const PLAYER_O_ID = 'player-o'

// ─── PERMISSION RULES ─────────────────────────────────────────────────────────

/**
 * The full set of permission rules for the tic-tac-toe game.
 * This object is passed to TLPermissionsPlugin for each player's editor.
 *
 * Note: rules are evaluated per-user, per-action, per-shape, making it easy
 * to encode arbitrary business logic (e.g. "players can move but not resize").
 */
const ticTacToeRules: TLPermissionRules = {
	canCreateShape(userId, shapeType) {
		if (userId === PLAYER_X_ID) return shapeType === 'ttt-xbox'
		if (userId === PLAYER_O_ID) return shapeType === 'ttt-ocircle'
		return false
	},

	canUpdateShape(userId, prev, next) {
		const meta = prev.meta as Record<string, unknown>
		// Board lines are immutable
		if (meta?.isBoard) return false
		// Can only update own pieces
		if (meta?.owner !== userId) return false
		// Only position changes (move) are allowed — not resize, rotate, or prop edits
		const rotationChanged = next.rotation !== prev.rotation
		const propsChanged = JSON.stringify(next.props) !== JSON.stringify(prev.props)
		const lockedChanged = next.isLocked !== prev.isLocked
		if (rotationChanged || propsChanged || lockedChanged) return false
		return true
	},

	canDeleteShape(userId, shape) {
		const meta = shape.meta as Record<string, unknown>
		if (meta?.isBoard) return false
		return meta?.owner === userId
	},

	canSelectShape(userId, shape) {
		const meta = shape.meta as Record<string, unknown>
		if (meta?.isBoard) return false
		return meta?.owner === userId
	},
}

// ─── WIN DETECTION ────────────────────────────────────────────────────────────

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
	// Build a 3×3 grid indexed as [row * 3 + col]
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

// ─── BOARD INITIALIZATION ─────────────────────────────────────────────────────

const BOARD_SIZE = CELL_SIZE * 3 // 360
const LINE_THICKNESS = 6

/**
 * Creates the four board lines in the editor.
 *
 * This is called BEFORE TLPermissionsPlugin is set up, so no permission rules
 * are active yet and the board shapes are created freely. Once the plugin is
 * installed, subsequent user actions are permission-checked.
 *
 * Only Player X creates the board (as the "host"). Player O receives the board
 * shapes via sync (source='remote'), which bypasses permission enforcement.
 */
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

// ─── CUSTOM SHAPE UTILS & TOOLS ───────────────────────────────────────────────

const CUSTOM_SHAPE_UTILS = [XBoxShapeUtil, OCircleShapeUtil, BoardLineShapeUtil]

const X_TOOLS = [XPlaceTool]
const O_TOOLS = [OPlaceTool]

// ─── PER-PLAYER UI ────────────────────────────────────────────────────────────

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

// ─── PLAYER PANEL ─────────────────────────────────────────────────────────────

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
	const pluginRef = useRef<TLPermissionsPlugin | null>(null)

	const handleMount = useCallback(
		(editor: Editor) => {
			// ① Create board shapes BEFORE installing the permissions plugin.
			//    This ensures board creation is not subject to permission checks.
			initBoard(editor, userId)

			// ② Install the permissions plugin.
			pluginRef.current = new TLPermissionsPlugin(editor, {
				userId,
				rules: ticTacToeRules,
			})

			// ③ Activate the player's placement tool.
			editor.setCurrentTool(toolId)

			// ④ Keep game state updated whenever shapes change.
			const cleanup = editor.store.listen(
				() => {
					onShapesChange(editor.getCurrentPageShapes())
				},
				{ scope: 'document' }
			)

			return () => {
				pluginRef.current?.cleanup()
				cleanup()
			}
		},
		[userId, toolId, onShapesChange]
	)

	const isX = userId === PLAYER_X_ID
	const headerBg = isX ? '#fff0f0' : '#f0f0ff'
	const headerColor = isX ? '#cc2200' : '#0055cc'

	return (
		<div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd' }}>
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
					// Restrict to a single page (tic-tac-toe doesn't need multiple pages)
					options={{ maxPages: 1 }}
				/>
			</div>
		</div>
	)
}

// ─── MAIN EXAMPLE ─────────────────────────────────────────────────────────────

export default function TicTacToeExample() {
	// A unique room per page load ensures a fresh game each time.
	const roomId = useMemo(() => `ttt-perms-spike-${Math.random().toString(36).slice(2, 8)}`, [])

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
					<strong style={{ color: winner === 'draw' ? '#666' : winner === 'X' ? '#cc2200' : '#0055cc' }}>
						{winner === 'draw' ? "It's a draw!" : `Player ${winner} wins! 🎉`}
					</strong>
				) : (
					<>
						<span>Turn:</span>
						<strong style={{ color: turn === 'X' ? '#cc2200' : '#0055cc' }}>Player {turn}</strong>
					</>
				)}
				<span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
					Room: {roomId} &mdash; permissions spike demo
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

/*
 * ─── HOW THE PERMISSIONS SPIKE WORKS ─────────────────────────────────────────
 *
 * TLPermissionsPlugin installs four store side-effect handlers:
 *
 *  1. beforeCreate  → tags every new shape with `meta.owner = userId`
 *  2. afterCreate   → deletes shapes the user was not allowed to create
 *                     (spike workaround; production would reject in beforeCreate)
 *  3. beforeChange  → reverts shape updates that violate the rules
 *  4. beforeDelete  → blocks deletions of forbidden shapes (returns `false`)
 *  5. beforeChange  → filters `instance.selectedShapeIds` to remove unselectable
 *                     shapes before the selection is committed to the store
 *
 * Server-side enforcement:
 *   In production the same TLPermissionRules object would be evaluated inside
 *   the sync worker's record-change handler. Because the sync server is the
 *   authoritative source of truth, any client that bypasses the client-side
 *   checks (e.g. via the browser console) would still have its changes rejected.
 *
 * UI enforcement:
 *   The plugin exposes `canCreateShape`, `canDeleteShape`, and `canSelectShape`
 *   helper methods so React components can conditionally render or disable UI
 *   elements (tool buttons, context menu items, etc.) for the current user.
 *
 * Try these interactions to test the rules:
 *   • Player X's toolbar only shows the X placement tool.  Try switching to a
 *     geo or draw tool — any shapes you create will be immediately deleted.
 *   • Click another player's piece with the Select tool — it will not select.
 *   • Try to delete a board line — it will not delete.
 *   • Move one of your own pieces with the Select tool — allowed.
 *   • Try to resize a piece — resize handles will snap back (prop change blocked).
 *
 * ─── KNOWN LIMITATION: startup sync errors ────────────────────────────────────
 *
 * On initial load you may see a handful of console errors from TLSyncClient:
 *   "Received push_result but there are no pending push requests"
 *   "Received push_result for a push request that is not at the front of the queue"
 *
 * These are a known side-effect of running two sync clients in the same tab
 * (storeX and storeO) sharing the same room simultaneously. The errors are
 * caught inside TLSyncClient.rebase() and handled via resetConnection(), so
 * the connection recovers automatically within a second or two. Gameplay is
 * unaffected. This is not a bug in the permissions plugin.
 *
 * The root cause is a timing race between the initial presence push (sent by
 * TLSyncClient right after connect) and the board-shapes push (triggered by
 * initBoard in onMount), combined with the 1-FPS throttle that applies when
 * no other users are detected yet. Production implementations would use a
 * single sync client per session and would not exhibit this behavior.
 */

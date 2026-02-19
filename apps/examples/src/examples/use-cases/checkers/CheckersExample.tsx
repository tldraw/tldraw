/**
 * Checkers: Permissions Spike
 *
 * Demonstrates ownership + turn-based permissions using TLPermissionsPlugin.
 *
 * Permission rules enforced:
 *   • Players can only move or delete their own pieces.
 *   • Players can only act on their turn.
 *   • The board is completely immutable — no player can select, move, or delete it.
 *   • Double-clicking your own piece (on your turn) opens an inline label editor
 *     for king promotion.
 *
 * Architecture:
 *   • `checkersRules` is stable across renders (created once with useMemo).
 *     It reads `turnRef.current` at call time, so it always sees the latest turn
 *     without needing to be recreated when the turn changes.
 *   • Board + pieces are created BEFORE the plugin is installed, so initialization
 *     bypasses permission checks.
 *   • Both panels share a multiplayer room via useSyncDemo.
 */

import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
	DefaultToolbar,
	Editor,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

import { TLPermissionRules, TLPermissionsPlugin } from '../tic-tac-toe/TLPermissionsPlugin'
import { BOARD_SIZE, ChkBoardShapeUtil, ChkPieceShapeUtil, pieceCorner } from './shapes'

// ─── PLAYER CONSTANTS ─────────────────────────────────────────────────────────

export const PLAYER_RED_ID = 'player-red'
export const PLAYER_BLUE_ID = 'player-blue'

// ─── CUSTOM SHAPES ────────────────────────────────────────────────────────────

const CUSTOM_SHAPE_UTILS = [ChkBoardShapeUtil, ChkPieceShapeUtil]

// ─── BOARD INITIALIZATION ─────────────────────────────────────────────────────

/**
 * Creates the board and all 24 pieces.
 * Called BEFORE the permissions plugin is set up so the shapes bypass
 * permission checks. Only PLAYER_RED creates the board (as "host");
 * PLAYER_BLUE receives the shapes via sync (source='remote').
 *
 * Pieces occupy dark squares: cells where (col + row) is odd.
 *   Red:  rows 0–2 (top of board)
 *   Blue: rows 5–7 (bottom of board)
 */
function initBoard(editor: Editor, userId: string) {
	if (userId !== PLAYER_RED_ID) return

	const hasBoard = editor.getCurrentPageShapes().some((s) => {
		const m = s.meta as Record<string, unknown>
		return m?.isBoard === true
	})
	if (hasBoard) return

	// Create the board background
	editor.createShapes([
		{
			type: 'chk-board',
			x: 0,
			y: 0,
			meta: { isBoard: true, owner: 'none' },
		},
	])

	// Create red pieces (rows 0–2, dark squares)
	const redPieces = []
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 8; col++) {
			if ((col + row) % 2 !== 1) continue
			const pos = pieceCorner(col, row)
			redPieces.push({
				type: 'chk-piece' as const,
				x: pos.x,
				y: pos.y,
				props: { fill: 'red' as const, label: '' },
				meta: { owner: PLAYER_RED_ID },
			})
		}
	}

	// Create blue pieces (rows 5–7, dark squares)
	const bluePieces = []
	for (let row = 5; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
			if ((col + row) % 2 !== 1) continue
			const pos = pieceCorner(col, row)
			bluePieces.push({
				type: 'chk-piece' as const,
				x: pos.x,
				y: pos.y,
				props: { fill: 'blue' as const, label: '' },
				meta: { owner: PLAYER_BLUE_ID },
			})
		}
	}

	editor.createShapes([...redPieces, ...bluePieces])

	// Frame the camera on the board
	editor.zoomToBounds(
		{ x: -40, y: -40, w: BOARD_SIZE + 80, h: BOARD_SIZE + 80 },
		{ animation: { duration: 0 } }
	)
}

// ─── TOOLBAR ──────────────────────────────────────────────────────────────────

/**
 * Restrict the toolbar to select + hand only.
 * Players move pieces with the select tool; no creation tools are needed.
 */
const CHECKERS_COMPONENTS: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelectSelected = useIsToolSelected(tools['select'])
		const isHandSelected = useIsToolSelected(tools['hand'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['select']} isSelected={isSelectSelected} />
				<TldrawUiMenuItem {...tools['hand']} isSelected={isHandSelected} />
			</DefaultToolbar>
		)
	},
}

const CHECKERS_OVERRIDES: TLUiOverrides = {
	tools(_editor, tools) {
		return tools
	},
}

// ─── PLAYER PANEL ─────────────────────────────────────────────────────────────

interface PlayerPanelProps {
	label: string
	userId: typeof PLAYER_RED_ID | typeof PLAYER_BLUE_ID
	store: ReturnType<typeof useSyncDemo>
	turnRef: React.RefObject<'red' | 'blue'>
}

function PlayerPanel({ label, userId, store, turnRef }: PlayerPanelProps) {
	const pluginRef = useRef<TLPermissionsPlugin | null>(null)

	// Permission rules are stable across renders. They read `turnRef.current`
	// at call time, so they always see the latest turn value.
	const checkersRules = useMemo(
		(): TLPermissionRules => ({
			canCreateShape: () => false,

			canUpdateShape(ruleUserId, prev, next) {
				const meta = prev.meta as Record<string, unknown>
				if (meta?.isBoard) return false
				if ((meta?.owner as string) !== ruleUserId) return false
				if (turnRef.current !== ruleUserId.replace('player-', '')) return false
				// Block rotation changes; allow position + label changes
				if (next.rotation !== prev.rotation) return false
				return true
			},

			canDeleteShape(ruleUserId, shape) {
				const meta = shape.meta as Record<string, unknown>
				if (meta?.isBoard) return false
				if ((meta?.owner as string) !== ruleUserId) return false
				return turnRef.current === ruleUserId.replace('player-', '')
			},

			canSelectShape(ruleUserId, shape) {
				const meta = shape.meta as Record<string, unknown>
				if (meta?.isBoard) return false
				if ((meta?.owner as string) !== ruleUserId) return false
				return turnRef.current === ruleUserId.replace('player-', '')
			},

			canUseTool(_ruleUserId, toolId) {
				// Only select and hand are needed — block draw, eraser, laser, etc.
				return toolId === 'select' || toolId === 'hand'
			},
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[] // stable — reads turnRef.current at call time
	)

	const handleMount = useCallback(
		(editor: Editor) => {
			// ① Create board + pieces BEFORE installing the permissions plugin.
			initBoard(editor, userId)

			// ② Install the permissions plugin.
			pluginRef.current = new TLPermissionsPlugin(editor, {
				userId,
				rules: checkersRules,
			})

			// ③ Activate the select tool (pieces are moved by dragging).
			editor.setCurrentTool('select')

			return () => {
				pluginRef.current?.cleanup()
			}
		},
		[userId, checkersRules]
	)

	const isRed = userId === PLAYER_RED_ID
	const headerBg = isRed ? '#fff0f0' : '#f0f0ff'
	const headerColor = isRed ? '#cc2200' : '#0055cc'

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
					overrides={CHECKERS_OVERRIDES}
					components={CHECKERS_COMPONENTS}
					onMount={handleMount}
					options={{ maxPages: 1 }}
				/>
			</div>
		</div>
	)
}

// ─── MAIN EXAMPLE ─────────────────────────────────────────────────────────────

export default function CheckersExample() {
	const roomId = useMemo(
		() => `chk-perms-spike-${Math.random().toString(36).slice(2, 8)}`,
		[]
	)

	const playerRedInfo = useMemo(
		() => ({ id: PLAYER_RED_ID, name: 'Player Red', color: '#cc2200' }),
		[]
	)
	const playerBlueInfo = useMemo(
		() => ({ id: PLAYER_BLUE_ID, name: 'Player Blue', color: '#0055cc' }),
		[]
	)

	const storeRed = useSyncDemo({ roomId, shapeUtils: CUSTOM_SHAPE_UTILS, userInfo: playerRedInfo })
	const storeBlue = useSyncDemo({
		roomId,
		shapeUtils: CUSTOM_SHAPE_UTILS,
		userInfo: playerBlueInfo,
	})

	const [turn, setTurn] = useState<'red' | 'blue'>('red')
	// Keep a ref in sync so that permission rules (created with useMemo) always
	// read the current turn value without needing to be recreated.
	const turnRef = useRef(turn)
	turnRef.current = turn

	const redColor = '#cc2200'
	const blueColor = '#0055cc'
	const turnColor = turn === 'red' ? redColor : blueColor

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
				<span>Turn:</span>
				<strong style={{ color: turnColor }}>
					Player {turn.charAt(0).toUpperCase() + turn.slice(1)}
				</strong>
				<button
					onClick={() => setTurn((t) => (t === 'red' ? 'blue' : 'red'))}
					style={{
						padding: '3px 10px',
						fontSize: 12,
						cursor: 'pointer',
						borderRadius: 4,
						border: '1px solid #ccc',
						background: 'white',
					}}
				>
					End turn
				</button>
				<span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
					Room: {roomId} &mdash; permissions spike demo
				</span>
			</div>

			{/* Two-player split view */}
			<div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
				<PlayerPanel
					label="Player Red — move red pieces on your turn; double-click to crown a king"
					userId={PLAYER_RED_ID}
					store={storeRed}
					turnRef={turnRef}
				/>
				<PlayerPanel
					label="Player Blue — move blue pieces on your turn; double-click to crown a king"
					userId={PLAYER_BLUE_ID}
					store={storeBlue}
					turnRef={turnRef}
				/>
			</div>
		</div>
	)
}

/*
 * ─── HOW TURN-BASED PERMISSIONS WORK ─────────────────────────────────────────
 *
 * The `checkersRules` object is created once with `useMemo(()=>..., [])`. It
 * captures `turnRef` (not `turn`) so it is stable across renders but always
 * reads the latest turn via `turnRef.current`.
 *
 * This pattern avoids the need to recreate and reinstall the permissions plugin
 * every time the turn changes, while still correctly enforcing turn-based rules.
 *
 * King promotion (label editing):
 *   • `canEdit() = true` on ChkPieceShapeUtil enables tldraw's built-in
 *     double-click → editing state flow.
 *   • The component renders an <input autoFocus> overlay when
 *     `editor.getEditingShapeId() === shape.id`.
 *   • On blur or Enter, the label prop is updated via `editor.updateShape`.
 *   • `canUpdateShape` allows prop changes (only rotation is blocked), so
 *     label updates on your own pieces on your turn are permitted.
 *
 * ─── KNOWN LIMITATION: startup sync errors ────────────────────────────────────
 *
 * See TicTacToeExample.tsx for the explanation of the "push_result" console
 * errors that appear on initial load with two sync clients in the same tab.
 */

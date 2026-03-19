/**
 * Checkers: demonstrates ownership + turn-based permissions.
 *
 * Uses onBeforeAction for turn enforcement and onAfterAction for user feedback
 * (toast on denied actions). Board is immutable; players can only move own pieces.
 */

import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	CORE_ACTIVITIES,
	DefaultToolbar,
	Editor,
	TLComponents,
	TLPermissionRule,
	TLPermissionsManagerConfig,
	TLUser,
	TLUserId,
	TLUserStore,
	Tldraw,
	TldrawUiMenuItem,
	UserRecordType,
	createUserId,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { BOARD_SIZE, ChkBoardShapeUtil, ChkPieceShapeUtil, pieceCorner } from './shapes'

export const PLAYER_RED_ID = createUserId('player-red')
export const PLAYER_BLUE_ID = createUserId('player-blue')

const PLAYER_USERS: Record<TLUserId, TLUser> = {
	[PLAYER_RED_ID]: UserRecordType.create({
		id: PLAYER_RED_ID,
		name: 'Player Red',
		color: '#cc2200',
	}),
	[PLAYER_BLUE_ID]: UserRecordType.create({
		id: PLAYER_BLUE_ID,
		name: 'Player Blue',
		color: '#0055cc',
	}),
}

const USER_ID_TO_FILL: Record<TLUserId, string> = {
	[PLAYER_RED_ID]: 'red',
	[PLAYER_BLUE_ID]: 'blue',
}

function createPlayerUserStore(userId: TLUserId): TLUserStore {
	return {
		getCurrentUser: () => PLAYER_USERS[userId] ?? null,
		resolve: (id) => {
			for (const u of Object.values(PLAYER_USERS)) {
				if (u.id === id) return u
			}
			return null
		},
	}
}

const CUSTOM_SHAPE_UTILS = [ChkBoardShapeUtil, ChkPieceShapeUtil]

function initBoard(editor: Editor, userId: TLUserId) {
	if (userId !== PLAYER_RED_ID) return

	const hasBoard = editor.getCurrentPageShapes().some((s) => {
		const m = s.meta as Record<string, unknown>
		return m?.isBoard === true
	})
	if (hasBoard) return

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
			})
		}
	}

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
			})
		}
	}

	editor.createShapes([
		{ type: 'chk-board', x: 0, y: 0, meta: { isBoard: true } },
		...redPieces,
		...bluePieces,
	])

	editor.zoomToBounds(
		{ x: -40, y: -40, w: BOARD_SIZE + 80, h: BOARD_SIZE + 80 },
		{ animation: { duration: 0 } }
	)
}

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

interface PlayerPanelProps {
	label: string
	userId: TLUserId
	store: ReturnType<typeof useSyncDemo>
	turnRef: React.RefObject<TLUserId>
}

function PlayerPanel({ label, userId, store, turnRef }: PlayerPanelProps) {
	const [toast, setToast] = useState<string | null>(null)

	useEffect(() => {
		if (!toast) return
		const timer = setTimeout(() => setToast(null), 1500)
		return () => clearTimeout(timer)
	}, [toast])

	const checkersRules = useMemo(
		(): Record<string, TLPermissionRule> => ({
			[CORE_ACTIVITIES.UPDATE_SHAPE]: ({ user, prevShape }) => {
				if (!prevShape) return false
				const meta = prevShape.meta as Record<string, unknown>
				if (meta?.isBoard) return false
				const props = prevShape.props as Record<string, unknown>
				return props?.fill === USER_ID_TO_FILL[user.id as TLUserId]
			},

			[CORE_ACTIVITIES.ROTATE_SHAPE]: false,

			[CORE_ACTIVITIES.DELETE_SHAPE]: ({ user, targetShape }) => {
				if (!targetShape) return false
				const meta = targetShape.meta as Record<string, unknown>
				if (meta?.isBoard) return false
				const props = targetShape.props as Record<string, unknown>
				return props?.fill === USER_ID_TO_FILL[user.id as TLUserId]
			},

			[CORE_ACTIVITIES.SELECT_SHAPE]: ({ user, targetShape }) => {
				if (!targetShape) return false
				const meta = targetShape.meta as Record<string, unknown>
				if (meta?.isBoard) return false
				const props = targetShape.props as Record<string, unknown>
				return props?.fill === USER_ID_TO_FILL[user.id as TLUserId]
			},

			[CORE_ACTIVITIES.USE_TOOL]: ({ toolId }) => {
				return toolId === 'select' || toolId === 'hand'
			},
		}),
		[]
	)

	const permissionsConfig = useMemo(
		(): TLPermissionsManagerConfig => ({ rules: checkersRules }),
		[checkersRules]
	)

	const handleMount = useCallback(
		(editor: Editor) => {
			initBoard(editor, userId)

			const mgr = editor.permissions
			if (!mgr) return

			const cleanupBefore = mgr.onBeforeAction(({ user, activityId }) => {
				if (
					activityId === CORE_ACTIVITIES.UPDATE_SHAPE ||
					activityId === CORE_ACTIVITIES.DELETE_SHAPE ||
					activityId === CORE_ACTIVITIES.SELECT_SHAPE
				) {
					return turnRef.current === user.id
				}
				return true
			})

			let pendingToast: string | null = null
			let toastRafId: number | null = null
			const cleanupAfter = mgr.onAfterAction(({ user, activityId }, allowed) => {
				if (allowed) return
				if (activityId === CORE_ACTIVITIES.SELECT_SHAPE) {
					pendingToast = turnRef.current !== user.id ? 'Not your turn!' : 'Not your piece!'
					if (toastRafId === null) {
						toastRafId = requestAnimationFrame(() => {
							toastRafId = null
							if (pendingToast) {
								setToast(pendingToast)
								pendingToast = null
							}
						})
					}
				}
			})

			editor.setCurrentTool('select')

			return () => {
				cleanupBefore()
				cleanupAfter()
			}
		},
		[userId, turnRef]
	)

	const isRed = userId === PLAYER_RED_ID
	const headerBg = isRed ? '#fff0f0' : '#f0f0ff'
	const headerColor = isRed ? '#cc2200' : '#0055cc'

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
					components={CHECKERS_COMPONENTS}
					onMount={handleMount}
					permissions={permissionsConfig}
					options={{ maxPages: 1 }}
				/>
				{toast && (
					<div
						style={{
							position: 'absolute',
							bottom: 64,
							left: '50%',
							transform: 'translateX(-50%)',
							background: '#333',
							color: 'white',
							padding: '6px 16px',
							borderRadius: 6,
							fontSize: 13,
							fontWeight: 600,
							pointerEvents: 'none',
							zIndex: 1000,
							whiteSpace: 'nowrap',
							boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
						}}
					>
						{toast}
					</div>
				)}
			</div>
		</div>
	)
}

export default function CheckersExample() {
	const roomId = useMemo(() => `chk-perms-${Math.random().toString(36).slice(2, 8)}`, [])

	const userStoreRed = useMemo(() => createPlayerUserStore(PLAYER_RED_ID), [])
	const userStoreBlue = useMemo(() => createPlayerUserStore(PLAYER_BLUE_ID), [])

	const storeRed = useSyncDemo({ roomId, shapeUtils: CUSTOM_SHAPE_UTILS, users: userStoreRed })
	const storeBlue = useSyncDemo({
		roomId,
		shapeUtils: CUSTOM_SHAPE_UTILS,
		users: userStoreBlue,
	})

	const [turn, setTurn] = useState<TLUserId>(PLAYER_RED_ID)
	const turnRef = useRef(turn)
	turnRef.current = turn

	const redColor = '#cc2200'
	const blueColor = '#0055cc'
	const turnColor = turn === PLAYER_RED_ID ? redColor : blueColor

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
				<strong style={{ color: turnColor }}>{PLAYER_USERS[turn]?.name ?? 'Unknown'}</strong>
				<button
					onClick={() => setTurn((t) => (t === PLAYER_RED_ID ? PLAYER_BLUE_ID : PLAYER_RED_ID))}
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
					Room: {roomId} &mdash; permissions demo
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

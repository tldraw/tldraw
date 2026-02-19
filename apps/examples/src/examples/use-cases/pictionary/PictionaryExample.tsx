/**
 * Pictionary: Permissions Spike
 *
 * Demonstrates role-based permissions and per-viewer shape rendering.
 *
 * Permission rules enforced:
 *   • Only the drawer may create, update, or delete shapes.
 *   • The guesser has zero permissions — any edits are immediately reverted.
 *   • The word card is immutable during a round (even the drawer cannot edit it
 *     through normal user actions); the host updates it via mergeRemoteChanges.
 *
 * Per-viewer rendering:
 *   • The word card returns `null` for the guesser, making it fully invisible.
 *     This is achieved by reading PictionaryCtx inside PictWordCardShapeUtil.component.
 *
 * Architecture:
 *   • Two panels / two sync stores — same pattern as tic-tac-toe.
 *     Three stores in the same browser tab can cause one client to get stuck
 *     in a sync reset loop and never reach status='synced' (see bottom comment).
 *   • `rules` in each PlayerPanel reads `drawerIdRef.current` at call time,
 *     so it always enforces the current drawer's role without plugin reinstall.
 *   • Word card updates between rounds use `mergeRemoteChanges` to bypass
 *     the user-facing permission checks (the source is set to 'remote').
 */

import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	DefaultToolbar,
	Editor,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

import { TLPermissionRules, TLPermissionsPlugin } from '../tic-tac-toe/TLPermissionsPlugin'
import { PictWordCardShapeUtil, PictionaryCtx } from './shapes'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const PLAYERS = ['player-1', 'player-2'] as const
export type PlayerId = (typeof PLAYERS)[number]

const WORDS = [
	// Animals
	'elephant',
	'penguin',
	'giraffe',
	'octopus',
	'flamingo',
	// Objects
	'lighthouse',
	'submarine',
	'telescope',
	'umbrella',
	'rocket',
	// Food
	'pizza',
	'sushi',
	'watermelon',
	'broccoli',
	'popcorn',
	// Places / structures
	'volcano',
	'castle',
	'windmill',
	'igloo',
	'bridge',
	// Instruments
	'piano',
	'violin',
	'trumpet',
	'guitar',
	// Misc
	'anchor',
	'cactus',
	'compass',
	'lantern',
	'snowflake',
]

const CUSTOM_SHAPE_UTILS = [PictWordCardShapeUtil]

// ─── WORD CARD INITIALIZATION ─────────────────────────────────────────────────

/**
 * Creates the word card for the current round.
 * Only PLAYERS[0] creates it (as the "host"). The other player receives it via sync.
 * Called BEFORE the plugin is installed so it bypasses permission checks.
 */
function initWordCard(editor: Editor, userId: string, word: string) {
	if (userId !== PLAYERS[0]) return

	const hasCard = editor.getCurrentPageShapes().some((s) => {
		const m = s.meta as Record<string, unknown>
		return m?.isWordCard === true
	})
	if (hasCard) return

	editor.createShapes([
		{
			type: 'pict-word-card',
			x: 20,
			y: 20,
			props: { word },
			meta: { isWordCard: true, owner: PLAYERS[0] },
		},
	])
}

// ─── TOOLBARS ─────────────────────────────────────────────────────────────────

/** The guesser only sees the hand tool — they can pan but not interact with shapes. */
const GUESSER_COMPONENTS: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isHandSelected = useIsToolSelected(tools['hand'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['hand']} isSelected={isHandSelected} />
			</DefaultToolbar>
		)
	},
}

// ─── PLAYER PANEL ─────────────────────────────────────────────────────────────

interface PlayerPanelProps {
	userId: PlayerId
	drawerId: string
	store: ReturnType<typeof useSyncDemo>
	word: string
	onEditorMount(userId: string, editor: Editor): void
}

function PlayerPanel({ userId, drawerId, store, word, onEditorMount }: PlayerPanelProps) {
	const pluginRef = useRef<TLPermissionsPlugin | null>(null)
	const editorRef = useRef<Editor | null>(null)

	// Keep a ref in sync with the current drawerId so the stable `rules` object
	// always reads the latest value.
	const drawerIdRef = useRef(drawerId)
	drawerIdRef.current = drawerId

	// Switch tools whenever this player's role changes between rounds.
	// On initial mount the tool is set inside handleMount; this effect handles
	// all subsequent role changes so the new guesser can't draw with a stale tool.
	useEffect(() => {
		if (!editorRef.current) return
		editorRef.current.setCurrentTool(userId === drawerId ? 'draw' : 'hand')
	}, [drawerId, userId])

	// Rules are stable across renders; they read `drawerIdRef.current` at call time.
	const rules = useMemo(
		(): TLPermissionRules => ({
			canCreateShape(ruleUserId) {
				return ruleUserId === drawerIdRef.current
			},

			canUpdateShape(ruleUserId, prev) {
				const meta = prev.meta as Record<string, unknown>
				if (meta?.isWordCard) {
					// Word card is owned by PLAYERS[0] (the host) and only they may update
					// it. Ownership-based rather than drawer-based so nextRound can update
					// the word via a normal user action that syncs to the server — unlike
					// mergeRemoteChanges which is local-only and gets reverted on the next
					// sync tick.
					return (meta?.owner as string) === ruleUserId
				}
				if (ruleUserId !== drawerIdRef.current) return false
				return (meta?.owner as string) === ruleUserId
			},

			canDeleteShape(ruleUserId, shape) {
				if (ruleUserId !== drawerIdRef.current) return false
				const meta = shape.meta as Record<string, unknown>
				if (meta?.isWordCard) return false
				return (meta?.owner as string) === ruleUserId
			},

			canSelectShape(ruleUserId) {
				return ruleUserId === drawerIdRef.current
			},

			canUseTool(ruleUserId, toolId) {
				// Drawer can use any tool; guesser is limited to hand only.
				if (ruleUserId === drawerIdRef.current) return true
				return toolId === 'hand'
			},
		}),
		[] // stable — reads drawerIdRef.current at call time
	)

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor

			// ① Create the word card BEFORE installing the plugin.
			initWordCard(editor, userId, word)

			// ② Install the permissions plugin.
			pluginRef.current = new TLPermissionsPlugin(editor, { userId, rules })

			// ③ Report this editor to the parent (used for word card updates).
			onEditorMount(userId, editor)

			// ④ Set the initial tool: drawer gets draw, guesser gets hand.
			editor.setCurrentTool(userId === drawerIdRef.current ? 'draw' : 'hand')

			return () => {
				pluginRef.current?.cleanup()
			}
		},
		// word and drawerId intentionally excluded — initWordCard and tool are one-time setup
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[userId, rules, onEditorMount]
	)

	const isDrawer = userId === drawerId
	const playerIndex = PLAYERS.indexOf(userId) + 1
	const headerBg = isDrawer ? '#fff8e6' : '#f6f6f6'
	const headerColor = isDrawer ? '#b07700' : '#555'

	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				borderRight: '1px solid #ddd',
			}}
		>
			<div
				style={{
					padding: '8px 12px',
					background: headerBg,
					color: headerColor,
					fontWeight: 700,
					fontSize: 13,
					borderBottom: '1px solid #ddd',
					userSelect: 'none',
				}}
			>
				Player {playerIndex} {isDrawer ? '✏️ (drawer)' : '👀 (guesser)'}
			</div>
			<div style={{ flex: 1, position: 'relative' }}>
				<PictionaryCtx.Provider value={{ userId, drawerId }}>
					<Tldraw
						store={store}
						shapeUtils={CUSTOM_SHAPE_UTILS}
						components={isDrawer ? undefined : GUESSER_COMPONENTS}
						onMount={handleMount}
						options={{ maxPages: 1 }}
					/>
				</PictionaryCtx.Provider>
			</div>
		</div>
	)
}

// ─── MAIN EXAMPLE ─────────────────────────────────────────────────────────────

export default function PictionaryExample() {
	const roomId = useMemo(
		() => `pict-perms-spike-${Math.random().toString(36).slice(2, 8)}`,
		[]
	)

	const [drawerIndex, setDrawerIndex] = useState(0)
	const drawerId = PLAYERS[drawerIndex % PLAYERS.length]
	const currentWord = WORDS[drawerIndex % WORDS.length]

	// Collect both editors so we can update the word card between rounds.
	const editorsRef = useRef<Partial<Record<string, Editor>>>({})

	const handleEditorMount = useCallback((uid: string, editor: Editor) => {
		editorsRef.current[uid] = editor
	}, [])

	// Rotate the drawer, clear the board, and update the word card.
	const nextRound = useCallback(() => {
		const newIndex = drawerIndex + 1
		const newWord = WORDS[newIndex % WORDS.length]

		// ① Clear the board: delete all shapes except the word card.
		//    The current drawer owns every non-card shape on the canvas (the
		//    guesser has zero create permissions), so deleting through their own
		//    editor satisfies `canDeleteShape` without needing mergeRemoteChanges.
		//    Being a normal user action, the deletions are pushed to the sync
		//    server and reach the other panel's store reliably.
		const drawerEditor = editorsRef.current[drawerId]
		if (drawerEditor) {
			const idsToDelete = drawerEditor
				.getCurrentPageShapes()
				.filter((s) => !(s.meta as Record<string, unknown>).isWordCard)
				.map((s) => s.id)
			if (idsToDelete.length > 0) {
				drawerEditor.deleteShapes(idsToDelete)
			}
		}

		// ② Update the word card via a normal user action on the host's editor.
		//    PLAYERS[0] always owns the word card, so the revised `canUpdateShape`
		//    rule allows this regardless of who is currently the drawer.  As a
		//    user action the change is pushed to the server and syncs to the
		//    other panel — mergeRemoteChanges would only update locally and be
		//    reverted on the next server tick.
		const hostEditor = editorsRef.current[PLAYERS[0]]
		if (hostEditor) {
			const card = hostEditor
				.getCurrentPageShapes()
				.find((s) => (s.meta as Record<string, unknown>)?.isWordCard === true)
			if (card) {
				hostEditor.updateShape({
					id: card.id,
					type: 'pict-word-card' as const,
					props: { word: newWord },
				})
			}
		}

		setDrawerIndex(newIndex)
	}, [drawerIndex, drawerId])

	const userInfo1 = useMemo(() => ({ id: PLAYERS[0], name: 'Player 1', color: '#d04000' }), [])
	const userInfo2 = useMemo(() => ({ id: PLAYERS[1], name: 'Player 2', color: '#0055cc' }), [])

	const store1 = useSyncDemo({ roomId, shapeUtils: CUSTOM_SHAPE_UTILS, userInfo: userInfo1 })
	const store2 = useSyncDemo({ roomId, shapeUtils: CUSTOM_SHAPE_UTILS, userInfo: userInfo2 })

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
				<strong>Round {drawerIndex + 1}</strong>
				<span style={{ color: '#888' }}>|</span>
				<span>
					Drawer: <strong style={{ color: '#b07700' }}>{drawerId}</strong>
				</span>
				<button
					onClick={nextRound}
					style={{
						padding: '3px 10px',
						fontSize: 12,
						cursor: 'pointer',
						borderRadius: 4,
						border: '1px solid #ccc',
						background: 'white',
					}}
				>
					Next round
				</button>
				<span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
					Room: {roomId} &mdash; permissions spike demo
				</span>
			</div>

			{/* Two-player split view */}
			<div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
				{PLAYERS.map((playerId, i) => (
					<PlayerPanel
						key={playerId}
						userId={playerId}
						drawerId={drawerId}
						store={i === 0 ? store1 : store2}
						word={currentWord}
						onEditorMount={handleEditorMount}
					/>
				))}
			</div>
		</div>
	)
}

/*
 * ─── HOW PER-VIEWER RENDERING WORKS ──────────────────────────────────────────
 *
 * Each <Tldraw> instance is wrapped in a <PictionaryCtx.Provider> that provides
 * the `userId` for that specific panel. PictWordCardShapeUtil.component() reads
 * this context: if `userId !== drawerId`, it returns null, making the shape
 * invisible to the guesser without any special tldraw API — it's just React.
 *
 * When `drawerId` changes (next round), both providers re-render with the new
 * value, so the word card immediately appears/disappears in the correct panel.
 *
 * ─── HOW WORD CARD UPDATES WORK ───────────────────────────────────────────────
 *
 * The word card is owned by PLAYERS[0] (the host). The `canUpdateShape` rule
 * checks ownership rather than drawer status for word-card shapes, so the host
 * can always update the word regardless of whose turn it is.
 *
 * `nextRound` calls `hostEditor.updateShape(...)` as a normal user action.
 * That change is pushed to the sync server and propagates to the other panel's
 * store. An earlier design used `mergeRemoteChanges` instead, but that marks
 * the mutation as 'remote' so the sync client never pushes it — the server
 * retains the old word and reverts both clients on the next sync tick.
 *
 * Board clearing works the same way: the current drawer's editor calls
 * `deleteShapes` as a user action. Since the drawer owns every non-card shape
 * (the guesser has zero create permissions), `canDeleteShape` allows it and the
 * deletions are synced to the server and the other panel reliably.
 *
 * ─── WHY TWO PANELS, NOT THREE ────────────────────────────────────────────────
 *
 * Running three useSyncDemo WebSocket connections to the same room from the
 * same browser tab causes one client to enter a sync reset loop that never
 * completes: TLSyncClient.rebase() receives unexpected push_result messages,
 * calls resetConnection(), clears the store, and tries to reconnect — but the
 * interplay of the three simultaneous clients prevents one from finishing its
 * handshake. That panel's store stays at status='loading' indefinitely.
 *
 * Two connections (the same count as tic-tac-toe) reliably stabilise within
 * ~1 s. The demo still shows all the key Pictionary concepts: role-based
 * permissions, per-viewer word card visibility, and drawer rotation.
 *
 * ─── KNOWN LIMITATION: startup sync errors ────────────────────────────────────
 *
 * See TicTacToeExample.tsx for the explanation of the "push_result" console
 * errors that appear on initial load with two sync clients in the same tab.
 */

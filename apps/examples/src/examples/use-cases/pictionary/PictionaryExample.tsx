/**
 * Pictionary: demonstrates role-based permissions and per-viewer shape visibility.
 *
 * Only the drawer may create/update/delete shapes. The word card is invisible
 * to guessers via the view.shape rule wired through getShapeVisibility.
 */

import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
	Tldraw,
	TldrawUiMenuItem,
	atom,
	getShapeCreatorId,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { PictWordCardShapeUtil } from './shapes'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const PLAYERS = ['player-1', 'player-2'] as const
export type PlayerId = (typeof PLAYERS)[number]

const PLAYER_USERS: Record<string, TLIdentityUser> = {
	'player-1': { id: 'player-1', name: 'Player 1', color: '#d04000' },
	'player-2': { id: 'player-2', name: 'Player 2', color: '#0055cc' },
}

function createPlayerIdentity(userId: string): TLIdentityProvider {
	return {
		getCurrentUser: () => PLAYER_USERS[userId] ?? null,
		resolveUser: (id) => PLAYER_USERS[id] ?? null,
	}
}

const WORDS = [
	'elephant',
	'penguin',
	'giraffe',
	'octopus',
	'flamingo',
	'lighthouse',
	'submarine',
	'telescope',
	'umbrella',
	'rocket',
	'pizza',
	'sushi',
	'watermelon',
	'broccoli',
	'popcorn',
	'volcano',
	'castle',
	'windmill',
	'igloo',
	'bridge',
	'piano',
	'violin',
	'trumpet',
	'guitar',
	'anchor',
	'cactus',
	'compass',
	'lantern',
	'snowflake',
]

const CUSTOM_SHAPE_UTILS = [PictWordCardShapeUtil]

// ─── WORD CARD INITIALIZATION ─────────────────────────────────────────────────

/** Creates the word card. Called before the manager is set up so it bypasses checks. */
function initWordCard(editor: Editor, userId: string, word: string) {
	if (userId !== PLAYERS[0]) return

	const hasCard = editor.getCurrentPageShapes().some((s) => {
		const m = s.meta as Record<string, unknown>
		return m?.isWordCard === true
	})
	if (hasCard) return

	const hostUser = PLAYER_USERS[PLAYERS[0]]
	editor.createShapes([
		{
			type: 'pict-word-card',
			x: 20,
			y: 20,
			props: { word },
			meta: {
				isWordCard: true,
				createdBy: { id: hostUser.id, name: hostUser.name },
			},
		},
	])
}

// ─── SHAPE VISIBILITY ─────────────────────────────────────────────────────────

/**
 * Integrates the view.shape permission rule with the editor's rendering pipeline.
 * Uses editor.permissions so the same rule definition controls both
 * visibility and server-side filtering via createServerPermissionsFilter.
 *
 * Reading the manager's rule (which reads drawerIdAtom) inside this callback
 * creates a reactive dependency — the computed cache invalidates automatically
 * when the atom changes.
 */
function getShapeVisibility(shape: TLShape, editor: Editor) {
	const mgr = editor.permissions
	if (!mgr) return 'inherit' as const
	return mgr.canViewShape(shape) ? ('inherit' as const) : ('hidden' as const)
}

// ─── TOOLBARS ─────────────────────────────────────────────────────────────────

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
	/** Reactive atom — rules read this to get the current drawer, which makes
	 *  getShapeVisibility's computed cache invalidate when the drawer changes. */
	drawerIdAtom: ReturnType<typeof atom<string>>
	store: ReturnType<typeof useSyncDemo>
	word: string
	onEditorMount(userId: string, editor: Editor): void
}

function PlayerPanel({
	userId,
	drawerId,
	drawerIdAtom,
	store,
	word,
	onEditorMount,
}: PlayerPanelProps) {
	const editorRef = useRef<Editor | null>(null)

	const identity = useMemo(() => createPlayerIdentity(userId), [userId])

	// Switch tools whenever this player's role changes between rounds.
	useEffect(() => {
		if (!editorRef.current) return
		editorRef.current.setCurrentTool(userId === drawerId ? 'draw' : 'hand')
	}, [drawerId, userId])

	// Rules read drawerIdAtom.get() — a reactive read that creates dependencies
	// in computed contexts (like getShapeVisibility's cache).
	const rules = useMemo(
		(): Record<string, TLPermissionRule> => ({
			[CORE_ACTIVITIES.CREATE_SHAPE]: ({ user }) => {
				return user.id === drawerIdAtom.get()
			},

			[CORE_ACTIVITIES.UPDATE_SHAPE]: ({ user, prevShape }) => {
				if (!prevShape) return false
				const meta = prevShape.meta as Record<string, unknown>
				if (meta?.isWordCard) {
					return getShapeCreatorId(prevShape) === user.id
				}
				if (user.id !== drawerIdAtom.get()) return false
				return getShapeCreatorId(prevShape) === user.id
			},

			[CORE_ACTIVITIES.DELETE_SHAPE]: ({ user, targetShape }) => {
				if (!targetShape) return false
				if (user.id !== drawerIdAtom.get()) return false
				const meta = targetShape.meta as Record<string, unknown>
				if (meta?.isWordCard) return false
				return getShapeCreatorId(targetShape) === user.id
			},

			[CORE_ACTIVITIES.SELECT_SHAPE]: ({ user }) => {
				return user.id === drawerIdAtom.get()
			},

			[CORE_ACTIVITIES.VIEW_SHAPE]: ({ user, targetShape }) => {
				if (!targetShape) return true
				const meta = targetShape.meta as Record<string, unknown>
				if (meta?.isWordCard) {
					return user.id === drawerIdAtom.get()
				}
				return true
			},

			[CORE_ACTIVITIES.USE_TOOL]: ({ user, toolId }) => {
				if (user.id === drawerIdAtom.get()) return true
				return toolId === 'hand'
			},
		}),
		[drawerIdAtom]
	)

	// Stable permissions config — passed as a prop to <Tldraw>.
	const permissionsConfig = useMemo(
		(): TLPermissionsManagerConfig => ({ identity, rules }),
		[identity, rules]
	)

	const handleMount = useCallback(
		(editor: Editor) => {
			editorRef.current = editor
			initWordCard(editor, userId, word)

			// Stamp ownership on new shapes (simulates PR #8147's tlmeta).
			const user = identity.getCurrentUser()!
			const cleanupAttribution = editor.sideEffects.registerBeforeCreateHandler(
				'shape',
				(shape, source) => {
					if (source !== 'user') return shape
					return {
						...shape,
						meta: {
							...shape.meta,
							createdBy: { id: user.id, name: user.name },
						},
					}
				}
			)

			onEditorMount(userId, editor)
			editor.setCurrentTool(userId === drawerIdAtom.get() ? 'draw' : 'hand')

			return () => {
				cleanupAttribution()
			}
		},
		// word intentionally excluded — initWordCard is one-time setup
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[userId, onEditorMount, identity, drawerIdAtom]
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
				<Tldraw
					store={store}
					shapeUtils={CUSTOM_SHAPE_UTILS}
					components={isDrawer ? undefined : GUESSER_COMPONENTS}
					onMount={handleMount}
					permissions={permissionsConfig}
					getShapeVisibility={getShapeVisibility}
					options={{ maxPages: 1 }}
				/>
			</div>
		</div>
	)
}

// ─── MAIN EXAMPLE ─────────────────────────────────────────────────────────────

export default function PictionaryExample() {
	const roomId = useMemo(() => `pict-perms-${Math.random().toString(36).slice(2, 8)}`, [])

	const [drawerIndex, setDrawerIndex] = useState(0)
	const drawerId = PLAYERS[drawerIndex % PLAYERS.length]
	const currentWord = WORDS[drawerIndex % WORDS.length]

	// Reactive atom — shared with PlayerPanel so permission rules create
	// reactive dependencies that invalidate getShapeVisibility's cache.
	const drawerIdAtom = useMemo(() => atom('drawerId', PLAYERS[0] as string), [])
	useEffect(() => {
		drawerIdAtom.set(drawerId)
	}, [drawerId, drawerIdAtom])

	const editorsRef = useRef<Partial<Record<string, Editor>>>({})

	const handleEditorMount = useCallback((uid: string, editor: Editor) => {
		editorsRef.current[uid] = editor
	}, [])

	const nextRound = useCallback(() => {
		const newIndex = drawerIndex + 1
		const newWord = WORDS[newIndex % WORDS.length]

		// Clear the board: delete all shapes except the word card.
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

		// Update the word card (PLAYERS[0] owns it via meta.createdBy).
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
					Room: {roomId} &mdash; permissions demo
				</span>
			</div>

			{/* Two-player split view */}
			<div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
				{PLAYERS.map((playerId, i) => (
					<PlayerPanel
						key={playerId}
						userId={playerId}
						drawerId={drawerId}
						drawerIdAtom={drawerIdAtom}
						store={i === 0 ? store1 : store2}
						word={currentWord}
						onEditorMount={handleEditorMount}
					/>
				))}
			</div>
		</div>
	)
}

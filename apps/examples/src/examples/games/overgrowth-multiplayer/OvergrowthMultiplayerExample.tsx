import { useSyncDemo } from '@tldraw/sync'
import { useEffect, useRef, useState } from 'react'
import { CSSProperties } from 'react'
import {
	atom,
	Box,
	createShapeId,
	TLAnyOverlayUtilConstructor,
	JsonObject,
	TLComponents,
	TLGeoShape,
	TLShapeId,
	TLShapePartial,
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	CUT_ZOOM_EPSILON,
	CUT_ZOOM_MIN,
	frame$,
	getWorld,
	GRID,
	GROWTH_PULSE_INTERVAL,
	Owner,
	publishScores,
	resetWorld,
	setViewer,
	setWorld,
	SWIPE_IDLE_MS,
	SWIPE_SHRINK,
	winner$,
} from '../overgrowth/game-state'
import { OvergrowthOverlayUtil } from '../overgrowth/overlays/OvergrowthOverlayUtil'
import { hasPresence, sliceCut, SPARK_POOL, stepSim, stepSparks } from '../overgrowth/sim'
import { applySnapshot, serializeWorld, WorldSnapshot } from './net'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, OvergrowthOverlayUtil]

// Bare canvas — same as single-player: the player only ever cuts.
const uiComponents: Partial<TLUiComponents> = {
	Toolbar: null,
	StylePanel: null,
	PageMenu: null,
	MainMenu: null,
	NavigationPanel: null,
	HelpMenu: null,
	ActionsMenu: null,
	QuickActions: null,
	ZoomMenu: null,
	Minimap: null,
}
const components: TLComponents = uiComponents

const overrides: TLUiOverrides = {
	actions(_editor, actions) {
		for (const id in actions) actions[id] = { ...actions[id], kbd: undefined }
		return actions
	},
	tools(_editor, tools) {
		for (const id in tools) tools[id] = { ...tools[id], kbd: undefined }
		return tools
	},
}

const ZOOM_SPEED = 2
const SPARK_VINE_ZOOM = 0.85

// Local (client-only) UI state shared between the headless runner and the win
// banner: the local player's role (for the banner's perspective) and whether the
// local player has pressed "Ready" for a rematch.
const localRole$ = atom<Owner | 'spectator'>('og-mp-role', 'spectator')
const localReady$ = atom('og-mp-ready', false)

// tldraw-native panel surface for the win banner.
const PANEL_STYLE: CSSProperties = {
	background: 'var(--tl-color-panel)',
	color: 'var(--tl-color-text)',
	border: '1px solid var(--tl-color-muted-1)',
	borderRadius: 8,
	boxShadow: 'var(--tl-shadow-2, 0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.1))',
	fontFamily: 'var(--tl-font-ui, system-ui)',
}

// --- multiplayer wiring -----------------------------------------------------
// State rides in shape `meta` on a useSyncDemo store (same pattern as the 3D
// shooter example). The WORLD shape is owned by the host and carries the
// authoritative snapshot; each client owns one PLAYER shape carrying its
// heartbeat, role, and a queue of cut segments for the host to apply. All data
// shapes are tiny, locked, fully transparent and parked far off-screen.
const WORLD_SHAPE = createShapeId('og-world')
const playerShapeId = (clientId: string) => createShapeId(`og-player-${clientId}`)
const HEARTBEAT_MS = 800 // how often a client refreshes its player shape
const CUT_SEND_MS = 35 // guest: throttle for sending fresh cut segments
const CUT_SNAP_MS = 45 // host: min gap between prompt post-cut snapshots
const PREDICT_MS = 300 // guest: re-apply an unconfirmed predicted cut for this long
const ALIVE_MS = 4000 // a client is "present" if seen within this window
const OFFSCREEN = -1_000_000

interface CutSeg {
	seq: number
	fx: number
	fy: number
	tx: number
	ty: number
}
interface PlayerMeta {
	kind: 'og-player'
	clientId: string
	role: Owner | 'spectator'
	seen: number
	cuts: CutSeg[]
	ready: boolean // pressed "Ready" for a rematch after a win
}

function boardBounds() {
	return {
		x: GRID.x0 - GRID.spacing,
		y: GRID.y0 - GRID.spacing,
		w: (GRID.cols + 1) * GRID.spacing,
		h: (GRID.rows + 1) * GRID.spacing,
	}
}

// Off-screen, transparent geo rectangle used purely as a synced data carrier
// (its `meta` holds the payload). NOT locked: tldraw ignores updateShape on
// locked shapes, which would freeze every heartbeat and snapshot after creation.
function dataShape(id: TLShapeId, meta: JsonObject): TLShapePartial<TLGeoShape> {
	return {
		id,
		type: 'geo',
		x: OFFSCREEN,
		y: OFFSCREEN,
		opacity: 0,
		props: { w: 1, h: 1, geo: 'rectangle' },
		meta,
	}
}

function GameRunner({ clientId }: { clientId: string }) {
	const editor = useEditor()
	// Live mirrors of role/host so the input closures (set up once) read current
	// values as the room membership changes.
	const roleRef = useRef<Owner | 'spectator'>('spectator')
	const isHostRef = useRef(false)

	useEffect(() => {
		// The host owns the sim world; guests render a world rebuilt from snapshots.
		// We start everyone with a fresh local world so there's something to draw
		// before the first snapshot arrives; the host's becomes authoritative.
		resetWorld()

		editor.setCameraOptions({ ...editor.getCameraOptions(), zoomSpeed: ZOOM_SPEED })
		const b = boardBounds()
		editor.zoomToBounds(new Box(b.x, b.y, b.w, b.h), { inset: 24 })

		// Create our player shape once.
		const myShape = playerShapeId(clientId)
		const writeMeta = (meta: PlayerMeta) => {
			editor.run(
				() => {
					if (editor.getShape(myShape)) {
						editor.updateShape({ id: myShape, type: 'geo', meta: meta as any })
					} else {
						editor.createShape(dataShape(myShape, meta as any))
					}
				},
				{ history: 'ignore' }
			)
		}

		let cutSeq = 0
		let pendingCuts: CutSeg[] = [] // guest: segments awaiting send
		// guest: predicted cuts applied locally but not yet confirmed by a snapshot —
		// re-applied after each snapshot (for PREDICT_MS) so they don't flicker back.
		let unconfirmedCuts: Array<{
			from: { x: number; y: number }
			to: { x: number; y: number }
			role: Owner
			t: number
		}> = []
		let lastHeartbeat = 0
		let lastCutSend = 0 // guest: throttle clock for cut sends
		let lastSentSeq = -1 // guest: highest cut seq we've written to our shape
		let lastCutSnap = 0 // host: throttle clock for prompt post-cut snapshots
		const appliedSeq: Record<string, number> = {} // host: last applied cut seq per client

		const myMeta = (): PlayerMeta => ({
			kind: 'og-player',
			clientId,
			role: roleRef.current,
			seen: Date.now(),
			cuts: pendingCuts.slice(-64), // rolling window
			ready: localReady$.get(),
		})

		// Read all present player shapes → assign roles → decide host. Roles are
		// stable by clientId sort: lowest = a (blue), next = b (orange), rest spectate.
		const refreshRoom = (now: number) => {
			const players: PlayerMeta[] = []
			for (const s of editor.getCurrentPageShapes()) {
				const m = s.meta as unknown as PlayerMeta
				if (m?.kind === 'og-player' && now - m.seen < ALIVE_MS) players.push(m)
			}
			players.sort((p, q) => (p.clientId < q.clientId ? -1 : 1))
			const meIdx = players.findIndex((p) => p.clientId === clientId)
			const role = meIdx === 0 ? 'a' : meIdx === 1 ? 'b' : 'spectator'
			roleRef.current = role
			localRole$.set(role)
			// Tell the overlay which side "we" are, so its reach-greying is computed
			// from our perspective (enemy = the other color).
			if (role === 'a' || role === 'b') setViewer(role)
			// Host = the player assigned 'a' (lowest id present). If that's us, sim.
			isHostRef.current = players.length > 0 && players[0].clientId === clientId
			return players
		}

		// All active (non-spectator) players have pressed Ready.
		const allReady = (players: PlayerMeta[]) => {
			const active = players.filter((p) => p.role === 'a' || p.role === 'b')
			return active.length > 0 && active.every((p) => p.ready)
		}

		// Sparks (decoration) for whatever world we're showing — the host's sim world
		// or the guest's reconstructed one. Stable strand ids (see net.ts) let the
		// guest's sparks persist across snapshot rebuilds.
		const stepLocalSparks = () => {
			const world = getWorld()
			const zoom = editor.getZoomLevel()
			let want = 0
			const visible = new Set<string>()
			if (zoom >= SPARK_VINE_ZOOM) {
				const vp = editor.getViewportPageBounds()
				const c0 = Math.floor((vp.minX - GRID.x0) / GRID.spacing) - 1
				const c1 = Math.ceil((vp.maxX - GRID.x0) / GRID.spacing) + 1
				const r0 = Math.floor((vp.minY - GRID.y0) / GRID.spacing) - 1
				const r1 = Math.ceil((vp.maxY - GRID.y0) / GRID.spacing) + 1
				for (const s of world.strands) {
					const c = s.cell % GRID.cols
					const r = (s.cell / GRID.cols) | 0
					if (c >= c0 && c <= c1 && r >= r0 && r <= r1) visible.add(s.id)
				}
				want = Math.min(SPARK_POOL, Math.round(visible.size * 0.5 * Math.min(2, zoom)))
			}
			stepSparks(world, visible, want)
		}

		// Host: drain queued cut segments from every player shape and apply them.
		// Returns true if any cut was applied (so the host can publish promptly).
		const applyRemoteCuts = (players: PlayerMeta[]): boolean => {
			const world = getWorld()
			let applied = false
			for (const p of players) {
				if (p.clientId === clientId) continue // our own cuts are applied locally
				const role = p.role
				if (role !== 'a' && role !== 'b') continue
				const last = appliedSeq[p.clientId] ?? -1
				let maxSeq = last
				for (const seg of p.cuts) {
					if (seg.seq <= last) continue
					sliceCut(world, { x: seg.fx, y: seg.fy }, { x: seg.tx, y: seg.ty }, role)
					if (seg.seq > maxSeq) maxSeq = seg.seq
					applied = true
				}
				appliedSeq[p.clientId] = maxSeq
			}
			return applied
		}

		const writeSnapshot = () => {
			const snap = serializeWorld(getWorld())
			editor.run(
				() => {
					if (editor.getShape(WORLD_SHAPE)) {
						editor.updateShape({ id: WORLD_SHAPE, type: 'geo', meta: snap as any })
					} else {
						editor.createShape(dataShape(WORLD_SHAPE, snap as any))
					}
				},
				{ history: 'ignore' }
			)
		}

		let lastSnapTick = -1 // guest: last snapshot tick we ingested
		let readySent = false // whether our last-written meta carried ready=true
		let prevWinner = false // to detect a new game starting (winner cleared)

		const onTick = () => {
			const now = Date.now()
			const players = refreshRoom(now)

			// Write our player shape when something actually changed — a slow presence
			// heartbeat, a ready toggle, or NEW cut segments (throttled). The old
			// `|| pendingCuts.length` rewrote the synced shape every single tick for the
			// rest of the game after one cut (the rolling window never empties), which
			// flooded the room and lagged the guest while cutting.
			const ready = localReady$.get()
			const maxSeq = pendingCuts.length ? pendingCuts[pendingCuts.length - 1].seq : lastSentSeq
			const newCuts = maxSeq > lastSentSeq && now - lastCutSend > CUT_SEND_MS
			if (now - lastHeartbeat > HEARTBEAT_MS || ready !== readySent || newCuts) {
				lastHeartbeat = now
				if (newCuts) {
					lastCutSend = now
					lastSentSeq = maxSeq
				}
				readySent = ready
				writeMeta(myMeta())
				if (pendingCuts.length > 128) pendingCuts = pendingCuts.slice(-64)
			}

			if (isHostRef.current) {
				const world = getWorld()
				const cutApplied = applyRemoteCuts(players)
				const hadWinner = !!world.winner
				stepSim(world) // no-op once a winner is decided
				publishScores(world) // mirrors world.winner → winner$
				if (!hadWinner && world.winner) {
					writeSnapshot() // game just ended — publish the result immediately
				} else if (world.winner) {
					// Game over: start a fresh game once every active player is ready.
					if (allReady(players)) {
						resetWorld()
						localReady$.set(false)
						writeSnapshot()
					}
				} else {
					// Publish on each growth pulse (≈4/sec), and PROMPTLY (throttled) right
					// after applying a guest's cut so the cut isn't stuck waiting for the
					// next pulse — that wait is what made a guest's cuts feel laggy.
					const promptCut = cutApplied && now - lastCutSnap > CUT_SNAP_MS
					if (world.tick % GROWTH_PULSE_INTERVAL === 0 || promptCut) {
						if (promptCut) lastCutSnap = now
						writeSnapshot()
					}
				}
			} else {
				// Guest: ingest the latest snapshot if it changed, reusing the world in
				// place (cheap — see applySnapshot). Between snapshots, advance the local
				// tick so transient cut-flashes animate (snapshots only arrive ≈4/sec).
				const ws = editor.getShape(WORLD_SHAPE)
				const snap = ws?.meta as unknown as WorldSnapshot | undefined
				if (snap?.v === 1 && snap.tick !== lastSnapTick) {
					lastSnapTick = snap.tick
					setWorld(applySnapshot(getWorld(), snap))
					winner$.set(snap.winner)
					// Reconcile: drop predicted cuts old enough that the host's state
					// surely reflects them, then re-apply the rest on top of the fresh
					// (authoritative) world so a just-made cut doesn't flicker back. Already
					// reflected? sliceCut finds no vine there and no-ops.
					if (unconfirmedCuts.length) {
						unconfirmedCuts = unconfirmedCuts.filter((c) => now - c.t < PREDICT_MS)
						const w = getWorld()
						for (const c of unconfirmedCuts) sliceCut(w, c.from, c.to, c.role)
					}
				} else {
					getWorld().tick++
				}
				// Keep our local slicing cue across snapshot swaps.
				getWorld().slicing = slicing
			}

			// Sparks for whatever we're showing (host sim world or guest's rebuild).
			stepLocalSparks()

			// When a new game starts (winner cleared), drop our local ready flag.
			const nowWinner = !!getWorld().winner
			if (prevWinner && !nowWinner) localReady$.set(false)
			prevWinner = nowWinner

			frame$.set(frame$.get() + 1)
		}
		editor.on('tick', onTick)

		// --- input: same cut/camera reconciliation as single-player -------------
		let spaceHeld = false
		const onSpaceKey = (e: KeyboardEvent) => {
			if (e.code === 'Space') spaceHeld = e.type === 'keydown'
		}
		window.addEventListener('keydown', onSpaceKey, true)
		window.addEventListener('keyup', onSpaceKey, true)

		const onKeyDown = (e: KeyboardEvent) => {
			const k = e.key.toLowerCase()
			if (k === 'r') {
				// Host-only reset; guests follow via the next snapshot.
				if (isHostRef.current) resetWorld()
			} else if (k === 'q') {
				const bb = boardBounds()
				editor.zoomToBounds(new Box(bb.x, bb.y, bb.w, bb.h), {
					inset: 24,
					animation: { duration: 300 },
				})
			} else if (k === 'w') {
				const bb = boardBounds()
				const vsb = editor.getViewportScreenBounds()
				const inset = 24
				const fit = Math.min((vsb.w - inset * 2) / bb.w, (vsb.h - inset * 2) / bb.h)
				const c = editor.getViewportPageBounds().center
				editor.zoomToBounds(new Box(c.x - 1, c.y - 1, 2, 2), {
					targetZoom: fit * 2.4,
					animation: { duration: 300 },
				})
			}
		}
		window.addEventListener('keydown', onKeyDown)

		const container = editor.getContainer()
		const toPage = (e: PointerEvent) => editor.screenToPage({ x: e.clientX, y: e.clientY })
		let slicing = false
		let pointerDown = false
		let last = { x: 0, y: 0 }
		let scribble: { sessionId: string; scribbleId: string } | null = null

		// Apply a cut segment: host cuts its own world directly; guest queues it for
		// the host. Both set their local world's `slicing` flag so the overlay greys
		// out-of-reach enemy vines locally.
		const doCut = (from: { x: number; y: number }, to: { x: number; y: number }) => {
			const role = roleRef.current
			if (role !== 'a' && role !== 'b') return
			if (isHostRef.current) {
				sliceCut(getWorld(), from, to, role)
			} else {
				pendingCuts.push({ seq: cutSeq++, fx: from.x, fy: from.y, tx: to.x, ty: to.y })
				// Optimistic prediction: apply the cut on our own screen right away so it
				// feels instant. We run the SAME sliceCut the host will, against our
				// (near-identical) world, so an allowed cut succeeds here too — and a
				// disallowed one (out of reach) is rejected here just like on the host, so
				// there's nothing to mispredict. If it lands, remember it so we can
				// re-apply it after snapshots until the host's state catches up.
				if (sliceCut(getWorld(), from, to, role)) {
					unconfirmedCuts.push({ from: { ...from }, to: { ...to }, role, t: Date.now() })
				}
			}
		}

		const startSlice = (p: { x: number; y: number }) => {
			if (roleRef.current === 'spectator') return
			slicing = true
			getWorld().slicing = true
			last = p
			const sessionId = editor.scribbles.startSession({
				selfConsume: true,
				idleTimeoutMs: SWIPE_IDLE_MS,
				fadeMode: 'grouped',
				fadeEasing: 'ease-in',
			})
			const eraser = editor.scribbles.addScribbleToSession(sessionId, {
				color: 'black',
				opacity: 0.45,
				size: 12,
				taper: true,
				shrink: SWIPE_SHRINK,
			})
			scribble = { sessionId, scribbleId: eraser.id }
			editor.scribbles.addPointToSession(sessionId, eraser.id, p.x, p.y)
		}

		const onPointerMove = (e: PointerEvent) => {
			if (!pointerDown) return
			const p = toPage(e)
			if (!slicing) {
				if (editor.getZoomLevel() >= CUT_ZOOM_MIN) startSlice(p)
				return
			}
			doCut(last, p)
			if (scribble) {
				editor.scribbles.addPointToSession(scribble.sessionId, scribble.scribbleId, p.x, p.y)
			}
			last = p
		}

		const onPointerUp = () => {
			if (scribble) {
				editor.scribbles.stopSession(scribble.sessionId)
				scribble = null
			}
			slicing = false
			getWorld().slicing = false
			pointerDown = false
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}

		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0 || spaceHeld) return
			if (roleRef.current === 'spectator') return
			// Don't start a cut when clicking our own HUD (e.g. the rematch button).
			if ((e.target as HTMLElement)?.closest?.('[data-og-ui]')) return
			const p = toPage(e)
			pointerDown = true
			window.addEventListener('pointermove', onPointerMove, true)
			window.addEventListener('pointerup', onPointerUp, true)
			if (editor.getZoomLevel() >= CUT_ZOOM_MIN) {
				startSlice(p)
			} else {
				const targetZoom = CUT_ZOOM_MIN + CUT_ZOOM_EPSILON
				const half = GRID.spacing
				editor.zoomToBounds(new Box(p.x - half, p.y - half, half * 2, half * 2), {
					targetZoom,
					animation: { duration: 320 },
				})
			}
			e.stopPropagation()
			e.preventDefault()
		}
		container.addEventListener('pointerdown', onPointerDown, true)

		// Cursor: draw cross, with the reach cue (not-allowed when out of reach).
		const canvasEl = container.querySelector('.tl-canvas') as HTMLElement | null
		let outOfReach = false
		const onHoverMove = (e: PointerEvent) => {
			const role = roleRef.current
			if (slicing || role === 'spectator' || editor.getZoomLevel() < CUT_ZOOM_MIN) {
				outOfReach = false
				return
			}
			const p = editor.screenToPage({ x: e.clientX, y: e.clientY })
			outOfReach = !hasPresence(getWorld(), role, p)
		}
		container.addEventListener('pointermove', onHoverMove)

		const enforceCursor = () => {
			if (spaceHeld) {
				if (canvasEl) canvasEl.style.cursor = ''
				return
			}
			const showNotAllowed = outOfReach && !slicing && editor.getZoomLevel() >= CUT_ZOOM_MIN
			if (showNotAllowed) {
				if (canvasEl && canvasEl.style.cursor !== 'not-allowed')
					canvasEl.style.cursor = 'not-allowed'
			} else {
				if (canvasEl && canvasEl.style.cursor) canvasEl.style.cursor = ''
				if (editor.getInstanceState().cursor.type !== 'cross') {
					editor.setCursor({ type: 'cross', rotation: 0 })
				}
			}
		}
		editor.setCursor({ type: 'cross', rotation: 0 })
		editor.on('tick', enforceCursor)

		return () => {
			editor.off('tick', onTick)
			editor.off('tick', enforceCursor)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keydown', onSpaceKey, true)
			window.removeEventListener('keyup', onSpaceKey, true)
			container.removeEventListener('pointerdown', onPointerDown, true)
			container.removeEventListener('pointermove', onHoverMove)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
			if (canvasEl) canvasEl.style.cursor = ''
			// Tidy up our player shape so peers prune us promptly.
			editor.run(() => editor.deleteShape(playerShapeId(clientId)), { history: 'ignore' })
		}
	}, [editor, clientId])

	return null
}

// Win banner + rematch handshake. Shown once a core falls; both players press
// "Ready" and the host starts a fresh game.
function WinBanner() {
	const winner = useValue('winner', () => winner$.get(), [])
	const role = useValue('role', () => localRole$.get(), [])
	const ready = useValue('ready', () => localReady$.get(), [])
	if (!winner) return null
	const playing = role === 'a' || role === 'b'
	const label = playing
		? winner === role
			? 'You won'
			: 'You lost'
		: `${winner === 'a' ? 'Blue' : 'Orange'} won`
	return (
		<div
			data-og-ui
			style={{
				position: 'absolute',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				zIndex: 1001,
				pointerEvents: 'none',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 10,
				textAlign: 'center',
			}}
		>
			<div style={{ ...PANEL_STYLE, padding: '12px 22px', fontSize: 22, fontWeight: 600 }}>
				{label}
			</div>
			{playing && (
				<button
					onClick={() => localReady$.set(true)}
					disabled={ready}
					style={{
						...PANEL_STYLE,
						pointerEvents: 'auto',
						padding: '8px 16px',
						fontSize: 14,
						fontWeight: 500,
						cursor: ready ? 'default' : 'pointer',
						opacity: ready ? 0.7 : 1,
					}}
				>
					{ready ? 'Waiting for opponent…' : 'Ready for a rematch'}
				</button>
			)}
		</div>
	)
}

export default function OvergrowthMultiplayerExample({
	roomId = 'tldraw-overgrowth',
}: {
	roomId?: string
}) {
	// Stable per-tab client id (two tabs of one browser are still distinct players).
	const [clientId] = useState(() => Math.random().toString(36).slice(2, 10))
	// Which sync server to use. `?syncHost=` overrides everything. Otherwise: on
	// localhost we use the local bemo worker (fast dev); when opened over a tunnel
	// (any non-localhost host) the local worker isn't reachable from another
	// machine, so we fall back to tldraw's public demo server — that way a shared
	// link Just Works for a friend with no extra params.
	const [host] = useState(() => {
		const override = new URLSearchParams(window.location.search).get('syncHost')
		if (override) return override
		const { hostname } = window.location
		if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined
		// Opened over a tunnel. Prefer the host's own bemo worker exposed by
		// `yarn dev-share` so localhost and the shared link are the SAME game (and
		// versions always match); fall back to tldraw's public demo server.
		return process.env.TLDRAW_SHARE_SYNC_HOST || 'https://demo.tldraw.xyz'
	})
	const store = useSyncDemo(host ? { roomId, host } : { roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				colorScheme="light"
				overlayUtils={overlayUtils}
				components={components}
				overrides={overrides}
			>
				<GameRunner clientId={clientId} />
				<WinBanner />
			</Tldraw>
		</div>
	)
}

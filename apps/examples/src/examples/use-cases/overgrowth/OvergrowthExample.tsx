import { CSSProperties, useEffect } from 'react'
import {
	Box,
	TLAnyOverlayUtilConstructor,
	TLComponents,
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
	hint$,
	resetWorld,
	SWIPE_IDLE_MS,
	SWIPE_SHRINK,
	winner$,
} from './game-state'
import { OvergrowthOverlayUtil } from './overlays/OvergrowthOverlayUtil'
import { sliceCut, SPARK_POOL, stepSim, stepSparks } from './sim'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, OvergrowthOverlayUtil]

// Bare canvas: no toolbar/panels. The player only ever cuts.
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

// Disable ALL default tldraw keyboard shortcuts by stripping `kbd` from every
// action and tool (useKeyboardShortcuts skips any entry with no kbd). The game's
// own keys (Q = zoom to fit, R = reset) are handled by a window listener, and
// Space-pan is native (not a kbd binding), so both still work.
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

// Camera zoom multiplier. The game is about traveling between zoom levels (read
// out, act in), so scroll/pinch zoom is sped up beyond the default. Applied via
// editor.setCameraOptions on mount (the recommended path).
const ZOOM_SPEED = 2

// Sparks only appear above this zoom; their target count scales with zoom so a
// tight zoom gets a lively field and a wider one stays cheap. Capped at SPARK_POOL.
const SPARK_VINE_ZOOM = 0.85

function boardBounds() {
	return {
		x: GRID.x0 - GRID.spacing,
		y: GRID.y0 - GRID.spacing,
		w: (GRID.cols + 1) * GRID.spacing,
		h: (GRID.rows + 1) * GRID.spacing,
	}
}

// Headless runner: owns the sim/tick loop and the cut interaction. Renders
// nothing (the overlay draws the board).
function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()

		// Speed up scroll/pinch zoom — the game is about traveling between zoom
		// levels quickly.
		editor.setCameraOptions({ ...editor.getCameraOptions(), zoomSpeed: ZOOM_SPEED })

		// Frame the whole board on mount, then let the user pan/zoom freely with
		// tldraw's native camera gestures.
		const b = boardBounds()
		editor.zoomToBounds(new Box(b.x, b.y, b.w, b.h), { inset: 24 })

		const onTick = () => {
			const world = getWorld()
			stepSim(world)

			// Sparks are viewport-local decoration. Build the set of vine ids
			// overlapping the viewport (via the strand cell index), and ask for a
			// zoom-scaled count — zero when zoomed out, so off-screen / far views
			// cost nothing.
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
				// Density scales with how zoomed in we are, capped by the pool.
				want = Math.min(SPARK_POOL, Math.round(visible.size * 0.5 * Math.min(2, zoom)))
			}
			stepSparks(world, visible, want)

			// Blue (the AI) never cuts — it competes purely by automatic growth, so
			// there is nothing to drive here. The human is the only entity that prunes.

			frame$.set(frame$.get() + 1)
		}
		editor.on('tick', onTick)

		// Track Space (held = panning) so we can yield the cursor to tldraw's pan.
		let spaceHeld = false
		const onSpaceKey = (e: KeyboardEvent) => {
			if (e.code === 'Space') spaceHeld = e.type === 'keydown'
		}
		window.addEventListener('keydown', onSpaceKey, true)
		window.addEventListener('keyup', onSpaceKey, true)

		// Game keys. All default tldraw shortcuts are disabled via `overrides` (see
		// the export). The only keys are: Q = zoom to fit the board, R = reset.
		// Space (pan) is handled natively by tldraw, not via a kbd binding.
		const onKeyDown = (e: KeyboardEvent) => {
			const k = e.key.toLowerCase()
			if (k === 'r') resetWorld()
			else if (k === 'q') {
				const b = boardBounds()
				editor.zoomToBounds(new Box(b.x, b.y, b.w, b.h), {
					inset: 24,
					animation: { duration: 300 },
				})
			} else if (k === 'w') {
				// Pulled-back "density" view: 0.75x the zoom-to-fit level — the whole
				// view at your current spot (center preserved), not recentered on the board.
				const b = boardBounds()
				const vsb = editor.getViewportScreenBounds()
				const inset = 24
				const fit = Math.min((vsb.w - inset * 2) / b.w, (vsb.h - inset * 2) / b.h)
				// Keep the current viewport center; just set the zoom to 0.75x the fit zoom.
				const c = editor.getViewportPageBounds().center
				editor.zoomToBounds(new Box(c.x - 1, c.y - 1, 2, 2), {
					targetZoom: fit * 1.55,
					animation: { duration: 300 },
				})
			}
		}
		window.addEventListener('keydown', onKeyDown)

		// --- input: reconcile CUT vs CAMERA ---------------------------------
		// Only a plain LEFT-button pointerdown (button 0, no space held) starts a
		// cut. Middle-button, right-button, and space-drag all fall through to
		// tldraw so wheel/trackpad/pinch zoom and space-drag pan keep working. We
		// never intercept wheel/gesture events at all.
		const container = editor.getContainer()
		const toPage = (e: PointerEvent) => editor.screenToPage({ x: e.clientX, y: e.clientY })
		let slicing = false
		let pointerDown = false
		let last = { x: 0, y: 0 }
		// The active cut's SDK scribble session: the SDK eraser brush, darkened a
		// bit. It fades out on its own when the session stops.
		let scribble: { sessionId: string; scribbleId: string } | null = null

		// Begin cutting at page point `p`: set state + open a scribble session with
		// the SDK eraser brush. Listeners are attached on pointerdown / removed on
		// pointerup, so this can be called from down OR from the first qualifying
		// move.
		const startSlice = (p: { x: number; y: number }) => {
			slicing = true
			last = p
			// Laser-style trailing: the ScribbleManager already caps the live trail
			// length and fades it. A short idleTimeoutMs keeps the tail tight when the
			// pointer pauses; `shrink` tapers it away on release for a clean fade.
			const sessionId = editor.scribbles.startSession({
				selfConsume: true,
				idleTimeoutMs: SWIPE_IDLE_MS,
				fadeMode: 'grouped',
				fadeEasing: 'ease-in',
			})
			// The SDK eraser brush (chunky, tapered), in 'black' at a moderate opacity
			// so it reads a bit darker than the eraser's default muted grey.
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
			const world = getWorld()
			const p = toPage(e)
			if (!slicing) {
				// Not cutting yet. As soon as the camera has flown in (live zoom is at
				// the cut threshold), begin the cut at the CURRENT pointer — no timer.
				if (editor.getZoomLevel() >= CUT_ZOOM_MIN) startSlice(p)
				return
			}
			// Slicing. Cutter is 'a'.
			sliceCut(world, last, p, 'a')
			// Feed the eraser scribble the same point.
			if (scribble) {
				editor.scribbles.addPointToSession(scribble.sessionId, scribble.scribbleId, p.x, p.y)
			}
			last = p
		}

		const onPointerUp = () => {
			if (scribble) {
				editor.scribbles.stopSession(scribble.sessionId) // fades out on its own
				scribble = null
			}
			slicing = false
			pointerDown = false
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}

		const onPointerDown = (e: PointerEvent) => {
			// Anything that isn't a plain left click is camera: let tldraw handle it.
			if (e.button !== 0 || spaceHeld) return

			const p = toPage(e)
			pointerDown = true
			// Track movement from now, even before slicing begins (so a fly-in then
			// drag starts the cut on the first qualifying move).
			window.addEventListener('pointermove', onPointerMove, true)
			window.addEventListener('pointerup', onPointerUp, true)

			if (editor.getZoomLevel() >= CUT_ZOOM_MIN) {
				// Already zoomed in enough → cut immediately.
				startSlice(p)
			} else {
				// Too far out → auto-zoom-to-cut: fly the camera in and zoom just past
				// the cut threshold. We DON'T slice yet; cutting begins once the user
				// drags and the live zoom has reached the threshold (see onPointerMove).
				// Press-and-release without dragging = just a zoom.
				const targetZoom = CUT_ZOOM_MIN + CUT_ZOOM_EPSILON
				const half = GRID.spacing
				editor.zoomToBounds(new Box(p.x - half, p.y - half, half * 2, half * 2), {
					targetZoom,
					animation: { duration: 320 },
				})
			}

			// Claim this gesture as a cut so tldraw doesn't also start a camera/select.
			e.stopPropagation()
			e.preventDefault()
		}
		container.addEventListener('pointerdown', onPointerDown, true)

		// Cursor: the DRAW tool's cursor ('cross') is the ONLY canvas cursor — it
		// signals "cut by drawing a swipe". tldraw re-asserts its own cursor whenever
		// instance state changes, so we reassert ours each tick. EXCEPTION: while
		// Space is held (panning), we leave tldraw's grab/grabbing cursor alone.
		const enforceCursor = () => {
			if (spaceHeld) return // let tldraw's space-pan grab/grabbing cursor show
			if (editor.getInstanceState().cursor.type !== 'cross') {
				editor.setCursor({ type: 'cross', rotation: 0 })
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
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}
	}, [editor])

	return null
}

// A clean tldraw-style panel surface used by both banners.
const PANEL_STYLE: CSSProperties = {
	background: 'var(--tl-color-panel)',
	color: 'var(--tl-color-text)',
	border: '1px solid var(--tl-color-muted-1)',
	borderRadius: 8,
	boxShadow: 'var(--tl-shadow-2, 0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.1))',
	fontFamily: 'var(--tl-font-ui, system-ui)',
}

// Transient constraint-system feedback (zoom-in-to-cut, out-of-reach, choke,
// hydra). A clean toast near the bottom-center so it doesn't block the action.
// Auto-expires by comparing against the live frame.
function HintBanner() {
	const hint = useValue('hint', () => hint$.get(), [])
	const frame = useValue('frame', () => frame$.get(), [])
	if (!hint || frame > hint.until) return null
	return (
		<div
			style={{
				position: 'absolute',
				bottom: 24,
				left: '50%',
				transform: 'translateX(-50%)',
				zIndex: 1002,
				pointerEvents: 'none',
			}}
		>
			<div style={{ ...PANEL_STYLE, padding: '8px 12px', fontSize: 13, fontWeight: 500 }}>
				{hint.text}
			</div>
		</div>
	)
}

function WinBanner() {
	const winner = useValue('winner', () => winner$.get(), [])
	if (!winner) return null
	// winner 'a' = the player besieged the enemy core. 'b' = the player's core fell.
	const label = winner === 'a' ? 'You won — enemy core destroyed' : 'Your core fell'
	return (
		<div
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
				gap: 8,
				textAlign: 'center',
			}}
		>
			<div style={{ ...PANEL_STYLE, padding: '12px 20px', fontSize: 20, fontWeight: 600 }}>
				{label}
			</div>
			<div
				style={{
					fontFamily: 'var(--tl-font-ui, system-ui)',
					fontSize: 13,
					color: 'var(--tl-color-text)',
					opacity: 0.7,
				}}
			>
				Press R to play again
			</div>
		</div>
	)
}

export default function OvergrowthExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components} overrides={overrides}>
				<GameRunner />
				<HintBanner />
				<WinBanner />
			</Tldraw>
		</div>
	)
}

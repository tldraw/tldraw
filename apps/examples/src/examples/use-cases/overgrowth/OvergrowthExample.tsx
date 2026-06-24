import { CSSProperties, useEffect } from 'react'
import {
	Box,
	TLAnyOverlayUtilConstructor,
	TLComponents,
	TLUiComponents,
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
	hoveredVine$,
	resetWorld,
	winner$,
} from './game-state'
import { OvergrowthOverlayUtil } from './overlays/OvergrowthOverlayUtil'
import { hoverHitTest, sliceCut, SPARK_POOL, stepSim, stepSparks } from './sim'

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

// Camera zoom multiplier. The game is about traveling between zoom levels (read
// out, act in), so scroll/pinch zoom is sped up beyond the default. Applied via
// editor.setCameraOptions on mount (the recommended path).
const ZOOM_SPEED = 2

// Sparks only appear above this zoom; their target count scales with zoom so a
// tight zoom gets a lively field and a wider one stays cheap. Capped at SPARK_POOL.
const SPARK_VINE_ZOOM = 0.85

// Pixel radius (screen px, divided by zoom to page units) within which the
// cursor "hovers" a vine for the contextual cuttable cue.
const HOVER_RADIUS = 16

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

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'r') resetWorld()
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
		let spaceHeld = false
		// The active cut's SDK scribble session: the SDK eraser brush, darkened a
		// bit. It fades out on its own when the session stops.
		let scribble: { sessionId: string; scribbleId: string } | null = null

		const onSpaceKey = (e: KeyboardEvent) => {
			if (e.code === 'Space') spaceHeld = e.type === 'keydown'
		}
		window.addEventListener('keydown', onSpaceKey, true)
		window.addEventListener('keyup', onSpaceKey, true)

		// Begin cutting at page point `p`: set state + open one scribble session with
		// the two composed brushes. Listeners are attached on pointerdown / removed
		// on pointerup, so this can be called from down OR from the first qualifying
		// move.
		const startSlice = (p: { x: number; y: number }) => {
			slicing = true
			hoveredVine$.set(null) // clear hover state + reset cursor while cutting
			container.style.cursor = ''
			last = p
			const sessionId = editor.scribbles.startSession({
				selfConsume: false,
				idleTimeoutMs: editor.options.laserDelayMs,
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
				editor.scribbles.stopSession(scribble.sessionId) // both scribbles fade together
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

		// Contextual hover feedback via the CURSOR only (no on-canvas marks): while
		// zoomed in past CUT_ZOOM_MIN and NOT cutting, hit-test the vine under the
		// cursor (bounded to the cursor's cell ±1 via the spatial index). If it's an
		// enemy vine out of reach, show the not-allowed cursor; otherwise default.
		// hoveredVine$ is updated only when the hovered vine/kind changes.
		const setCursor = (cursor: string) => {
			if (container.style.cursor !== cursor) container.style.cursor = cursor
		}
		const onHoverMove = (e: PointerEvent) => {
			if (slicing) return // the active-cut move handler owns the pointer
			if (editor.getZoomLevel() < CUT_ZOOM_MIN) {
				if (hoveredVine$.get()) hoveredVine$.set(null)
				setCursor('')
				return
			}
			const world = getWorld()
			const p = editor.screenToPage({ x: e.clientX, y: e.clientY })
			const hit = hoverHitTest(world, p, HOVER_RADIUS / editor.getZoomLevel())
			const next = hit ? { strandId: hit.strand.id, kind: hit.kind } : null
			const cur = hoveredVine$.get()
			// Only update on a real change (id or kind), to avoid re-render spam.
			if ((cur?.strandId ?? null) !== (next?.strandId ?? null) || cur?.kind !== next?.kind) {
				hoveredVine$.set(next)
			}
			// Out-of-reach enemy vine → "can't cut here". Everything else → default.
			setCursor(next?.kind === 'enemy-out-of-reach' ? 'not-allowed' : '')
		}
		container.addEventListener('pointermove', onHoverMove)

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keydown', onSpaceKey, true)
			window.removeEventListener('keyup', onSpaceKey, true)
			container.removeEventListener('pointerdown', onPointerDown, true)
			container.removeEventListener('pointermove', onHoverMove)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
			hoveredVine$.set(null)
			container.style.cursor = ''
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
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<HintBanner />
				<WinBanner />
			</Tldraw>
		</div>
	)
}

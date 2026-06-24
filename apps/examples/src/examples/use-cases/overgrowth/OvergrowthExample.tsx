import { useEffect } from 'react'
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
	CUT_ZOOM_MIN,
	frame$,
	getWorld,
	GRID,
	hint$,
	hpA$,
	hpB$,
	resetWorld,
	scoreA$,
	scoreB$,
	showHint,
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
		let canCut = false // zoom-lock: was the swipe started zoomed in enough?
		let last = { x: 0, y: 0 }
		let laser: { sessionId: string; scribbleId: string } | null = null
		let spaceHeld = false

		const onSpaceKey = (e: KeyboardEvent) => {
			if (e.code === 'Space') spaceHeld = e.type === 'keydown'
		}
		window.addEventListener('keydown', onSpaceKey, true)
		window.addEventListener('keyup', onSpaceKey, true)

		const onPointerMove = (e: PointerEvent) => {
			if (!slicing || !laser) return
			const world = getWorld()
			const p = toPage(e)
			// Zoom-lock: below CUT_ZOOM_MIN the swipe is drawn but severs nothing.
			// The human is always cutter 'a'.
			if (canCut) sliceCut(world, last, p, 'a')
			editor.scribbles.addPointToSession(laser.sessionId, laser.scribbleId, p.x, p.y)
			last = p
		}

		const onPointerUp = () => {
			if (slicing && laser) {
				editor.scribbles.stopSession(laser.sessionId)
				laser = null
			}
			slicing = false
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}

		const onPointerDown = (e: PointerEvent) => {
			// Anything that isn't a plain left click is camera: let tldraw handle it.
			if (e.button !== 0 || spaceHeld) return

			slicing = true
			canCut = editor.getZoomLevel() >= CUT_ZOOM_MIN
			if (!canCut) showHint('zoom in to cut', 'info')
			last = toPage(e)
			const sessionId = editor.scribbles.startSession({
				selfConsume: false,
				idleTimeoutMs: editor.options.laserDelayMs,
				fadeMode: 'grouped',
				fadeEasing: 'ease-in',
			})
			const scribble = editor.scribbles.addScribbleToSession(sessionId, {
				color: 'laser',
				opacity: 0.7,
				size: 4,
				taper: false,
			})
			laser = { sessionId, scribbleId: scribble.id }
			editor.scribbles.addPointToSession(sessionId, scribble.id, last.x, last.y)

			// Claim this gesture as a cut so tldraw doesn't also start a camera/select.
			e.stopPropagation()
			e.preventDefault()
			window.addEventListener('pointermove', onPointerMove, true)
			window.addEventListener('pointerup', onPointerUp, true)
		}
		container.addEventListener('pointerdown', onPointerDown, true)

		return () => {
			editor.off('tick', onTick)
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

// Transient constraint-system feedback (zoom-in-to-cut, out-of-reach, choke,
// hydra), shown centered. Auto-expires by comparing against the live frame.
function HintBanner() {
	const hint = useValue('hint', () => hint$.get(), [])
	const frame = useValue('frame', () => frame$.get(), [])
	if (!hint || frame > hint.until) return null
	const color =
		hint.tone === 'warn' ? '#ef4444' : hint.tone === 'good' ? '#22c55e' : 'var(--tl-color-text)'
	return (
		<div
			style={{
				position: 'absolute',
				top: '14%',
				left: 0,
				right: 0,
				zIndex: 1002,
				pointerEvents: 'none',
				display: 'flex',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					padding: '6px 14px',
					borderRadius: 8,
					background: 'var(--tl-color-panel, white)',
					boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
					font: '600 14px var(--tl-font-ui, sans-serif)',
					color,
				}}
			>
				{hint.text}
			</div>
		</div>
	)
}

function HpBar({ hp, color }: { hp: number; color: string }) {
	return (
		<span
			style={{
				display: 'inline-block',
				width: 70,
				height: 7,
				borderRadius: 4,
				background: 'rgba(127,127,127,0.3)',
				overflow: 'hidden',
				verticalAlign: 'middle',
			}}
		>
			<span
				style={{
					display: 'block',
					width: `${Math.max(0, Math.min(100, hp))}%`,
					height: '100%',
					background: hp > 30 ? color : '#ef4444',
				}}
			/>
		</span>
	)
}

function Hud() {
	const scoreA = useValue('scoreA', () => scoreA$.get(), [])
	const scoreB = useValue('scoreB', () => scoreB$.get(), [])
	const hpA = useValue('hpA', () => hpA$.get(), [])
	const hpB = useValue('hpB', () => hpB$.get(), [])
	const total = scoreA + scoreB || 1
	const pctA = Math.round((scoreA / total) * 100)
	const pctB = 100 - pctA
	return (
		<div
			style={{
				position: 'absolute',
				top: 12,
				left: 12,
				zIndex: 1000,
				pointerEvents: 'none',
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				font: '600 14px var(--tl-font-ui, sans-serif)',
				color: 'var(--tl-color-text)',
			}}
		>
			<div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
				<span style={{ color: 'crimson', display: 'flex', alignItems: 'center', gap: 6 }}>
					<Dot color="crimson" /> Your core <HpBar hp={hpA} color="crimson" /> {hpA}
				</span>
				<span style={{ color: 'dodgerblue', display: 'flex', alignItems: 'center', gap: 6 }}>
					<Dot color="dodgerblue" /> Enemy core <HpBar hp={hpB} color="dodgerblue" /> {hpB}
				</span>
			</div>
			<span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
				territory: red {pctA}% · blue {pctB}% — besiege the enemy core to win
			</span>
			<span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
				left-drag to prune (zoom in) · scroll/pinch to zoom · space-drag to pan · R to reset
			</span>
		</div>
	)
}

function WinBanner() {
	const winner = useValue('winner', () => winner$.get(), [])
	if (!winner) return null
	// winner 'a' = the player besieged the enemy core. 'b' = the player's core fell.
	const label = winner === 'a' ? 'You won — enemy core destroyed' : 'Your core fell'
	const color = winner === 'a' ? 'crimson' : 'dodgerblue'
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				zIndex: 1001,
				pointerEvents: 'none',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexDirection: 'column',
				gap: 8,
			}}
		>
			<div
				style={{
					padding: '14px 28px',
					borderRadius: 12,
					background: 'var(--tl-color-panel, white)',
					boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
					font: '700 28px var(--tl-font-ui, sans-serif)',
					color,
				}}
			>
				{label}
			</div>
			<div
				style={{
					font: '500 13px var(--tl-font-ui, sans-serif)',
					color: 'var(--tl-color-text)',
					opacity: 0.7,
				}}
			>
				Press R to play again
			</div>
		</div>
	)
}

function Dot({ color }: { color: string }) {
	return (
		<span
			style={{
				display: 'inline-block',
				width: 9,
				height: 9,
				borderRadius: 2,
				background: color,
				marginRight: 4,
			}}
		/>
	)
}

export default function OvergrowthExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
				<HintBanner />
				<WinBanner />
			</Tldraw>
		</div>
	)
}

import { useEffect } from 'react'
import {
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
	buildPreview$,
	energyA$,
	energyB$,
	getWorld,
	GRID,
	pegOwner,
	publishWorld,
	resetWorld,
	scoreA$,
	scoreB$,
	winner$,
} from './game-state'
import { WarsOverlayUtil } from './overlays/WarsOverlayUtil'
import { aiStep, buildStrand, canBuild, nearestPeg, sliceCut, stepSignals, stepWorld } from './sim'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, WarsOverlayUtil]

// Strip the editor UI down to a bare canvas for the prototype.
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

const PICK_RADIUS = 30 // screen px to start a build from one of your pegs
const AI_STEPS = 36 // ticks between AI decisions (slow, readable cadence)

function gridCenter() {
	return {
		x: GRID.x0 + ((GRID.cols - 1) * GRID.spacing) / 2,
		y: GRID.y0 + ((GRID.rows - 1) * GRID.spacing) / 2,
	}
}

// Headless: owns the physics/sim loop and pointer interaction, renders nothing.
function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		editor.centerOnPoint(gridCenter())

		const onTick = () => {
			const world = getWorld()
			stepWorld(world)
			stepSignals(world)
			// AI on a slow cadence so its moves are readable.
			world.aiTimer++
			if (world.aiTimer >= AI_STEPS) {
				world.aiTimer = 0
				aiStep(world)
			}
			publishWorld()
		}
		editor.on('tick', onTick)

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'r') resetWorld()
		}
		window.addEventListener('keydown', onKeyDown)

		const container = editor.getContainer()
		const toPage = (e: PointerEvent) => editor.screenToPage({ x: e.clientX, y: e.clientY })
		let mode: 'idle' | 'build' | 'slice' = 'idle'
		let buildFrom: ReturnType<typeof nearestPeg> = null
		let last = { x: 0, y: 0 }
		// The active cut's tldraw laser scribble (its own fade behaviour).
		let laser: { sessionId: string; scribbleId: string } | null = null

		const onPointerMove = (e: PointerEvent) => {
			const world = getWorld()
			const p = toPage(e)
			if (mode === 'build' && buildFrom) {
				// Rubber-band preview; snap the target to the nearest peg and show
				// whether releasing there would be a valid/affordable build.
				const target = nearestPeg(world, p, GRID.spacing * 0.6)
				const to = target ?? p
				const valid = !!target && canBuild(world, 'a', buildFrom, target)
				buildPreview$.set({ from: { x: buildFrom.x, y: buildFrom.y }, to, valid })
			} else if (mode === 'slice' && laser) {
				sliceCut(world, last, p)
				editor.scribbles.addPointToSession(laser.sessionId, laser.scribbleId, p.x, p.y)
				last = p
			}
		}

		const onPointerUp = (e: PointerEvent) => {
			const world = getWorld()
			if (mode === 'build' && buildFrom) {
				const target = nearestPeg(world, toPage(e), GRID.spacing * 0.6)
				if (target) buildStrand(world, 'a', buildFrom, target) // no-op if invalid
				buildPreview$.set(null)
				buildFrom = null
			} else if (mode === 'slice' && laser) {
				// Fade the cut out immediately on release for a snappier feel.
				editor.scribbles.stopSession(laser.sessionId)
				laser = null
			}
			mode = 'idle'
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}

		const onPointerDown = (e: PointerEvent) => {
			const world = getWorld()
			const p = toPage(e)
			// BUILD if pressed near a peg the human (red 'a') owns; otherwise CUT.
			const peg = nearestPeg(world, p, PICK_RADIUS / editor.getZoomLevel())
			if (peg && pegOwner(peg) === 'a') {
				mode = 'build'
				buildFrom = peg
				buildPreview$.set({ from: { x: peg.x, y: peg.y }, to: p, valid: false })
			} else {
				mode = 'slice'
				last = p
				// Start a real tldraw laser scribble (same options the laser tool uses).
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
				editor.scribbles.addPointToSession(sessionId, scribble.id, p.x, p.y)
			}
			e.stopPropagation()
			e.preventDefault()
			window.addEventListener('pointermove', onPointerMove, true)
			window.addEventListener('pointerup', onPointerUp, true)
		}
		container.addEventListener('pointerdown', onPointerDown, true)

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			container.removeEventListener('pointerdown', onPointerDown, true)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
			buildPreview$.set(null)
		}
	}, [editor])

	return null
}

function Hud() {
	const scoreA = useValue('scoreA', () => scoreA$.get(), [])
	const scoreB = useValue('scoreB', () => scoreB$.get(), [])
	const energyA = useValue('energyA', () => energyA$.get(), [])
	const energyB = useValue('energyB', () => energyB$.get(), [])
	const leader = scoreA === scoreB ? 'Even' : scoreA > scoreB ? 'Red leads' : 'Blue leads'
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
				gap: 4,
				font: '600 14px var(--tl-font-ui, sans-serif)',
				color: 'var(--tl-color-text)',
			}}
		>
			<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
				<span style={{ color: 'crimson' }}>
					<Dot color="crimson" /> Red {scoreA} · {energyA}⚡
				</span>
				<span style={{ color: 'dodgerblue' }}>
					<Dot color="dodgerblue" /> Blue {scoreB} · {energyB}⚡
				</span>
				<span style={{ opacity: 0.7, fontWeight: 400 }}>{leader}</span>
			</div>
			<span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
				drag from your pegs to build · swipe to cut · R to reset
			</span>
		</div>
	)
}

function WinBanner() {
	const winner = useValue('winner', () => winner$.get(), [])
	if (!winner) return null
	const label = winner === 'a' ? 'Red wins' : 'Blue wins'
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

export default function SignalWarsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
				<WinBanner />
			</Tldraw>
		</div>
	)
}

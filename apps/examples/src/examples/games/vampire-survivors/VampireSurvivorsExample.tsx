import { useCallback, useEffect } from 'react'
import {
	Editor,
	TLAnyOverlayUtilConstructor,
	TLUiComponents,
	Tldraw,
	createShapeId,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { Segment } from './engine'
import { getWorld, hud$, levelUpChoices$, publishWorld, resetWorld, walls$ } from './game-state'
import { EnemyOverlayUtil } from './overlays/EnemyOverlayUtil'
import { GemOverlayUtil } from './overlays/GemOverlayUtil'
import { ProjectileOverlayUtil } from './overlays/ProjectileOverlayUtil'
import { RaycastView } from './RaycastView'
import { Upgrade, UpgradeId, applyUpgrade, rollUpgrades, stepWorld } from './sim'
import './vampire-survivors.css'

// Gems under enemies under projectiles — zIndex is set on each util. The whole
// swarm lives on the single canvas overlay; only the player is a real shape.
const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	GemOverlayUtil,
	EnemyOverlayUtil,
	ProjectileOverlayUtil,
]

const PLAYER_ID = createShapeId('vs-player')

// Shapes the player draws become walls — the same line-segment world the 3D
// raycaster example reads, so collisions today and a first-person view later
// would share one source of truth.
const WALL_TYPES = new Set(['geo', 'line', 'draw', 'arrow'])

function readWalls(editor: Editor): Segment[] {
	const segments: Segment[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.meta?.vs) continue // skip our own player shape
		if (!WALL_TYPES.has(shape.type)) continue
		const geometry = editor.getShapeGeometry(shape)
		const verts = editor.getShapePageTransform(shape).applyToPoints(geometry.vertices)
		if (verts.length < 2) continue
		const edges = geometry.isClosed ? verts.length : verts.length - 1
		for (let i = 0; i < edges; i++) {
			const a = verts[i]
			const b = verts[(i + 1) % verts.length]
			segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y })
		}
	}
	return segments
}

interface Input {
	up: boolean
	down: boolean
	left: boolean
	right: boolean
}

// One simulation frame: advance the world, mirror it into the atoms, move the
// player shape, follow with the camera, and raise the level-up menu when due.
function stepFrame(editor: Editor, input: Input, dtMs: number) {
	const world = getWorld()
	const walls = readWalls(editor)
	walls$.set(walls) // share with the first-person view
	stepWorld(world, input, dtMs, walls)
	publishWorld()

	const r = world.radius
	editor.run(
		() =>
			editor.updateShape({
				id: PLAYER_ID,
				type: 'geo',
				x: world.player.x - r,
				y: world.player.y - r,
			}),
		{ history: 'ignore', ignoreShapeLock: true }
	)
	editor.centerOnPoint({ x: world.player.x, y: world.player.y })

	if (world.pendingLevelUp && !levelUpChoices$.get()) {
		levelUpChoices$.set(rollUpgrades(3))
	}
}

function chooseUpgrade(id: UpgradeId | undefined) {
	if (!id) return
	applyUpgrade(getWorld(), id)
	levelUpChoices$.set(null)
	publishWorld()
}

function restart(editor: Editor) {
	resetWorld()
	const world = getWorld()
	editor.run(
		() =>
			editor.updateShape({
				id: PLAYER_ID,
				type: 'geo',
				x: world.player.x - world.radius,
				y: world.player.y - world.radius,
			}),
		{ history: 'ignore', ignoreShapeLock: true }
	)
	editor.centerOnPoint({ x: world.player.x, y: world.player.y })
}

function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		const world = getWorld()
		const r = world.radius

		// The player is a real tldraw shape: tldraw design language, locked so it
		// can't be dragged, repositioned by the sim every frame.
		editor.createShape({
			id: PLAYER_ID,
			type: 'geo',
			x: world.player.x - r,
			y: world.player.y - r,
			isLocked: true,
			meta: { vs: 'player' },
			props: { geo: 'ellipse', w: r * 2, h: r * 2, color: 'blue', fill: 'solid', dash: 'draw' },
		})
		editor.centerOnPoint({ x: world.player.x, y: world.player.y })

		const input: Input = { up: false, down: false, left: false, right: false }

		const onTick = (elapsedMs: number) => {
			// Clamp so a backgrounded tab doesn't teleport the swarm on resume.
			stepFrame(editor, input, Math.min(50, elapsedMs))
		}
		editor.on('tick', onTick)

		const setKey = (key: string, down: boolean) => {
			switch (key) {
				case 'w':
				case 'arrowup':
					input.up = down
					return true
				case 's':
				case 'arrowdown':
					input.down = down
					return true
				case 'a':
				case 'arrowleft':
					input.left = down
					return true
				case 'd':
				case 'arrowright':
					input.right = down
					return true
			}
			return false
		}

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target?.matches('input, textarea, [contenteditable="true"]')) return
			const key = e.key.toLowerCase()
			if (setKey(key, true)) {
				e.preventDefault()
				return
			}
			if (key === '1' || key === '2' || key === '3') {
				const choices = levelUpChoices$.get()
				if (choices) chooseUpgrade(choices[Number(key) - 1]?.id)
			} else if (key === 'r' && hud$.get().gameOver) {
				restart(editor)
			}
		}
		const onKeyUp = (e: KeyboardEvent) => setKey(e.key.toLowerCase(), false)

		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			if (editor.getShape(PLAYER_ID)) {
				editor.run(() => editor.deleteShape(PLAYER_ID), { ignoreShapeLock: true })
			}
		}
	}, [editor])

	return null
}

function formatTime(ms: number) {
	const total = Math.floor(ms / 1000)
	const m = Math.floor(total / 60)
	const s = total % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

function Hud() {
	const hud = useValue('hud', () => hud$.get(), [])
	const hpPct = hud.maxHp ? Math.max(0, (hud.hp / hud.maxHp) * 100) : 0
	const xpPct = hud.xpToNext ? (hud.xp / hud.xpToNext) * 100 : 0

	return (
		<div className="vs-hud">
			<div className="vs-hud__bars">
				<div className="vs-bar vs-bar--hp">
					<div className="vs-bar__fill" style={{ width: `${hpPct}%` }} />
					<span className="vs-bar__label">{Math.ceil(hud.hp)} HP</span>
				</div>
				<div className="vs-bar vs-bar--xp">
					<div className="vs-bar__fill" style={{ width: `${xpPct}%` }} />
					<span className="vs-bar__label">Level {hud.level}</span>
				</div>
			</div>
			<div className="vs-hud__stats">
				<span>{formatTime(hud.timeMs)}</span>
				<span>{hud.kills} kills</span>
			</div>
		</div>
	)
}

function LevelUpMenu() {
	const choices = useValue('levelup', () => levelUpChoices$.get(), [])
	const onPick = useCallback((u: Upgrade) => chooseUpgrade(u.id), [])
	if (!choices) return null

	return (
		<div className="vs-modal">
			<div className="vs-modal__panel">
				<h2 className="vs-modal__title">Level up</h2>
				<p className="vs-modal__sub">Choose an upgrade</p>
				<div className="vs-cards">
					{choices.map((u, i) => (
						<button
							key={u.id}
							className="vs-card"
							style={{ ['--vs-card-color' as any]: `var(--vs-${u.color})` }}
							onClick={() => onPick(u)}
						>
							<span className="vs-card__key">{i + 1}</span>
							<span className="vs-card__title">{u.title}</span>
							<span className="vs-card__desc">{u.description}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	)
}

function GameOverBanner() {
	const editor = useEditor()
	const gameOver = useValue('gameover', () => hud$.get().gameOver, [])
	const kills = useValue('kills', () => hud$.get().kills, [])
	const time = useValue('time', () => hud$.get().timeMs, [])
	const onRestart = useCallback(() => restart(editor), [editor])
	if (!gameOver) return null

	return (
		<div className="vs-modal">
			<div className="vs-modal__panel">
				<h2 className="vs-modal__title">You died</h2>
				<p className="vs-modal__sub">
					Survived {formatTime(time)} · {kills} kills
				</p>
				<button className="vs-restart" onClick={onRestart}>
					Play again <kbd>R</kbd>
				</button>
			</div>
		</div>
	)
}

const components: Partial<TLUiComponents> = {
	// Keep the real toolbar and style panel — you can still draw shapes, and any
	// shape you draw becomes a wall. That's the "it's genuinely tldraw" demo.
	PageMenu: null,
	MainMenu: null,
	ContextMenu: null,
	HelpMenu: null,
	DebugMenu: null,
	DebugPanel: null,
}

// No stray text shapes from a double-click while dodging the swarm.
const options = { createTextOnCanvasDoubleClick: false }

export default function VampireSurvivorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components} options={options}>
				<GameRunner />
				<Hud />
				<RaycastView />
				<LevelUpMenu />
				<GameOverBanner />
			</Tldraw>
		</div>
	)
}

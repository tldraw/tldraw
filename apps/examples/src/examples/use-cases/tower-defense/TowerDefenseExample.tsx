import { useCallback, useEffect } from 'react'
import {
	Box,
	Editor,
	TLAnyOverlayUtilConstructor,
	TLUiComponents,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { resetSpawnTimer, runGameTick } from './game-loop'
import {
	enemies$,
	gameOver$,
	gold$,
	lives$,
	placingTower$,
	projectiles$,
	resetGameState,
	score$,
} from './game-state'
import { EnemyOverlayUtil } from './overlays/EnemyOverlayUtil'
import { ExplosionOverlayUtil } from './overlays/ExplosionOverlayUtil'
import { PathOverlayUtil } from './overlays/PathOverlayUtil'
import { PlacementPreviewOverlayUtil } from './overlays/PlacementPreviewOverlayUtil'
import { ProjectileOverlayUtil } from './overlays/ProjectileOverlayUtil'
import { TowerRangeOverlayUtil } from './overlays/TowerRangeOverlayUtil'
import { UpgradeButtonOverlayUtil } from './overlays/UpgradeButtonOverlayUtil'
import { TOWER_GEOS, TOWER_STATS_BY_GEO, TowerGeo } from './tower-config'
import './tower-defense.css'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	PathOverlayUtil,
	TowerRangeOverlayUtil,
	PlacementPreviewOverlayUtil,
	EnemyOverlayUtil,
	ProjectileOverlayUtil,
	ExplosionOverlayUtil,
	UpgradeButtonOverlayUtil,
]

function pickTower(geo: TowerGeo) {
	const cost = TOWER_STATS_BY_GEO[geo].cost
	// Refuse to arm a tower the player can't afford so the preview / placement
	// flow only kicks in when a click would actually result in a tower.
	if (gold$.get() < cost) return
	placingTower$.set(geo)
}

function pickSelect(editor: Editor) {
	placingTower$.set(null)
	editor.setCurrentTool('select')
}

function restartGame(editor: Editor) {
	resetGameState()
	resetSpawnTimer()
	placingTower$.set(null)
	// Just nuke everything on the page — towers are the only thing the user
	// can produce here, and starting fresh shouldn't leave any stragglers.
	const allShapeIds = editor.getCurrentPageShapes().map((s) => s.id)
	if (allShapeIds.length === 0) return
	editor.run(() => editor.deleteShapes(allShapeIds), { ignoreShapeLock: true })
}

function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		const onTick = (elapsedMs: number) => {
			// Clamp on tab-resume; tldraw emits a single big elapsed when the tab
			// has been idle, which would otherwise teleport enemies.
			const dt = Math.min(60, elapsedMs)
			runGameTick(editor, dt)
		}
		editor.on('tick', onTick)

		// Keyboard: 1/2/3 arm a tower, Esc selects, Space restarts.
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target?.matches('input, textarea, [contenteditable="true"]')) return
			if (e.key === '1') pickTower('triangle')
			else if (e.key === '2') pickTower('rectangle')
			else if (e.key === '3') pickTower('ellipse')
			else if (e.key === 'Escape') pickSelect(editor)
			else if (e.key === ' ') {
				e.preventDefault()
				restartGame(editor)
			}
		}
		window.addEventListener('keydown', onKeyDown)

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			placingTower$.set(null)
		}
	}, [editor])

	return null
}

function GameToolbar() {
	const editor = useEditor()
	const placingGeo = useValue('placingGeo', () => placingTower$.get(), [])
	const gold = useValue('gold', () => gold$.get(), [])

	const onPickSelect = useCallback(() => pickSelect(editor), [editor])

	return (
		<div className="td-toolbar">
			<button
				className={'td-toolbar__btn' + (placingGeo === null ? ' is-active' : '')}
				onClick={onPickSelect}
				title="Select (Esc)"
			>
				<SelectGlyph />
				<span className="td-toolbar__label">Select</span>
				<span className="td-toolbar__cost">
					<kbd>esc</kbd>
				</span>
			</button>
			{TOWER_GEOS.map((geo, i) => {
				const stats = TOWER_STATS_BY_GEO[geo]
				const isActive = placingGeo === geo
				const canAfford = gold >= stats.cost
				const cls =
					'td-toolbar__btn' + (isActive ? ' is-active' : '') + (canAfford ? '' : ' is-disabled')
				return (
					<button
						key={geo}
						className={cls}
						onClick={() => canAfford && pickTower(geo)}
						disabled={!canAfford}
						title={`${stats.label} (${geo}) — ${stats.cost} gold — press ${i + 1}`}
					>
						<TowerGlyph geo={geo} />
						<span className="td-toolbar__label">{stats.label}</span>
						<span className="td-toolbar__cost">
							{stats.cost}g · <kbd>{i + 1}</kbd>
						</span>
					</button>
				)
			})}
		</div>
	)
}

function SelectGlyph() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
			<path
				d="M4 3 L4 15 L7.5 12 L9.7 17 L11.5 16.2 L9.3 11.2 L14 11 Z"
				fill="currentColor"
				stroke="currentColor"
				strokeWidth="1"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function TowerGlyph({ geo }: { geo: TowerGeo }) {
	const stroke = 'currentColor'
	if (geo === 'triangle') {
		return (
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
				<polygon points="10,2 18,18 2,18" fill="none" stroke={stroke} strokeWidth="2" />
			</svg>
		)
	}
	if (geo === 'rectangle') {
		return (
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
				<rect x="2" y="4" width="16" height="12" fill="none" stroke={stroke} strokeWidth="2" />
			</svg>
		)
	}
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
			<ellipse cx="10" cy="10" rx="8" ry="6" fill="none" stroke={stroke} strokeWidth="2" />
		</svg>
	)
}

function HUD() {
	const editor = useEditor()
	const score = useValue('score', () => score$.get(), [])
	const gold = useValue('gold', () => gold$.get(), [])
	const lives = useValue('lives', () => lives$.get(), [])
	const enemyCount = useValue('enemies', () => enemies$.get().length, [])
	const projectileCount = useValue('projectiles', () => projectiles$.get().length, [])
	const gameOver = useValue('gameOver', () => gameOver$.get(), [])

	const onRestart = useCallback(() => restartGame(editor), [editor])

	return (
		<div className="td-hud">
			<div className="td-hud__row">
				<span>
					Gold <strong>{gold}</strong>
				</span>
				<span>
					Score <strong>{score}</strong>
				</span>
				<span>
					Lives <strong>{lives}</strong>
				</span>
				<span>
					Enemies <strong>{enemyCount}</strong>
				</span>
				<span>
					Shots <strong>{projectileCount}</strong>
				</span>
				<button className="td-hud__btn" onClick={onRestart}>
					Restart
				</button>
			</div>
			<div className="td-hud__hint">
				Pick a tower from the toolbar (or press <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd>), then click
				the canvas to place it. Each tower costs gold; kill enemies to earn more. Magic blasts deal
				area damage. Click an enemy to chip damage for free. Press <kbd>space</kbd> to restart.
			</div>
			{gameOver && <div className="td-hud__gameover">Game over — press Restart</div>}
		</div>
	)
}

const components: Required<TLUiComponents> = {
	TopPanel: HUD,
	Toolbar: GameToolbar,
	ContextMenu: null,
	ActionsMenu: null,
	HelpMenu: null,
	ZoomMenu: null,
	MainMenu: null,
	Minimap: null,
	StylePanel: null,
	PageMenu: null,
	NavigationPanel: null,
	KeyboardShortcutsDialog: null,
	QuickActions: null,
	HelperButtons: null,
	DebugPanel: null,
	DebugMenu: null,
	SharePanel: null,
	MenuPanel: null,
	CursorChatBubble: null,
	RichTextToolbar: null,
	ImageToolbar: null,
	VideoToolbar: null,
	Dialogs: null,
	Toasts: null,
	A11y: null,
	FollowingIndicator: null,
	PeopleMenu: null,
	PeopleMenuAvatar: null,
	PeopleMenuItem: null,
	PeopleMenuFacePile: null,
	UserPresenceEditor: null,
}

function onEditorMount(editor: Editor) {
	resetGameState()
	resetSpawnTimer()
	editor.zoomToBounds(new Box(-300, 0, 1700, 700), { immediate: true })
}

// Disable the built-in double-click-to-create-text behavior — there's no text
// shape in this example and a stray double-click while clearing enemies would
// otherwise drop a text shape on the canvas.
const tldrawOptions = { createTextOnCanvasDoubleClick: false }

export default function TowerDefenseExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				overlayUtils={overlayUtils}
				components={components}
				options={tldrawOptions}
				onMount={onEditorMount}
			>
				<GameRunner />
			</Tldraw>
		</div>
	)
}

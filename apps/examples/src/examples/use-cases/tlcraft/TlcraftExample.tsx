import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Box,
	DefaultMinimap,
	DefaultNavigationPanel,
	Editor,
	TLAnyOverlayUtilConstructor,
	TLUiComponents,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	canQueueResearch,
	canQueueUpgrade,
	placeBuilding,
	queueResearch,
	queueUnit,
	queueUpgrade,
} from './building-actions'
import {
	BUILDING_CONFIG,
	BUILDING_KINDS,
	BuildingKind,
	getBuildingUpgradeLevel,
	pickTownName,
	resetTownDeck,
} from './building-config'
import { commandSelectedUnits, selectUnitsInBox } from './command'
import { resetGameLoop, runGameTick, spawnUnit } from './game-loop'
import {
	completedTechs$,
	dragSelect$,
	elapsedMs$,
	gameOver$,
	gameStarted$,
	humanResources,
	paused$,
	placingBuilding$,
	playerNations$,
	playerResources$,
	researchQueuesAtom$,
	researchTreeOpen$,
	reseedSim,
	resetGameState,
	resources$,
	selectedBuildingId$,
	selectedMapType$,
	selectedUnitIds$,
	trainQueuesAtom$,
	units$,
	upgradeQueuesAtom$,
} from './game-state'
import {
	MAP_BOUNDS,
	MAP_TYPES,
	MapTypeId,
	STARTING_WORKER_OFFSETS,
	getMapType,
	pickRandomMapType,
	seedResources,
} from './map'
import { NATIONS, NationId, getNation, pickAiNations } from './nations'
import { BuildingDecorOverlayUtil } from './overlays/BuildingDecorOverlayUtil'
import { DamageNumberOverlayUtil } from './overlays/DamageNumberOverlayUtil'
import { DragSelectOverlayUtil } from './overlays/DragSelectOverlayUtil'
import { FogOverlayUtil } from './overlays/FogOverlayUtil'
import { GroundOverlayUtil } from './overlays/GroundOverlayUtil'
import { MapOverlayUtil } from './overlays/MapOverlayUtil'
import { PlacementPreviewOverlayUtil } from './overlays/PlacementPreviewOverlayUtil'
import { ProjectileOverlayUtil } from './overlays/ProjectileOverlayUtil'
import { ResourceOverlayUtil } from './overlays/ResourceOverlayUtil'
import { TerritoryBoundaryOverlayUtil } from './overlays/TerritoryBoundaryOverlayUtil'
import { UnitOverlayUtil } from './overlays/UnitOverlayUtil'
import { HUMAN_PLAYER_ID, PLAYERS, getPlayer } from './players'
import { canTrainUnit, getUniqueUnitKindForPlayer, hasTech } from './tech'
import { TECH_CONFIG, TechId, getTechsByTier } from './tech-config'
import { UNIT_CONFIG, UnitKind } from './unit-config'
import './tlcraft.css'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	GroundOverlayUtil,
	MapOverlayUtil,
	ResourceOverlayUtil,
	BuildingDecorOverlayUtil,
	UnitOverlayUtil,
	ProjectileOverlayUtil,
	DamageNumberOverlayUtil,
	TerritoryBoundaryOverlayUtil,
	// Fog sits above all the game objects so it covers anything not currently
	// visible; UI overlays (drag-select, placement preview) sit above fog.
	FogOverlayUtil,
	DragSelectOverlayUtil,
	PlacementPreviewOverlayUtil,
]

// Camera is constrained so the viewport always stays inside the map. With
// behavior: 'inside' + baseZoom: 'fit-max', zoom can't drop below "the larger
// axis fits the viewport" and panning is clamped at the map edges.
const tldrawOptions = {
	createTextOnCanvasDoubleClick: false,
	rightClickPanning: false,
	camera: {
		zoomSteps: [1, 1.25, 1.5, 2, 3, 4, 6],
		constraints: {
			initialZoom: 'fit-max' as const,
			baseZoom: 'fit-max' as const,
			bounds: {
				x: MAP_BOUNDS.minX,
				y: MAP_BOUNDS.minY,
				w: MAP_BOUNDS.maxX - MAP_BOUNDS.minX,
				h: MAP_BOUNDS.maxY - MAP_BOUNDS.minY,
			},
			behavior: 'inside' as const,
			padding: { x: 0, y: 0 },
			origin: { x: 0.5, y: 0.5 },
		},
	},
}

function pickBuilding(kind: BuildingKind) {
	const cfg = BUILDING_CONFIG[kind]
	const r = humanResources()
	if (r.gold < cfg.cost.gold || r.wood < cfg.cost.wood || r.stone < (cfg.cost.stone ?? 0)) {
		return
	}
	placingBuilding$.set(kind)
	selectedBuildingId$.set(null)
}

// Format a cost like "200g · 80w · 100s" with the stone leg omitted when
// it's zero. Used by toolbar buttons and research tree nodes.
function formatCost(cost: { gold: number; wood: number; stone?: number }): string {
	const parts = [`${cost.gold}g`, `${cost.wood}w`]
	if (cost.stone) parts.push(`${cost.stone}s`)
	return parts.join(' · ')
}

function restartGame(editor: Editor) {
	resetGameState()
	resetGameLoop()
	resetTownDeck()
	const ids = editor.getCurrentPageShapes().map((s) => s.id)
	if (ids.length > 0) {
		editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
	}
	bootstrapStartingState(editor)
}

function bootstrapStartingState(editor: Editor) {
	// Use whichever map type the player picked in the start menu (if any);
	// fall back to the default seeder when restarting before a nation has
	// been chosen so the canvas isn't empty.
	const mapId = selectedMapType$.get()
	const mapType = mapId ? getMapType(mapId) : null
	resources$.set(mapType ? mapType.generate() : seedResources())
	for (const p of PLAYERS) {
		const id = placeBuilding(
			editor,
			'town-hall',
			p.id,
			p.startBase.x + BUILDING_CONFIG['town-hall'].size / 2,
			p.startBase.y + BUILDING_CONFIG['town-hall'].size / 2
		)
		// Starting resources can't pay for a town hall, so the regular
		// placement path returns null. We force-place via the editor directly
		// for the bootstrap; the game loop's placement check handles all
		// further builds.
		if (!id) forceCreateTownHall(editor, p)
		for (const off of STARTING_WORKER_OFFSETS) {
			spawnUnit('worker', p.startBase.x + off.dx, p.startBase.y + off.dy, p.id)
		}
	}
}

function forceCreateTownHall(editor: Editor, p: ReturnType<typeof getPlayer>) {
	const cfg = BUILDING_CONFIG['town-hall']
	editor.createShape({
		type: 'geo',
		x: p.startBase.x,
		y: p.startBase.y,
		isLocked: true,
		props: { geo: cfg.geo, w: cfg.size, h: cfg.size, color: p.buildingColor, fill: 'solid' },
		meta: {
			buildingKind: 'town-hall',
			hp: cfg.maxHp,
			maxHp: cfg.maxHp,
			owner: p.id,
			upgradeLevel: 0,
			townName: pickTownName(),
		},
	})
}

// Fixed simulation tick rate. Render keeps following the editor's tick (60Hz);
// the sim loop accumulates real elapsed ms and runs N fixed-size ticks per
// frame. Fixed dt is the determinism precondition for lockstep multiplayer —
// the simulation must produce identical state given identical inputs across
// every client, which is impossible if dt varies with browser frame timing.
const SIM_TICK_MS = 16

function GameRunner() {
	const editor = useEditor()
	useEffect(() => {
		let accumMs = 0
		const onTick = (elapsedMs: number) => {
			// Cap accumulator on tab-resume / long pause so we don't death-
			// spiral catching up after the user comes back to the tab.
			accumMs += Math.min(200, elapsedMs)
			while (accumMs >= SIM_TICK_MS) {
				runGameTick(editor, SIM_TICK_MS)
				accumMs -= SIM_TICK_MS
			}
		}
		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor])
	return null
}

function DragSelectListener() {
	const editor = useEditor()
	useEffect(() => {
		const onMove = (e: PointerEvent) => {
			const drag = dragSelect$.get()
			if (!drag) return
			const page = editor.screenToPage({ x: e.clientX, y: e.clientY })
			dragSelect$.set({ ...drag, x2: page.x, y2: page.y })
		}
		const onUp = (e: PointerEvent) => {
			const drag = dragSelect$.get()
			if (!drag) return
			const dx = drag.x2 - drag.x1
			const dy = drag.y2 - drag.y1
			const moved = dx * dx + dy * dy > 16
			dragSelect$.set(null)
			if (!moved) return
			const box = new Box(
				Math.min(drag.x1, drag.x2),
				Math.min(drag.y1, drag.y2),
				Math.abs(dx),
				Math.abs(dy)
			)
			selectUnitsInBox(box, e.shiftKey)
		}
		// Right-click commands live here because the editor's pointer pipeline
		// doesn't surface right-click as onPointerDown to overlay utils.
		const onContextMenu = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null
			if (target?.closest('.tlc-hud, .tlc-toolbar, .tlui-navigation-panel, .tlc-modal')) {
				return
			}
			e.preventDefault()
			const page = editor.screenToPage({ x: e.clientX, y: e.clientY })
			if (placingBuilding$.get()) {
				placingBuilding$.set(null)
				return
			}
			if (selectedUnitIds$.get().size > 0) {
				commandSelectedUnits(editor, { x: page.x, y: page.y })
			}
		}
		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
		window.addEventListener('contextmenu', onContextMenu)
		return () => {
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
			window.removeEventListener('contextmenu', onContextMenu)
		}
	}, [editor])
	return null
}

function KeyboardShortcuts() {
	const editor = useEditor()
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target?.matches('input, textarea, [contenteditable="true"]')) return
			// preventDefault on every key we handle so tldraw's built-in tool
			// hotkeys (1=select, 2=hand, 3=draw, R=rectangle, etc.) can't fire
			// in parallel and leave the editor in a shape-drawing state.
			if (e.key === '1') {
				e.preventDefault()
				pickBuilding('town-hall')
			} else if (e.key === '2') {
				e.preventDefault()
				pickBuilding('barracks')
			} else if (e.key === '3') {
				e.preventDefault()
				pickBuilding('tower')
			} else if (e.key === '4') {
				e.preventDefault()
				pickBuilding('library')
			} else if (e.key === '5') {
				e.preventDefault()
				pickBuilding('farm')
			} else if (e.key === '6') {
				e.preventDefault()
				pickBuilding('wall')
			} else if (e.key === '7') {
				e.preventDefault()
				pickBuilding('castle')
			} else if (e.key === 'r' || e.key === 'R') {
				e.preventDefault()
				if (gameStarted$.get()) researchTreeOpen$.update((v) => !v)
			} else if (e.key === 'Escape') {
				e.preventDefault()
				// Priority chain: cancel placement → close research tree → close
				// pause menu → clear selection → open pause menu.
				if (placingBuilding$.get()) {
					placingBuilding$.set(null)
				} else if (researchTreeOpen$.get()) {
					researchTreeOpen$.set(false)
				} else if (paused$.get()) {
					paused$.set(false)
				} else if (selectedUnitIds$.get().size > 0 || selectedBuildingId$.get() !== null) {
					selectedUnitIds$.set(new Set())
					selectedBuildingId$.set(null)
				} else if (gameStarted$.get()) {
					paused$.set(true)
				}
			} else if (e.key === ' ') {
				e.preventDefault()
				if (gameStarted$.get()) restartGame(editor)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [editor])
	return null
}

function HUD({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const r = useValue('humanResources', () => humanResources(), [])
	const unitCount = useValue(
		'unitCount',
		() => units$.get().filter((u) => u.owner === HUMAN_PLAYER_ID).length,
		[]
	)
	const allResources = useValue('all', () => playerResources$.get(), [])
	const gameOver = useValue('gameOver', () => gameOver$.get(), [])
	const nations = useValue('nations', () => playerNations$.get(), [])
	const myNationId = nations[HUMAN_PLAYER_ID] as NationId | undefined
	const nation = myNationId ? getNation(myNationId) : null
	const onRestart = useCallback(() => {
		if (editorRef.current) restartGame(editorRef.current)
	}, [editorRef])

	return (
		<div className="tlc-hud">
			<div className="tlc-hud__row">
				<span>
					Gold <strong>{r.gold}</strong>
				</span>
				<span>
					Wood <strong>{r.wood}</strong>
				</span>
				<span>
					Stone <strong>{r.stone}</strong>
				</span>
				<span>
					Pop{' '}
					<strong>
						{r.food} / {r.foodCap}
					</strong>
				</span>
				<span>
					Units <strong>{unitCount}</strong>
				</span>
				<span>
					Score <strong>{r.score}</strong>
				</span>
				{nation && (
					<span className="tlc-hud__nation">
						Playing as <strong>{nation.label}</strong>
					</span>
				)}
				<button className="tlc-hud__btn" onClick={onRestart}>
					Restart
				</button>
			</div>
			<div className="tlc-hud__row tlc-hud__scoreboard">
				{PLAYERS.map((p) => {
					const nationId = nations[p.id] as NationId | undefined
					const label = nationId ? `${p.label} (${getNation(nationId).label})` : p.label
					return (
						<span key={p.id} className="tlc-hud__player" style={{ color: p.minimapColor }}>
							{label}: <strong>{allResources[p.id]?.score ?? 0}</strong>
						</span>
					)
				})}
			</div>
			<div className="tlc-hud__hint">
				Left-click or drag to select units. Right-click to move, attack, or gather. Build with the
				toolbar (or <kbd>1</kbd>–<kbd>5</kbd>). Click a Library or press <kbd>R</kbd> for research.{' '}
				<kbd>Esc</kbd> for the pause menu.
			</div>
			{gameOver && (
				<div
					className={
						gameOver.winnerId === HUMAN_PLAYER_ID ? 'tlc-hud__victory' : 'tlc-hud__gameover'
					}
				>
					{gameOver.winnerId === HUMAN_PLAYER_ID
						? 'You won — last town hall standing.'
						: `${getPlayer(gameOver.winnerId).label} wins — press Restart.`}
				</div>
			)}
		</div>
	)
}

function Toolbar({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const placing = useValue('placing', () => placingBuilding$.get(), [])
	const selectedBuilding = useValue('selectedBuilding', () => selectedBuildingId$.get(), [])
	const r = useValue('humanResources', () => humanResources(), [])
	const queues = useValue('queues', () => trainQueuesAtom$.get(), [])
	useValue('completedTechs', () => completedTechs$.get(), [])
	useValue('nations', () => playerNations$.get(), [])
	useValue('upgrade-queues', () => upgradeQueuesAtom$.get(), [])

	const editor = editorRef.current
	const selectedShape = editor && selectedBuilding ? editor.getShape(selectedBuilding) : null
	const selectedKind = selectedShape?.meta?.buildingKind as BuildingKind | undefined
	const selectedCfg = selectedKind ? BUILDING_CONFIG[selectedKind] : null
	const selectedOwner = selectedShape?.meta?.owner as string | undefined
	const isOwnBuilding = selectedOwner === HUMAN_PLAYER_ID
	const selectedLevel = selectedShape ? getBuildingUpgradeLevel(selectedShape) : 0
	const uniqueUnit = getUniqueUnitKindForPlayer(HUMAN_PLAYER_ID)
	const upgradeOutcome =
		editor && selectedBuilding && isOwnBuilding
			? canQueueUpgrade(selectedBuilding, editor, HUMAN_PLAYER_ID)
			: 'no-upgrade'

	// Compose the train list for the selected building. Barracks include the
	// nation's unique unit, gated by canTrainUnit (which checks the signature
	// tech).
	const trainList: UnitKind[] = selectedCfg ? selectedCfg.trains.slice() : []
	if (selectedKind === 'barracks' && uniqueUnit && !trainList.includes(uniqueUnit)) {
		trainList.push(uniqueUnit)
	}

	return (
		<div className="tlc-toolbar">
			<div className="tlc-toolbar__group">
				<span className="tlc-toolbar__group-label">Build</span>
				{BUILDING_KINDS.map((kind) => {
					const cfg = BUILDING_CONFIG[kind]
					const canAfford =
						r.gold >= cfg.cost.gold && r.wood >= cfg.cost.wood && r.stone >= (cfg.cost.stone ?? 0)
					const isActive = placing === kind
					return (
						<button
							key={kind}
							className={'tlc-toolbar__btn' + (isActive ? ' is-active' : '')}
							disabled={!canAfford && !isActive}
							onClick={() => pickBuilding(kind)}
							title={`${cfg.label} — ${formatCost(cfg.cost)} — press ${cfg.keyHint}`}
						>
							<BuildGlyph kind={kind} />
							<span className="tlc-toolbar__label">{cfg.label}</span>
							<span className="tlc-toolbar__cost">
								{formatCost(cfg.cost)} · <kbd>{cfg.keyHint}</kbd>
							</span>
						</button>
					)
				})}
			</div>
			{selectedCfg && selectedBuilding && isOwnBuilding && trainList.length > 0 && (
				<div className="tlc-toolbar__group">
					<span className="tlc-toolbar__group-label">Train ({selectedCfg.label})</span>
					{trainList.map((unitKind) => {
						const cfg = UNIT_CONFIG[unitKind]
						const locked = !canTrainUnit(HUMAN_PLAYER_ID, unitKind)
						const canAfford =
							!locked &&
							r.gold >= cfg.trainCost.gold &&
							r.wood >= cfg.trainCost.wood &&
							r.food + cfg.trainCost.food <= r.foodCap
						const lockReason = locked
							? unitKind === 'knight'
								? ' — research Cavalry training in the Library.'
								: ' — research the signature tech of your nation in the Library.'
							: ''
						const title = `${cfg.label} — ${cfg.trainCost.gold}g · ${cfg.trainCost.wood}w · ${cfg.trainCost.food} pop${lockReason}`
						return (
							<button
								key={unitKind}
								className="tlc-toolbar__btn"
								disabled={!canAfford}
								onClick={() => queueUnit(selectedBuilding, unitKind, HUMAN_PLAYER_ID)}
								title={title}
							>
								<UnitGlyph kind={unitKind} />
								<span className="tlc-toolbar__label">
									{cfg.label}
									{locked ? ' 🔒' : ''}
								</span>
								<span className="tlc-toolbar__cost">
									{cfg.trainCost.gold}g · {cfg.trainCost.wood}w · {cfg.trainCost.food}p
								</span>
							</button>
						)
					})}
					<span className="tlc-toolbar__cost">
						queue: {(queues[selectedBuilding as unknown as string] ?? []).length}
					</span>
				</div>
			)}
			{selectedKind === 'library' && isOwnBuilding && (
				<div className="tlc-toolbar__group">
					<span className="tlc-toolbar__group-label">Library</span>
					<button
						className="tlc-toolbar__btn"
						onClick={() => researchTreeOpen$.set(true)}
						title="Open the full research tree (R)"
					>
						<span className="tlc-toolbar__label">Open research</span>
						<span className="tlc-toolbar__cost">
							<kbd>R</kbd>
						</span>
					</button>
				</div>
			)}
			{selectedCfg && selectedBuilding && isOwnBuilding && selectedCfg.upgrade && (
				<div className="tlc-toolbar__group">
					<span className="tlc-toolbar__group-label">Upgrade</span>
					<button
						className="tlc-toolbar__btn"
						disabled={upgradeOutcome !== 'queued'}
						onClick={() => {
							if (!editor) return
							queueUpgrade(selectedBuilding, editor, HUMAN_PLAYER_ID)
						}}
						title={upgradeHintFor(upgradeOutcome, selectedCfg.upgrade)}
					>
						<span className="tlc-toolbar__label">→ {selectedCfg.upgrade.label}</span>
						<span className="tlc-toolbar__cost">
							{upgradeOutcome === 'queued'
								? formatCost(selectedCfg.upgrade.cost)
								: upgradeShortStatus(upgradeOutcome, selectedLevel)}
						</span>
					</button>
				</div>
			)}
		</div>
	)
}

function upgradeHintFor(
	outcome: ReturnType<typeof canQueueUpgrade>,
	upgrade: { label: string; cost: { gold: number; wood: number }; durationMs: number }
): string {
	switch (outcome) {
		case 'queued':
			return `Upgrade to ${upgrade.label} — ${formatCost(upgrade.cost)} · ${Math.round(upgrade.durationMs / 1000)}s`
		case 'already-upgraded':
			return 'Already upgraded'
		case 'already-in-progress':
			return 'Upgrade already in progress'
		case 'cant-afford':
			return `Need ${formatCost(upgrade.cost)}`
		case 'no-upgrade':
		case 'wrong-owner':
			return 'No upgrade available'
	}
}

function upgradeShortStatus(outcome: ReturnType<typeof canQueueUpgrade>, level: number): string {
	if (outcome === 'already-upgraded') return `lvl ${level}`
	if (outcome === 'already-in-progress') return 'in progress'
	if (outcome === 'cant-afford') return 'too costly'
	return ''
}

function BuildGlyph({ kind }: { kind: BuildingKind }) {
	const cfg = BUILDING_CONFIG[kind]
	if (cfg.geo === 'triangle') {
		return (
			<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
				<polygon
					points="10,3 17,17 3,17"
					fill="currentColor"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
			</svg>
		)
	}
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
			<rect
				x="3"
				y="3"
				width="14"
				height="14"
				fill="currentColor"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
		</svg>
	)
}

function UnitGlyph({ kind }: { kind: UnitKind }) {
	const human = getPlayer(HUMAN_PLAYER_ID)
	const glyph = UNIT_CONFIG[kind].glyph
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
			<circle
				cx="10"
				cy="10"
				r="7"
				fill={human.bodyColor}
				stroke={human.ringColor}
				strokeWidth="1.5"
			/>
			<text
				x="10"
				y="11"
				textAnchor="middle"
				dominantBaseline="middle"
				fontSize="8"
				fontWeight="700"
				fill="#fff"
			>
				{glyph}
			</text>
		</svg>
	)
}

// Nation accent colours used to outline the picked card and its swatch in
// the start menu. Kept as a separate map so the visual identity matches the
// in-game player colour without coupling the component file to player IDs.
const NATION_ACCENTS: Record<NationId, string> = {
	solari: '#3b82f6',
	crimson: '#ef4444',
	mystic: '#a855f7',
	'sun-tribe': '#f97316',
}

// ----------------------------- Start menu --------------------------------

function StartMenu({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const started = useValue('gameStarted', () => gameStarted$.get(), [])
	const [selected, setSelected] = useState<NationId>('solari')
	// 'random' picks a different map every time you click Start.
	const [selectedMap, setSelectedMap] = useState<MapTypeId | 'random'>('random')

	const onStart = useCallback(() => {
		// Fresh seed for the match. After this point, EVERY random call in
		// the simulation goes through the seeded PRNG (see random.ts), so
		// the same seed → the same match. In multiplayer the host will pick
		// the seed and broadcast it via a synced record; the same `reseedSim`
		// call applies it on every client.
		reseedSim()

		const aiNations = pickAiNations(selected)
		const map: Record<string, NationId> = { [HUMAN_PLAYER_ID]: selected }
		const aiPlayers = PLAYERS.filter((p) => !p.isHuman)
		for (let i = 0; i < aiPlayers.length; i++) {
			map[aiPlayers[i].id] = aiNations[i] ?? aiNations[0]
		}
		playerNations$.set(map)
		// Resolve "random" lazily so each Restart that picks random rerolls.
		const mapId: MapTypeId = selectedMap === 'random' ? pickRandomMapType().id : selectedMap
		selectedMapType$.set(mapId)
		// Re-seed the resources for the chosen map BEFORE the game tick starts,
		// since the editor was already bootstrapped in onMount with the default
		// seed.
		const editor = editorRef.current
		if (editor) {
			resources$.set(getMapType(mapId).generate())
		}
		gameStarted$.set(true)
		if (editor) {
			const human = PLAYERS.find((p) => p.id === HUMAN_PLAYER_ID)!
			editor.zoomToBounds(new Box(human.startBase.x - 200, human.startBase.y - 200, 1600, 1100), {
				immediate: true,
			})
		}
	}, [selected, selectedMap, editorRef])

	if (started) return null

	return (
		<div className="tlc-modal tlc-modal--center" role="dialog" aria-modal="true">
			<div className="tlc-modal__panel tlc-start">
				<header className="tlc-modal__header">
					<h2>Choose your nation</h2>
					<span className="tlc-modal__hint">Pick once — you can’t switch mid-match</span>
				</header>
				<div className="tlc-start__grid">
					{NATIONS.map((n) => {
						const isPicked = selected === n.id
						const accent = NATION_ACCENTS[n.id]
						return (
							<button
								key={n.id}
								type="button"
								className={'tlc-start__card' + (isPicked ? ' is-active' : '')}
								style={{ ['--tlc-accent' as never]: accent }}
								onClick={() => setSelected(n.id)}
								aria-pressed={isPicked}
							>
								<div className="tlc-start__card-head">
									<span className="tlc-start__swatch" aria-hidden />
									<div className="tlc-start__title">{n.label}</div>
									{isPicked && (
										<span className="tlc-start__check" aria-hidden>
											✓
										</span>
									)}
								</div>
								<div className="tlc-start__tag">{n.tagline}</div>
								<div className="tlc-start__desc">{n.description}</div>
								<div className="tlc-start__perk">
									Unique unit: <strong>{UNIT_CONFIG[n.uniqueUnit].label}</strong>
								</div>
							</button>
						)
					})}
				</div>
				<div className="tlc-start__maps">
					<div className="tlc-start__maps-label">Map</div>
					<div className="tlc-start__maps-row">
						<button
							type="button"
							className={'tlc-start__map' + (selectedMap === 'random' ? ' is-active' : '')}
							onClick={() => setSelectedMap('random')}
						>
							<strong>🎲 Random</strong>
							<span>Surprise me</span>
						</button>
						{MAP_TYPES.map((m) => (
							<button
								key={m.id}
								type="button"
								className={'tlc-start__map' + (selectedMap === m.id ? ' is-active' : '')}
								onClick={() => setSelectedMap(m.id)}
								title={m.description}
							>
								<strong>{m.label}</strong>
								<span>{m.description}</span>
							</button>
						))}
					</div>
				</div>
				<footer className="tlc-modal__footer">
					<span className="tlc-modal__hint">
						Three AI opponents will be assigned the remaining nations randomly.
					</span>
					<button className="tlc-modal__btn tlc-modal__btn--primary" onClick={onStart}>
						Start match — play as {getNation(selected).label}
					</button>
				</footer>
			</div>
		</div>
	)
}

// ---------------------------- Research tree ------------------------------

// Layout: 3 columns by tier, vertical slot per tech inside the column.
// Coordinates are in node units (each node ~ 220x110 with a 30px gap).
const TECH_LAYOUT: Record<TechId, { col: 0 | 1 | 2; row: number }> = {
	'sharp-blades': { col: 0, row: 0 },
	'tools-of-the-trade': { col: 0, row: 4 },
	'heavy-armor': { col: 1, row: 0 },
	'cavalry-training': { col: 1, row: 2 },
	'reinforced-walls': { col: 1, row: 4 },
	'tower-marksmanship': { col: 2, row: 0 },
	'holy-orders': { col: 2, row: 1 },
	'blood-frenzy': { col: 2, row: 2 },
	'champions-path': { col: 2, row: 3 },
	'arcane-studies': { col: 2, row: 4 },
	stonemasonry: { col: 2, row: 5 },
}

const NODE_W = 240
const NODE_H = 96
const COL_GAP = 80
const ROW_GAP = 14

function nodeRect(techId: TechId) {
	const { col, row } = TECH_LAYOUT[techId]
	return {
		x: col * (NODE_W + COL_GAP),
		y: row * (NODE_H + ROW_GAP),
		w: NODE_W,
		h: NODE_H,
	}
}

function ResearchTreeOverlay({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const open = useValue('researchTreeOpen', () => researchTreeOpen$.get(), [])
	const completed = useValue('completedTechs', () => completedTechs$.get(), [])
	const queues = useValue('research-queues', () => researchQueuesAtom$.get(), [])
	const now = useValue('elapsed', () => elapsedMs$.get(), [])
	const r = useValue('humanResources', () => humanResources(), [])
	useValue('nations', () => playerNations$.get(), [])

	if (!open) return null

	const editor = editorRef.current

	// Find the human's library to use for queueing research.
	const humanLibrary =
		editor &&
		editor
			.getCurrentPageShapes()
			.find((s) => s.meta?.buildingKind === 'library' && s.meta?.owner === HUMAN_PLAYER_ID)

	// Build a map of techId → progress (0..1) for the human's libraries by
	// looking at the head of each queue. We only show progress for the head
	// since later items don't have a meaningful elapsed time yet.
	const techProgress = new Map<TechId, number>()
	if (editor) {
		for (const shape of editor.getCurrentPageShapes()) {
			if (shape.meta?.buildingKind !== 'library') continue
			if (shape.meta?.owner !== HUMAN_PLAYER_ID) continue
			const queue = queues[shape.id as unknown as string] ?? []
			const head = queue[0]
			if (!head) continue
			const p = Math.max(0, Math.min(1, (now - head.startedAtMs) / head.durationMs))
			techProgress.set(head.techId as TechId, p)
		}
	}

	const tier1 = getTechsByTier(1)
	const tier2 = getTechsByTier(2)
	const tier3 = getTechsByTier(3)
	const allTechs = [...tier1, ...tier2, ...tier3]

	const completedSet = completed[HUMAN_PLAYER_ID] ?? new Set<TechId>()

	const totalCols = 3
	const maxRows = Math.max(...allTechs.map((t) => TECH_LAYOUT[t].row + 1))
	const treeW = totalCols * NODE_W + (totalCols - 1) * COL_GAP
	const treeH = maxRows * NODE_H + (maxRows - 1) * ROW_GAP

	return (
		<div className="tlc-modal tlc-modal--center" role="dialog" aria-modal="true">
			<div className="tlc-modal__panel tlc-research">
				<header className="tlc-modal__header">
					<h2>Research tree</h2>
					<span className="tlc-modal__hint">
						<kbd>R</kbd> or <kbd>Esc</kbd> to close · costs gold + wood, plays out at the selected
						library
					</span>
				</header>
				<div className="tlc-research__viewport">
					<div className="tlc-research__canvas" style={{ width: treeW, height: treeH }}>
						<svg
							className="tlc-research__edges"
							width={treeW}
							height={treeH}
							viewBox={`0 0 ${treeW} ${treeH}`}
						>
							{allTechs.flatMap((techId) => {
								const cfg = TECH_CONFIG[techId]
								const to = nodeRect(techId)
								return cfg.prereqs.map((preId) => {
									const from = nodeRect(preId)
									const x1 = from.x + from.w
									const y1 = from.y + from.h / 2
									const x2 = to.x
									const y2 = to.y + to.h / 2
									const mid = (x1 + x2) / 2
									const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
									const done = completedSet.has(preId)
									return (
										<path
											key={`${preId}->${techId}`}
											d={path}
											fill="none"
											stroke={done ? '#3b82f6' : '#8888'}
											strokeWidth={done ? 2.5 : 1.5}
											strokeDasharray={done ? '' : '4 4'}
										/>
									)
								})
							})}
						</svg>
						{allTechs.map((techId) => {
							const cfg = TECH_CONFIG[techId]
							const rect = nodeRect(techId)
							const status = computeTechStatus(techId, editor, completedSet, r)
							const progress = techProgress.get(techId) ?? null
							const onClick = () => {
								if (!editor || !humanLibrary) return
								if (status.kind !== 'available') return
								queueResearch(editor, humanLibrary.id, techId, HUMAN_PLAYER_ID)
							}
							const statusLabel =
								progress !== null && status.kind === 'in-progress'
									? `${Math.round(progress * 100)}%`
									: status.label
							return (
								<div
									key={techId}
									className={`tlc-research__node tlc-research__node--${status.kind}`}
									style={{
										left: rect.x,
										top: rect.y,
										width: rect.w,
										height: rect.h,
									}}
								>
									<div className="tlc-research__node-title">
										{cfg.label}
										{cfg.requiredNation && (
											<span className="tlc-research__nation-tag">
												{getNation(cfg.requiredNation).label}
											</span>
										)}
									</div>
									<div className="tlc-research__node-desc">{cfg.description}</div>
									<div className="tlc-research__node-meta">
										<span>{formatCost(cfg.cost)}</span>
										<span>·</span>
										<span>{Math.round(cfg.researchMs / 1000)}s</span>
									</div>
									<div className="tlc-research__node-status">{statusLabel}</div>
									{progress !== null && (
										<div className="tlc-research__progress">
											<div
												className="tlc-research__progress-fill"
												style={{ width: `${Math.round(progress * 100)}%` }}
											/>
										</div>
									)}
									{status.kind === 'available' && (
										<button
											className="tlc-research__node-btn"
											onClick={onClick}
											disabled={!humanLibrary}
											title={humanLibrary ? 'Queue research' : 'Build a library first'}
										>
											Research
										</button>
									)}
								</div>
							)
						})}
					</div>
				</div>
				<footer className="tlc-modal__footer">
					<span className="tlc-modal__hint">
						Need a library to queue research. Mystic researches 25% faster.
					</span>
					<button
						className="tlc-modal__btn tlc-modal__btn--primary"
						onClick={() => researchTreeOpen$.set(false)}
					>
						Close
					</button>
				</footer>
			</div>
		</div>
	)
}

interface TechStatus {
	kind: 'done' | 'in-progress' | 'available' | 'locked' | 'unaffordable' | 'wrong-nation'
	label: string
}

function computeTechStatus(
	techId: TechId,
	editor: Editor | null,
	completedSet: ReadonlySet<TechId>,
	r: ReturnType<typeof humanResources>
): TechStatus {
	if (completedSet.has(techId)) return { kind: 'done', label: '✓ researched' }
	if (!editor) {
		return { kind: 'locked', label: 'starting…' }
	}
	const outcome = canQueueResearch(editor, techId, HUMAN_PLAYER_ID)
	if (outcome === 'queued') {
		return {
			kind: 'available',
			label: hasTech(HUMAN_PLAYER_ID, techId) ? '' : 'available',
		}
	}
	if (outcome === 'already-completed') return { kind: 'done', label: '✓ researched' }
	if (outcome === 'already-in-progress') return { kind: 'in-progress', label: 'in progress' }
	if (outcome === 'cant-afford') {
		const cfg = TECH_CONFIG[techId]
		const need: string[] = []
		if (r.gold < cfg.cost.gold) need.push(`${cfg.cost.gold - r.gold}g`)
		if (r.wood < cfg.cost.wood) need.push(`${cfg.cost.wood - r.wood}w`)
		const stoneCost = cfg.cost.stone ?? 0
		if (r.stone < stoneCost) need.push(`${stoneCost - r.stone}s`)
		return { kind: 'unaffordable', label: `need ${need.join(', ')}` }
	}
	if (outcome === 'requires-prereq') return { kind: 'locked', label: 'needs prereq' }
	if (outcome === 'requires-barracks') return { kind: 'locked', label: 'needs barracks' }
	if (outcome === 'wrong-nation') {
		const cfg = TECH_CONFIG[techId]
		const nation = cfg.requiredNation ? getNation(cfg.requiredNation).label : ''
		return { kind: 'wrong-nation', label: `${nation} only` }
	}
	return { kind: 'locked', label: '' }
}

// ------------------------------- Pause menu ------------------------------

type GuideTab = 'buildings' | 'units' | 'research' | 'controls'

const BUILDING_DESCRIPTIONS: Record<BuildingKind, string> = {
	'town-hall':
		'Your home base. Trains workers and is where workers drop off gold and wood. Provides 8 population. Lose this and you lose the game.',
	barracks:
		'Trains soldiers and knights (and your nation’s unique unit once researched). Adds 4 population. Build near the front line.',
	tower:
		'Auto-attacks any enemy unit that strays into range. Cheap and sturdy. Tower marksmanship extends its range.',
	library:
		'Hosts the research tree — every passive, every unique-unit unlock. Click one to open the full tree (or press R).',
	farm: 'The cheapest way to raise your population cap (+4 each). Doesn’t train anything; tuck them behind a barracks.',
	wall: 'Cheap territorial extension. Low HP and no attack — chain them to push your border outward without paying for a full tower.',
	castle:
		'Heavy fortification with an area attack and the largest territory of any building. Locked behind the Stonemasonry research.',
}

function PauseMenu({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const isPaused = useValue('paused', () => paused$.get(), [])
	const [tab, setTab] = useState<GuideTab>('buildings')
	const onResume = useCallback(() => paused$.set(false), [])
	const onRestart = useCallback(() => {
		paused$.set(false)
		if (editorRef.current) restartGame(editorRef.current)
	}, [editorRef])
	if (!isPaused) return null
	return (
		<div className="tlc-modal tlc-modal--center" role="dialog" aria-modal="true">
			<div className="tlc-modal__panel tlc-pause">
				<header className="tlc-modal__header">
					<h2>Paused</h2>
					<span className="tlc-modal__hint">
						Press <kbd>Esc</kbd> to resume
					</span>
				</header>
				<nav className="tlc-pause__tabs" aria-label="Guide sections">
					<TabButton tab="buildings" current={tab} onSelect={setTab}>
						Buildings
					</TabButton>
					<TabButton tab="units" current={tab} onSelect={setTab}>
						Units
					</TabButton>
					<TabButton tab="research" current={tab} onSelect={setTab}>
						Research
					</TabButton>
					<TabButton tab="controls" current={tab} onSelect={setTab}>
						Controls
					</TabButton>
				</nav>
				<div className="tlc-pause__content">
					{tab === 'buildings' && <BuildingsGuide />}
					{tab === 'units' && <UnitsGuide />}
					{tab === 'research' && <ResearchGuide />}
					{tab === 'controls' && <ControlsGuide />}
				</div>
				<footer className="tlc-modal__footer">
					<button className="tlc-modal__btn" onClick={onRestart}>
						Restart
					</button>
					<button className="tlc-modal__btn tlc-modal__btn--primary" onClick={onResume}>
						Resume
					</button>
				</footer>
			</div>
		</div>
	)
}

function TabButton({
	tab,
	current,
	onSelect,
	children,
}: {
	tab: GuideTab
	current: GuideTab
	onSelect(t: GuideTab): void
	children: React.ReactNode
}) {
	return (
		<button
			className={'tlc-pause__tab' + (tab === current ? ' is-active' : '')}
			onClick={() => onSelect(tab)}
		>
			{children}
		</button>
	)
}

function BuildingsGuide() {
	return (
		<table className="tlc-guide__table">
			<thead>
				<tr>
					<th>Building</th>
					<th>Cost</th>
					<th>HP</th>
					<th>Pop</th>
					<th>What it does</th>
				</tr>
			</thead>
			<tbody>
				{BUILDING_KINDS.map((kind) => {
					const cfg = BUILDING_CONFIG[kind]
					return (
						<tr key={kind}>
							<td>
								<strong>{cfg.label}</strong>
								<span className="tlc-guide__sub">key {cfg.keyHint}</span>
							</td>
							<td>{formatCost(cfg.cost)}</td>
							<td>{cfg.maxHp}</td>
							<td>{cfg.foodCapacity > 0 ? `+${cfg.foodCapacity}` : '—'}</td>
							<td>{BUILDING_DESCRIPTIONS[kind]}</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}

const UNIT_DESCRIPTIONS: Record<UnitKind, string> = {
	worker:
		'Harvests wood and gold. Drops off at any town hall. Weak in combat — keep them clear of fights.',
	soldier: 'Mainline melee infantry. Affordable HP and damage.',
	knight: 'Heavy cavalry. Locked behind Cavalry training at the Library.',
	paladin: 'Solari unique. Tankiest melee in the game; locked behind Holy orders.',
	berserker: 'Crimson unique. Fast, hard-hitting raider; locked behind Blood frenzy.',
	sorcerer: 'Mystic unique. Long-range magical attacker; locked behind Arcane studies.',
	champion: 'Sun Tribe unique. Elite all-rounder; locked behind Champion’s path.',
}

function UnitsGuide() {
	return (
		<table className="tlc-guide__table">
			<thead>
				<tr>
					<th>Unit</th>
					<th>Cost</th>
					<th>HP</th>
					<th>Damage</th>
					<th>Speed</th>
					<th>Notes</th>
				</tr>
			</thead>
			<tbody>
				{(Object.keys(UNIT_CONFIG) as UnitKind[]).map((kind) => {
					const cfg = UNIT_CONFIG[kind]
					return (
						<tr key={kind}>
							<td>
								<strong>{cfg.label}</strong>
							</td>
							<td>
								{cfg.trainCost.gold}g · {cfg.trainCost.wood}w · {cfg.trainCost.food}p
							</td>
							<td>{cfg.maxHp}</td>
							<td>{cfg.attackDamage}</td>
							<td>{cfg.speed}</td>
							<td>{UNIT_DESCRIPTIONS[kind]}</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}

function ResearchGuide() {
	return (
		<table className="tlc-guide__table">
			<thead>
				<tr>
					<th>Tech</th>
					<th>Cost</th>
					<th>Time</th>
					<th>Effect</th>
				</tr>
			</thead>
			<tbody>
				{(Object.keys(TECH_CONFIG) as TechId[]).map((id) => {
					const t = TECH_CONFIG[id]
					return (
						<tr key={id}>
							<td>
								<strong>{t.label}</strong>
								{t.requiredNation && (
									<span className="tlc-guide__sub">{getNation(t.requiredNation).label} only</span>
								)}
							</td>
							<td>{formatCost(t.cost)}</td>
							<td>{Math.round(t.researchMs / 1000)}s</td>
							<td>{t.description}</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	)
}

function ControlsGuide() {
	return (
		<dl className="tlc-guide__keys">
			<dt>
				<kbd>Left-click</kbd>
			</dt>
			<dd>
				Select a unit (with <kbd>shift</kbd> to add) or a building. Click an enemy with units
				selected to attack-move.
			</dd>
			<dt>
				<kbd>Click + drag</kbd>
			</dt>
			<dd>Box-select all of your units inside the box.</dd>
			<dt>
				<kbd>Right-click</kbd>
			</dt>
			<dd>
				Issue a command to the selected units: move, attack an enemy, or gather a tree / mine.
			</dd>
			<dt>
				<kbd>1</kbd>–<kbd>5</kbd>
			</dt>
			<dd>Arm a building for placement: town hall, barracks, tower, library, farm.</dd>
			<dt>
				<kbd>R</kbd>
			</dt>
			<dd>Toggle the research tree.</dd>
			<dt>
				<kbd>Esc</kbd>
			</dt>
			<dd>
				Cancels placement, then closes any open modal, then clears selection, then opens the pause
				menu.
			</dd>
			<dt>
				<kbd>Space</kbd>
			</dt>
			<dd>Restart the match.</dd>
			<dt>Minimap</dt>
			<dd>
				Use the chevron in the bottom-right navigation panel to expand it. Click the minimap to
				recenter the camera.
			</dd>
		</dl>
	)
}

const components: Required<TLUiComponents> = {
	// HUD and Toolbar are rendered as siblings of <Tldraw/>, not as TopPanel /
	// Toolbar slots, so they don't overlay the canvas — see TlcraftExample.
	TopPanel: null,
	Toolbar: null,
	Minimap: DefaultMinimap,
	NavigationPanel: DefaultNavigationPanel,
	ContextMenu: null,
	ActionsMenu: null,
	HelpMenu: null,
	ZoomMenu: null,
	MainMenu: null,
	StylePanel: null,
	PageMenu: null,
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
	resetGameLoop()
	bootstrapStartingState(editor)
	const human = PLAYERS.find((p) => p.id === HUMAN_PLAYER_ID)!
	editor.zoomToBounds(new Box(human.startBase.x - 200, human.startBase.y - 200, 1600, 1100), {
		immediate: true,
	})
	// Defense-in-depth against the player accidentally creating a rogue
	// rectangle/draw/etc. on the canvas: any shape that isn't tagged as one
	// of our buildings is deleted on the next microtask. We use after-create
	// (not before-create) because the editor still wants to commit the shape
	// for transaction bookkeeping; deleting on the next tick is enough to
	// keep the canvas clean visually.
	editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
		if (shape.meta?.buildingKind) return
		queueMicrotask(() => {
			editor.run(() => editor.deleteShape(shape.id), { ignoreShapeLock: true })
		})
	})
}

export default function TlcraftExample() {
	const editorRef = useRef<Editor | null>(null)
	const onMount = useCallback((editor: Editor) => {
		editorRef.current = editor
		onEditorMount(editor)
	}, [])
	return (
		<div className="tlc-game-shell">
			<HUD editorRef={editorRef} />
			<div className="tldraw__editor tlc-game-root">
				<Tldraw
					overlayUtils={overlayUtils}
					components={components}
					options={tldrawOptions}
					onMount={onMount}
				>
					<GameRunner />
					<DragSelectListener />
					<KeyboardShortcuts />
				</Tldraw>
			</div>
			<Toolbar editorRef={editorRef} />
			{/*
			 * Modals render as siblings of the editor / HUD / toolbar so they
			 * cover the whole shell and don't get clipped to the canvas area.
			 * Each takes editorRef so they can dispatch editor commands.
			 */}
			<PauseMenu editorRef={editorRef} />
			<StartMenu editorRef={editorRef} />
			<ResearchTreeOverlay editorRef={editorRef} />
		</div>
	)
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { AGES, AgeId, getAge } from './age-config'
import {
	canQueueAgeAdvance,
	canQueueResearch,
	canQueueUpgrade,
	placeBuilding,
	queueAgeAdvance,
	queueResearch,
	queueUnit,
	queueUpgrade,
	toggleGate,
} from './building-actions'
import {
	BUILDING_CONFIG,
	BUILDING_KINDS,
	BuildingKind,
	getBuildingGateOpen,
	getBuildingUpgradeLevel,
	pickTownName,
	resetTownDeck,
} from './building-config'
import { commandSelectedUnits, selectUnitsInBox } from './command'
import {
	acceptPeace,
	declareWar,
	declinePeace,
	diplomacyProposals$,
	getRelation,
	proposePeace,
} from './diplomacy'
import { resizeFogGrids } from './fog'
import { resetGameLoop, runGameTick, spawnUnit } from './game-loop'
import {
	ageResearchByPlayer$,
	completedTechs$,
	dragSelect$,
	elapsedMs$,
	gameOver$,
	gameStarted$,
	humanResources,
	paused$,
	aiDifficulty$,
	attackMoveArmed$,
	placingBuilding$,
	playerAges$,
	playerNations$,
	playerResources$,
	researchQueuesAtom$,
	researchTreeOpen$,
	reseedSim,
	resetGameState,
	resources$,
	selectedBuildingId$,
	selectedMapSize$,
	selectedMapType$,
	selectedUnitIds$,
	trainQueuesAtom$,
	units$,
	upgradeQueuesAtom$,
} from './game-state'
import {
	MAP_BOUNDS,
	MAP_SIZES,
	MAP_TYPES,
	MapSizeId,
	MapTypeId,
	PLAYER_SPAWNS,
	STARTING_WORKER_OFFSETS,
	applyMapSize,
	getMapSize,
	getMapType,
	pickRandomMapType,
	seedResources,
} from './map'
import { NATIONS, NationId, getNation, pickAiNations } from './nations'
import { rebuildNav, resizeNav } from './nav'
import { BuildingDecorOverlayUtil } from './overlays/BuildingDecorOverlayUtil'
import { DamageNumberOverlayUtil } from './overlays/DamageNumberOverlayUtil'
import { DragSelectOverlayUtil } from './overlays/DragSelectOverlayUtil'
import { FogOverlayUtil } from './overlays/FogOverlayUtil'
import { GroundOverlayUtil } from './overlays/GroundOverlayUtil'
import { MapOverlayUtil } from './overlays/MapOverlayUtil'
import { PlacementPreviewOverlayUtil } from './overlays/PlacementPreviewOverlayUtil'
import { ProjectileOverlayUtil } from './overlays/ProjectileOverlayUtil'
import { ResourceOverlayUtil } from './overlays/ResourceOverlayUtil'
import { TerrainOverlayUtil } from './overlays/TerrainOverlayUtil'
import { TerritoryBoundaryOverlayUtil } from './overlays/TerritoryBoundaryOverlayUtil'
import { UnitOverlayUtil } from './overlays/UnitOverlayUtil'
import { HUMAN_PLAYER_ID, PLAYERS, PlayerId, getPlayer, updatePlayerStartBases } from './players'
import { SaveSlotInfo, deleteSave, listSaves, loadGame, saveGame } from './save'
import { canTrainUnit, getUniqueUnitKindForPlayer, hasTech } from './tech'
import { LIBRARY_TECH_IDS, TECH_CONFIG, TechId, getTechsByTier } from './tech-config'
import { bumpTerrainVersion, resetTerrain, resizeTerrainGrid } from './terrain'
import { UNIT_CONFIG, UnitKind } from './unit-config'
import './tlcraft.css'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	GroundOverlayUtil,
	MapOverlayUtil,
	TerrainOverlayUtil,
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

// Apply the picked map size to MAP_BOUNDS + fog grids + player corners and
// push the new bounds onto the editor's camera constraints so the player
// can't pan into the void. Idempotent — safe to call when the size hasn't
// changed.
function applyMapSettings(editor: Editor, sizeId: MapSizeId) {
	const size = getMapSize(sizeId)
	applyMapSize(size)
	resizeFogGrids()
	resizeTerrainGrid()
	resizeNav()
	updatePlayerStartBases(PLAYER_SPAWNS)
	const existing = editor.getCameraOptions()
	const constraints = existing.constraints
	if (!constraints) return
	editor.setCameraOptions({
		constraints: {
			...constraints,
			bounds: { x: MAP_BOUNDS.minX, y: MAP_BOUNDS.minY, w: size.width, h: size.height },
		},
	})
}

function restartGame(editor: Editor) {
	// Restart preserves the player's nation / map / size pick — they meant
	// "give me a fresh match with these settings", not "kick me back to the
	// menu". Snapshot before reset and re-apply after.
	const prior = {
		nations: playerNations$.get(),
		mapType: selectedMapType$.get(),
		mapSize: selectedMapSize$.get(),
		started: gameStarted$.get(),
	}
	resetGameState()
	resetGameLoop()
	resetTownDeck()
	applyMapSettings(editor, prior.mapSize)
	if (prior.started) {
		playerNations$.set(prior.nations)
		selectedMapType$.set(prior.mapType)
		selectedMapSize$.set(prior.mapSize)
	}
	const ids = editor.getCurrentPageShapes().map((s) => s.id)
	if (ids.length > 0) {
		editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
	}
	bootstrapStartingState(editor)
	if (prior.started) gameStarted$.set(true)
}

/** Explicit "Quit to menu" — wipes the match and surfaces the main menu so
 * the player can start a new one or load a different save. */
function quitToMenu(editor: Editor) {
	resetGameState()
	resetGameLoop()
	resetTownDeck()
	// Re-apply default map size so the camera goes back to a known state and
	// the menu's bootstrap looks predictable.
	applyMapSettings(editor, selectedMapSize$.get())
	const ids = editor.getCurrentPageShapes().map((s) => s.id)
	if (ids.length > 0) {
		editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
	}
	bootstrapStartingState(editor)
	// resetGameState already set gameStarted$ to false; that's what we want.
}

function bootstrapStartingState(editor: Editor) {
	// Use whichever map type the player picked in the start menu (if any);
	// fall back to the default seeder when restarting before a nation has
	// been chosen so the canvas isn't empty.
	const mapId = selectedMapType$.get()
	const mapType = mapId ? getMapType(mapId) : null
	resetTerrain()
	if (mapType?.generateTerrain) mapType.generateTerrain()
	bumpTerrainVersion()
	rebuildNav([])
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

// While the player has the Wall (or Gate) building armed and is dragging the
// pointer, lay down additional barrier shapes along the path every ~size
// page-units. This makes building a continuous wall a single drag instead of
// dozens of clicks. Invalid spots (overlap, outside territory, can't afford)
// are silently skipped — `placeBuilding` returns null and the drag continues
// once the cursor is back over a legal cell.
function WallDragListener() {
	const editor = useEditor()
	useEffect(() => {
		let pointerDown = false
		let lastPlaced: { x: number; y: number } | null = null
		const onDown = (e: PointerEvent) => {
			if (e.button !== 0) return
			const kind = placingBuilding$.get()
			if (kind !== 'wall' && kind !== 'gate') return
			pointerDown = true
			const page = editor.screenToPage({ x: e.clientX, y: e.clientY })
			// The first placement is performed by PlacementPreviewOverlayUtil
			// when the editor dispatches its own pointer-down to the overlay.
			// We just record the position so the move handler knows when to
			// drop the next one.
			lastPlaced = { x: page.x, y: page.y }
		}
		const onMove = (e: PointerEvent) => {
			if (!pointerDown) return
			const kind = placingBuilding$.get()
			if (kind !== 'wall' && kind !== 'gate') return
			const cfg = BUILDING_CONFIG[kind]
			// 0.95 * size lets adjacent walls touch without overlapping. The
			// new wall-vs-wall padding rule (overlapsExistingBuilding) lets
			// them sit edge-to-edge.
			const minStep = cfg.size * 0.95
			const page = editor.screenToPage({ x: e.clientX, y: e.clientY })
			if (lastPlaced) {
				const dx = page.x - lastPlaced.x
				const dy = page.y - lastPlaced.y
				if (dx * dx + dy * dy < minStep * minStep) return
			}
			const id = placeBuilding(editor, kind, HUMAN_PLAYER_ID, page.x, page.y)
			if (id) lastPlaced = { x: page.x, y: page.y }
		}
		const onUp = () => {
			pointerDown = false
			lastPlaced = null
		}
		window.addEventListener('pointerdown', onDown)
		window.addEventListener('pointermove', onMove)
		window.addEventListener('pointerup', onUp)
		return () => {
			window.removeEventListener('pointerdown', onDown)
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('pointerup', onUp)
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
			} else if (e.key === '8') {
				e.preventDefault()
				pickBuilding('gate')
			} else if (e.key === 'r' || e.key === 'R') {
				e.preventDefault()
				if (gameStarted$.get()) researchTreeOpen$.update((v) => !v)
			} else if (e.key === 'a' || e.key === 'A') {
				e.preventDefault()
				// Arm attack-move. Next right-click on the canvas issues an
				// attack-move command to the current selection. Toggles off if
				// pressed twice.
				if (gameStarted$.get() && selectedUnitIds$.get().size > 0) {
					attackMoveArmed$.update((v) => !v)
				}
			} else if (e.key === 'Escape') {
				e.preventDefault()
				// Priority chain: cancel placement → cancel attack-move → close
				// research tree → close pause menu → clear selection → open
				// pause menu.
				if (placingBuilding$.get()) {
					placingBuilding$.set(null)
				} else if (attackMoveArmed$.get()) {
					attackMoveArmed$.set(false)
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
				<HudAge />

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
							{p.id !== HUMAN_PLAYER_ID && <DiplomacyControl other={p.id} />}
						</span>
					)
				})}
			</div>
			<div className="tlc-hud__hint">
				Left-click or drag to select units. Right-click to move, attack, or gather. Build with the
				toolbar (or <kbd>1</kbd>–<kbd>8</kbd>). Click a Library or press <kbd>R</kbd> for research.{' '}
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
	// Read the shape reactively so meta changes (HP, gateOpen, upgradeLevel)
	// re-render the toolbar — `editor.getShape` reads from the reactive store
	// when called inside useValue.
	const selectedShape = useValue(
		'selectedShape',
		() => (editor && selectedBuilding ? editor.getShape(selectedBuilding) : null),
		[editor, selectedBuilding]
	)
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

	// Compose the train list for the selected building. The nation's unique
	// unit is appended at the building that actually trains its archetype
	// (looked up via UNIT_CONFIG[uniqueUnit].trainedBy).
	const trainList: UnitKind[] = selectedCfg ? selectedCfg.trains.slice() : []
	if (
		uniqueUnit &&
		selectedKind &&
		UNIT_CONFIG[uniqueUnit].trainedBy === selectedKind &&
		!trainList.includes(uniqueUnit)
	) {
		trainList.push(uniqueUnit)
	}

	return (
		<div className="tlc-toolbar">
			<div className="tlc-toolbar__group">
				<span className="tlc-toolbar__group-label">Build</span>
				{BUILDING_KINDS.map((kind) => {
					const cfg = BUILDING_CONFIG[kind]
					const ageOrder = { dark: 0, feudal: 1, castle: 2, imperial: 3 } as const
					const humanAge = (playerAges$.get()[HUMAN_PLAYER_ID] as AgeId | undefined) ?? 'dark'
					const ageLocked = ageOrder[humanAge] < ageOrder[cfg.minAge]
					const canAfford =
						r.gold >= cfg.cost.gold && r.wood >= cfg.cost.wood && r.stone >= (cfg.cost.stone ?? 0)
					const isActive = placing === kind
					const lockReason = ageLocked ? ` — requires ${getAge(cfg.minAge).label}` : ''
					return (
						<button
							key={kind}
							className={'tlc-toolbar__btn' + (isActive ? ' is-active' : '')}
							disabled={(ageLocked || !canAfford) && !isActive}
							onClick={() => pickBuilding(kind)}
							title={`${cfg.label} — ${formatCost(cfg.cost)} — press ${cfg.keyHint}${lockReason}`}
						>
							<BuildGlyph kind={kind} />
							<span className="tlc-toolbar__label">
								{cfg.label}
								{ageLocked ? ' 🔒' : ''}
							</span>
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
			{selectedKind === 'town-hall' && isOwnBuilding && <AdvanceAgeButton />}
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
			{selectedKind === 'gate' && isOwnBuilding && selectedShape && selectedBuilding && (
				<div className="tlc-toolbar__group">
					<span className="tlc-toolbar__group-label">Gate</span>
					<button
						className="tlc-toolbar__btn"
						onClick={() => {
							if (!editor) return
							toggleGate(editor, selectedBuilding, HUMAN_PLAYER_ID)
						}}
						title={getBuildingGateOpen(selectedShape) ? 'Close the gate' : 'Open the gate'}
					>
						<span className="tlc-toolbar__label">
							{getBuildingGateOpen(selectedShape) ? 'Close gate' : 'Open gate'}
						</span>
						<span className="tlc-toolbar__cost">
							{getBuildingGateOpen(selectedShape) ? 'currently open' : 'currently closed'}
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

function DiplomacyControl({ other }: { other: PlayerId }) {
	const relation = useValue('diploRel', () => getRelation(HUMAN_PLAYER_ID, other), [other])
	const incomingProposal = useValue(
		'diploIncoming',
		() => diplomacyProposals$.get().find((p) => p.from === other && p.to === HUMAN_PLAYER_ID),
		[other]
	)
	const outgoingProposal = useValue(
		'diploOutgoing',
		() => diplomacyProposals$.get().find((p) => p.from === HUMAN_PLAYER_ID && p.to === other),
		[other]
	)
	const now = useValue('diploNow', () => elapsedMs$.get(), [])
	const onPropose = useCallback(() => {
		proposePeace(HUMAN_PLAYER_ID, other, elapsedMs$.get())
	}, [other])
	const onDeclareWar = useCallback(() => {
		declareWar(HUMAN_PLAYER_ID, other, elapsedMs$.get())
	}, [other])
	const onAccept = useCallback(() => {
		acceptPeace(other, HUMAN_PLAYER_ID, elapsedMs$.get())
	}, [other])
	const onDecline = useCallback(() => {
		declinePeace(other, HUMAN_PLAYER_ID, elapsedMs$.get())
	}, [other])

	if (incomingProposal) {
		const remaining = Math.max(0, Math.round((incomingProposal.expiresAt - now) / 1000))
		return (
			<span className="tlc-hud__diplo">
				<button className="tlc-hud__diplo-btn tlc-hud__diplo-btn--accept" onClick={onAccept}>
					Accept peace ({remaining}s)
				</button>
				<button className="tlc-hud__diplo-btn" onClick={onDecline}>
					Decline
				</button>
			</span>
		)
	}
	if (outgoingProposal) {
		return <span className="tlc-hud__diplo-status">Offered peace</span>
	}
	return (
		<span className="tlc-hud__diplo">
			<span className={'tlc-hud__diplo-state tlc-hud__diplo-state--' + relation}>
				{relation === 'peace' ? '☮ Peace' : '⚔ War'}
			</span>
			{relation === 'war' ? (
				<button className="tlc-hud__diplo-btn" onClick={onPropose} title="Offer peace">
					Offer peace
				</button>
			) : (
				<button className="tlc-hud__diplo-btn" onClick={onDeclareWar} title="Declare war">
					Declare war
				</button>
			)}
		</span>
	)
}

function HudAge() {
	const age = useValue(
		'humanAge',
		() => (playerAges$.get()[HUMAN_PLAYER_ID] as AgeId | undefined) ?? 'dark',
		[]
	)
	const research = useValue(
		'humanAgeResearch',
		() => ageResearchByPlayer$.get()[HUMAN_PLAYER_ID] ?? null,
		[]
	)
	const now = useValue('elapsed', () => elapsedMs$.get(), [])
	const label = getAge(age).label
	let progress: number | null = null
	if (research) {
		const elapsed = Math.max(0, now - research.startedAtMs)
		progress = Math.min(1, elapsed / research.durationMs)
	}
	return (
		<span className="tlc-hud__age">
			Age: <strong>{label}</strong>
			{progress !== null && (
				<span className="tlc-hud__age-progress">→ {Math.round(progress * 100)}%</span>
			)}
		</span>
	)
}

function AdvanceAgeButton() {
	const age = useValue(
		'humanAge',
		() => (playerAges$.get()[HUMAN_PLAYER_ID] as AgeId | undefined) ?? 'dark',
		[]
	)
	const research = useValue(
		'humanAgeResearch',
		() => ageResearchByPlayer$.get()[HUMAN_PLAYER_ID] ?? null,
		[]
	)
	const outcome = useValue('canAgeUp', () => canQueueAgeAdvance(HUMAN_PLAYER_ID), [])
	const order = AGES.findIndex((a) => a.id === age)
	const nextAge = AGES[order + 1] ?? null
	if (!nextAge) {
		return (
			<div className="tlc-toolbar__group">
				<span className="tlc-toolbar__group-label">Age</span>
				<span className="tlc-toolbar__cost">At the final age</span>
			</div>
		)
	}
	const cost = nextAge.advanceCost ?? { gold: 0, wood: 0 }
	const inProgress = research !== null
	const disabled = inProgress || outcome !== 'queued'
	const costText = `${cost.gold}g · ${cost.wood}w` + (cost.stone ? ` · ${cost.stone}s` : '')
	const title = inProgress
		? `Advancing to ${nextAge.label}…`
		: outcome === 'cant-afford'
			? `Need ${costText}`
			: outcome === 'queued'
				? `Advance to ${nextAge.label} (${Math.round((nextAge.advanceResearchMs ?? 0) / 1000)}s)`
				: `Unavailable`
	return (
		<div className="tlc-toolbar__group">
			<span className="tlc-toolbar__group-label">Age</span>
			<button
				className="tlc-toolbar__btn"
				disabled={disabled}
				onClick={() => queueAgeAdvance(HUMAN_PLAYER_ID)}
				title={title}
			>
				<span className="tlc-toolbar__label">
					{inProgress ? `Advancing… ${nextAge.label}` : `Advance to ${nextAge.label}`}
				</span>
				<span className="tlc-toolbar__cost">{costText}</span>
			</button>
		</div>
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

// Nation accent colour — read from the nation data itself so the in-game
// colour and start-menu outline stay in sync without a duplicate map.
function nationAccent(id: NationId): string {
	return getNation(id).accentColor
}

// ----------------------------- Pre-game menus ----------------------------
//
// PreGameMenu is the landing surface — it shows whenever no match is active.
// It owns a tiny `view` state machine: 'main' → 'new' | 'load'. Each child
// view handles its own form state. Going back from a child returns to 'main'.

type PreGameView = 'main' | 'new' | 'load'

function PreGameMenu({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const started = useValue('gameStarted', () => gameStarted$.get(), [])
	const [view, setView] = useState<PreGameView>('main')
	// `savesRev` is bumped on every save/delete so children that read the
	// saves list re-render. Cheap; saves are typically <10 entries.
	const [savesRev, setSavesRev] = useState(0)
	const bumpSaves = useCallback(() => setSavesRev((n) => n + 1), [])
	// When the player quits a running match back to the menu, always land on
	// MainMenu instead of whichever sub-view they last visited. (The
	// component stays mounted while `started` is true, so `view` would
	// otherwise persist across matches.)
	useEffect(() => {
		if (!started) setView('main')
	}, [started])
	if (started) return null
	if (view === 'new') {
		return <NewGameForm editorRef={editorRef} onBack={() => setView('main')} />
	}
	if (view === 'load') {
		return (
			<LoadGameList
				editorRef={editorRef}
				savesRev={savesRev}
				onChange={bumpSaves}
				onBack={() => setView('main')}
			/>
		)
	}
	return (
		<MainMenu savesRev={savesRev} onNew={() => setView('new')} onLoad={() => setView('load')} />
	)
}

function MainMenu({
	savesRev,
	onNew,
	onLoad,
}: {
	savesRev: number
	onNew(): void
	onLoad(): void
}) {
	const saves = useMemo(() => {
		void savesRev
		return listSaves()
	}, [savesRev])
	return (
		<div className="tlc-modal tlc-modal--center" role="dialog" aria-modal="true">
			<div className="tlc-modal__panel tlc-mainmenu">
				<header className="tlc-mainmenu__header">
					<h1 className="tlc-mainmenu__title">Age of tldraw</h1>
					<div className="tlc-mainmenu__sub">
						A tldraw-SDK RTS — build, expand, conquer rival AI nations.
					</div>
				</header>
				<div className="tlc-mainmenu__actions">
					<button
						className="tlc-modal__btn tlc-modal__btn--primary tlc-mainmenu__btn"
						onClick={onNew}
					>
						New game
					</button>
					<button
						className="tlc-modal__btn tlc-mainmenu__btn"
						onClick={onLoad}
						disabled={saves.length === 0}
						title={saves.length === 0 ? 'No saved games yet' : `${saves.length} saved games`}
					>
						Load game
						{saves.length > 0 && <span className="tlc-mainmenu__count">{saves.length}</span>}
					</button>
				</div>
				<footer className="tlc-mainmenu__footer">
					<span className="tlc-modal__hint">
						Drag-select units, right-click to command. <kbd>Esc</kbd> for the pause menu.
					</span>
				</footer>
			</div>
		</div>
	)
}

function NewGameForm({
	editorRef,
	onBack,
}: {
	editorRef: React.RefObject<Editor | null>
	onBack(): void
}) {
	const [selected, setSelected] = useState<NationId>(NATIONS[0].id)
	const [selectedMap, setSelectedMap] = useState<MapTypeId | 'random'>('random')
	const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>(
		aiDifficulty$.get()
	)
	const [selectedSize, setSelectedSize] = useState<MapSizeId>(selectedMapSize$.get())

	const onStart = useCallback(() => {
		// Fresh seed for the match. After this point, EVERY random call in
		// the simulation goes through the seeded PRNG (see random.ts), so
		// the same seed → the same match.
		reseedSim()

		const aiNations = pickAiNations(selected)
		const nationMap: Record<string, NationId> = { [HUMAN_PLAYER_ID]: selected }
		const aiPlayers = PLAYERS.filter((p) => !p.isHuman)
		for (let i = 0; i < aiPlayers.length; i++) {
			nationMap[aiPlayers[i].id] = aiNations[i] ?? aiNations[0]
		}
		const mapId: MapTypeId = selectedMap === 'random' ? pickRandomMapType().id : selectedMap

		const editor = editorRef.current
		if (editor) {
			applyMapSettings(editor, selectedSize)
			resetGameState()
			resetGameLoop()
			resetTownDeck()
			// Re-apply selections cleared by resetGameState.
			playerNations$.set(nationMap)
			selectedMapType$.set(mapId)
			selectedMapSize$.set(selectedSize)
			aiDifficulty$.set(selectedDifficulty)
			const ids = editor.getCurrentPageShapes().map((s) => s.id)
			if (ids.length > 0) {
				editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
			}
			bootstrapStartingState(editor)
		}
		gameStarted$.set(true)
		if (editor) {
			const human = PLAYERS.find((p) => p.id === HUMAN_PLAYER_ID)!
			editor.zoomToBounds(new Box(human.startBase.x - 200, human.startBase.y - 200, 1600, 1100), {
				immediate: true,
			})
		}
	}, [selected, selectedMap, selectedSize, selectedDifficulty, editorRef])

	return (
		<div className="tlc-modal tlc-modal--center" role="dialog" aria-modal="true">
			<div className="tlc-modal__panel tlc-start">
				<header className="tlc-modal__header">
					<h2>New game</h2>
					<span className="tlc-modal__hint">
						Pick a civilization, map, and size — AI opponents draw from the remaining civs.
					</span>
				</header>
				<div className="tlc-start__grid">
					{NATIONS.map((n) => {
						const isPicked = selected === n.id
						const accent = nationAccent(n.id)
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
								<ul className="tlc-start__bonuses">
									{n.bonuses.map((b, i) => (
										<li key={i}>{b.description}</li>
									))}
								</ul>
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
				<div className="tlc-start__maps">
					<div className="tlc-start__maps-label">Map size</div>
					<div className="tlc-start__maps-row">
						{MAP_SIZES.map((s) => (
							<button
								key={s.id}
								type="button"
								className={'tlc-start__map' + (selectedSize === s.id ? ' is-active' : '')}
								onClick={() => setSelectedSize(s.id)}
								title={`${s.label} — ${s.width} × ${s.height} page units. ${s.description}`}
							>
								<strong>
									{s.label}{' '}
									<span className="tlc-start__map-dim">
										{s.width.toLocaleString()} × {s.height.toLocaleString()}
									</span>
								</strong>
								<span>{s.description}</span>
							</button>
						))}
					</div>
				</div>
				<div className="tlc-start__maps">
					<div className="tlc-start__maps-label">AI difficulty</div>
					<div className="tlc-start__maps-row">
						{(['easy', 'normal', 'hard'] as const).map((d) => (
							<button
								key={d}
								type="button"
								className={'tlc-start__map' + (selectedDifficulty === d ? ' is-active' : '')}
								onClick={() => setSelectedDifficulty(d)}
							>
								<strong>{d === 'easy' ? 'Easy' : d === 'normal' ? 'Normal' : 'Hard'}</strong>
								<span>
									{d === 'easy'
										? 'Late warmup, small army, handicapped economy.'
										: d === 'normal'
											? 'Standard timing. Uses the full building roster.'
											: 'Fast warmup, parallel production, builds walls, slight resource bonus.'}
								</span>
							</button>
						))}
					</div>
				</div>
				<footer className="tlc-modal__footer">
					<button className="tlc-modal__btn" onClick={onBack}>
						Back
					</button>
					<button className="tlc-modal__btn tlc-modal__btn--primary" onClick={onStart}>
						Start match — play as {getNation(selected).label}
					</button>
				</footer>
			</div>
		</div>
	)
}

function LoadGameList({
	editorRef,
	savesRev,
	onChange,
	onBack,
}: {
	editorRef: React.RefObject<Editor | null>
	savesRev: number
	onChange(): void
	onBack(): void
}) {
	const saves = useMemo(() => {
		void savesRev
		return listSaves()
	}, [savesRev])
	const onLoad = useCallback(
		(id: string) => {
			if (!editorRef.current) return
			loadGame(editorRef.current, id, applyMapSettings)
		},
		[editorRef]
	)
	const onDelete = useCallback(
		(id: string) => {
			deleteSave(id)
			onChange()
		},
		[onChange]
	)
	return (
		<div className="tlc-modal tlc-modal--center" role="dialog" aria-modal="true">
			<div className="tlc-modal__panel tlc-loadlist">
				<header className="tlc-modal__header">
					<h2>Load game</h2>
					<span className="tlc-modal__hint">
						{saves.length === 0
							? 'No saved games yet. Save from the pause menu mid-match.'
							: `${saves.length} saved game${saves.length === 1 ? '' : 's'}`}
					</span>
				</header>
				<div className="tlc-loadlist__rows">
					{saves.map((s) => {
						const elapsedSec = Math.round(s.elapsedMs / 1000)
						const mins = Math.floor(elapsedSec / 60)
						const secs = elapsedSec % 60
						const elapsedLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
						const sizeLabel = getMapSize(s.mapSize).label
						const mapLabel = s.mapType ? getMapType(s.mapType).label : '—'
						const nationLabel = s.humanNation ? getNation(s.humanNation).label : 'Match'
						return (
							<div key={s.id} className="tlc-loadlist__row">
								<div className="tlc-loadlist__main">
									<div className="tlc-loadlist__name">{s.name}</div>
									<div className="tlc-loadlist__meta">
										{nationLabel} · {mapLabel} · {sizeLabel} · {elapsedLabel} played ·{' '}
										{formatRelativeTime(s.savedAt)}
									</div>
								</div>
								<div className="tlc-loadlist__actions">
									<button className="tlc-modal__btn" onClick={() => onLoad(s.id)}>
										Load
									</button>
									<button
										className="tlc-modal__btn tlc-loadlist__delete"
										onClick={() => onDelete(s.id)}
										title="Delete this save"
									>
										Delete
									</button>
								</div>
							</div>
						)
					})}
				</div>
				<footer className="tlc-modal__footer">
					<button className="tlc-modal__btn" onClick={onBack}>
						Back
					</button>
				</footer>
			</div>
		</div>
	)
}

// ---------------------------- Research tree ------------------------------

// Layout: 3 columns by tier, vertical slot per tech inside the column.
// Auto-assigned from tech-config so adding a tech (or 20 signature techs)
// doesn't need a manual update here.
const TECH_LAYOUT: Record<TechId, { col: 0 | 1 | 2; row: number }> = (() => {
	const out: Record<string, { col: 0 | 1 | 2; row: number }> = {}
	const rows = [0, 0, 0]
	for (const id of LIBRARY_TECH_IDS) {
		const cfg = TECH_CONFIG[id]
		const col = (cfg.tier - 1) as 0 | 1 | 2
		out[id] = { col, row: rows[col] }
		rows[col]++
	}
	return out as Record<TechId, { col: 0 | 1 | 2; row: number }>
})()

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
		'Your home base. Trains villagers, drops off every resource, and provides 8 population. Lose every Town Hall and you lose the game.',
	farm: 'Cheap food-cap building (+4 population each). Doesn’t train; tuck them behind a Barracks.',
	mill: 'Bigger food-cap drop-off (+6). Build one near your farms so workers don’t walk all the way back to the Town Hall.',
	'lumber-camp': 'Wood drop-off. Plant one near a forest so workers cut and deposit on the spot.',
	'mining-camp': 'Gold and stone drop-off. Park next to a mine to halve the travel time.',
	barracks: 'Trains militia and pikemen, plus several civs’ unique infantry. Adds 4 population.',
	'archery-range':
		'Trains archers, skirmishers, and crossbowmen — plus archer-archetype unique units. Adds 4 population.',
	stable:
		'Trains scout cavalry, knights, and the cavalry-archetype unique units. Adds 4 population.',
	market:
		'Lets you trade resources (and grants several civ bonuses involving gold). Doesn’t train anything.',
	library:
		'Hosts the research tree — every passive and unique-unit unlock. Click one to open the full tree (or press R).',
	tower:
		'Auto-attacks any enemy unit that strays into range. Cheap and sturdy. Tower marksmanship extends its range.',
	wall: 'Cheap territorial extension. Low HP and no attack — chain them to push your border outward without paying for a full tower.',
	gate: 'Pairs with walls to make breaches you control. Click a gate to toggle it open or closed — open lets any unit (including enemies) pass.',
	castle:
		'Heavy fortification with an area attack and the largest territory of any building. Castle Age + Stonemasonry research required.',
	monastery: 'Trains Monks — long-range support units. Adds 4 population.',
	'siege-workshop': 'Imperial-Age building that trains Trebuchets — long-range siege.',
	dock: 'Trains ships. Must be built next to a water tile. Unlocks Feudal Age.',
}

function PauseMenu({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
	const isPaused = useValue('paused', () => paused$.get(), [])
	const [tab, setTab] = useState<GuideTab>('buildings')
	// `lastSaved` is the most recent slot the player wrote during this pause
	// — used for the "Saved as ..." status line. Cleared when the menu closes.
	const [lastSaved, setLastSaved] = useState<SaveSlotInfo | null>(null)
	const onResume = useCallback(() => paused$.set(false), [])
	const onRestart = useCallback(() => {
		paused$.set(false)
		if (editorRef.current) restartGame(editorRef.current)
	}, [editorRef])
	const onSave = useCallback(() => {
		if (!editorRef.current) return
		const info = saveGame(editorRef.current)
		if (info) setLastSaved(info)
	}, [editorRef])
	const onQuit = useCallback(() => {
		paused$.set(false)
		if (editorRef.current) quitToMenu(editorRef.current)
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
				<div className="tlc-pause__save">
					<button className="tlc-modal__btn" onClick={onSave}>
						Save game
					</button>
					<button className="tlc-modal__btn" onClick={onQuit}>
						Quit to menu
					</button>
					<span className="tlc-pause__save-info">
						{lastSaved
							? `Saved as “${lastSaved.name}”`
							: 'Save creates a new slot. Manage saves from the main menu.'}
					</span>
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

function formatRelativeTime(ts: number): string {
	const deltaMs = Date.now() - ts
	if (deltaMs < 60_000) return 'just now'
	const minutes = Math.round(deltaMs / 60_000)
	if (minutes < 60) return `${minutes} min ago`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	return new Date(ts).toLocaleDateString()
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

// Generic per-unit copy. Base units get a hand-written line; civ-unique units
// reuse the description from the nation entry so the two never drift apart.
const UNIT_DESCRIPTIONS: Record<UnitKind, string> = (() => {
	const base: Partial<Record<UnitKind, string>> = {
		worker: 'Harvests every resource and drops off at the nearest depot. Weak in combat.',
		soldier: 'Mainline Feudal-Age infantry. Affordable HP and damage.',
		pikeman: 'Castle-Age anti-cavalry infantry. Cheap, durable, decent attack.',
		archer: 'Feudal-Age ranged unit. Trained at the Archery Range.',
		crossbowman: 'Castle-Age archer with higher HP and damage.',
		skirmisher: 'Anti-archer ranged infantry. Short range, but fast and resilient.',
		'scout-cavalry': 'Feudal-Age light cavalry. Fast and great for harassment / scouting.',
		knight: 'Castle-Age heavy cavalry. Trained at the Stable.',
		monk: 'Long-range support unit trained at the Monastery.',
		trebuchet: 'Imperial-Age siege. Devastating against buildings; slow and fragile up close.',
	}
	const out: Record<string, string> = {}
	for (const kind of Object.keys(UNIT_CONFIG)) {
		out[kind] = base[kind as UnitKind] ?? `Civ-unique unit. See the picked nation for details.`
	}
	for (const n of NATIONS) {
		out[n.uniqueUnit] = `${n.label} unique. ${n.description}`
	}
	return out as Record<UnitKind, string>
})()

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
				<kbd>1</kbd>–<kbd>8</kbd>
			</dt>
			<dd>
				Arm a building for placement: town hall, barracks, tower, library, farm, wall, castle, gate.
				Walls and gates can be drag-placed for continuous chains.
			</dd>
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
	// Sync each player's startBase from the freshly-sampled PLAYER_SPAWNS
	// before the first bootstrap reads them. The start menu reruns this with
	// the picked size; this initial pass just makes sure the pre-start
	// canvas isn't completely empty / placed at (0, 0).
	updatePlayerStartBases(PLAYER_SPAWNS)
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

export default function App() {
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
					<WallDragListener />
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
			<PreGameMenu editorRef={editorRef} />
			<ResearchTreeOverlay editorRef={editorRef} />
		</div>
	)
}

import { Editor, TLShapeId, createShapeId } from 'tldraw'
import {
	BUILDING_CONFIG,
	BuildingKind,
	getBuildingHp,
	getBuildingKind,
	getBuildingOwner,
	getBuildingUpgradeLevel,
	getEffectiveMaxHp,
	getEffectiveTerritoryRadius,
	pickTownName,
} from './building-config'
import { isInTerritoryOf } from './fog'
import {
	ResearchQueueItem,
	TrainQueueItem,
	UpgradeQueueItem,
	completedTechs$,
	elapsedMs$,
	getResources,
	nextQueueItemId,
	nextResearchItemId,
	nextUpgradeItemId,
	playerNations$,
	researchQueues,
	researchQueuesAtom$,
	trainQueues,
	trainQueuesAtom$,
	updateResources,
	upgradeQueues,
	upgradeQueuesAtom$,
} from './game-state'
import { MAP_BOUNDS } from './map'
import { HUMAN_PLAYER_ID } from './players'
import { PlayerId, getPlayer } from './players'
import { canTrainUnit, getBuildingHpMultiplier, getResearchSpeedMultiplier, hasTech } from './tech'
import { TECH_CONFIG, TechId } from './tech-config'
import { UNIT_CONFIG, UnitKind } from './unit-config'

const BUILDING_PADDING = 16

export type PlaceBuildingOutcome =
	| 'ok'
	| 'out-of-bounds'
	| 'overlap'
	| 'cant-afford'
	| 'outside-territory'
	| 'outside-town'
	| 'requires-tech'

// Public preflight check used by the placement preview overlay so it can paint
// an invalid (red) ghost when the cursor is over an illegal spot. Mirrors the
// branches in placeBuilding.
export function checkPlacement(
	editor: Editor,
	kind: BuildingKind,
	playerId: PlayerId,
	cx: number,
	cy: number
): PlaceBuildingOutcome {
	const cfg = BUILDING_CONFIG[kind]
	const half = cfg.size / 2
	if (
		cx - half < MAP_BOUNDS.minX + BUILDING_PADDING ||
		cx + half > MAP_BOUNDS.maxX - BUILDING_PADDING ||
		cy - half < MAP_BOUNDS.minY + BUILDING_PADDING ||
		cy + half > MAP_BOUNDS.maxY - BUILDING_PADDING
	) {
		return 'out-of-bounds'
	}
	if (overlapsExistingBuilding(editor, cx, cy, cfg.size)) return 'overlap'
	const r = getResources(playerId)
	if (r.gold < cfg.cost.gold || r.wood < cfg.cost.wood || r.stone < (cfg.cost.stone ?? 0)) {
		return 'cant-afford'
	}
	if (cfg.requiresTech && !hasTech(playerId, cfg.requiresTech)) return 'requires-tech'
	if (!playerHasAnyBuilding(editor, playerId)) return 'ok'
	const buildings = collectBuildingsForFog(editor)
	if (!isInTerritoryOf(playerId, HUMAN_PLAYER_ID, buildings, cx, cy)) {
		return 'outside-territory'
	}
	// Town-bound buildings (barracks, library, farm) require the placement
	// point to be within at least one of the player's town hall radii. The
	// territory grid covers more area than just town radii, so this is a
	// stricter check applied on top.
	if (cfg.placement === 'town' && !isInPlayerTown(buildings, playerId, cx, cy)) {
		return 'outside-town'
	}
	return 'ok'
}

// Visit each of the player's alive town halls and check the placement point
// against its (upgrade-aware) territory radius.
function isInPlayerTown(
	buildings: Array<{
		kind: BuildingKind
		owner: PlayerId
		cx: number
		cy: number
		hp: number
		upgradeLevel: number
	}>,
	playerId: PlayerId,
	x: number,
	y: number
): boolean {
	for (const b of buildings) {
		if (b.kind !== 'town-hall' || b.owner !== playerId || b.hp <= 0) continue
		const r = getEffectiveTerritoryRadius('town-hall', b.upgradeLevel)
		const dx = b.cx - x
		const dy = b.cy - y
		if (dx * dx + dy * dy <= r * r) return true
	}
	return false
}

function playerHasAnyBuilding(editor: Editor, playerId: PlayerId): boolean {
	for (const shape of editor.getCurrentPageShapes()) {
		if (!getBuildingKind(shape)) continue
		if (getBuildingOwner(shape) === playerId && getBuildingHp(shape) > 0) return true
	}
	return false
}

function collectBuildingsForFog(editor: Editor) {
	const out: Array<{
		kind: BuildingKind
		owner: PlayerId
		cx: number
		cy: number
		hp: number
		upgradeLevel: number
	}> = []
	for (const shape of editor.getCurrentPageShapes()) {
		const kind = getBuildingKind(shape)
		if (!kind) continue
		const owner = getBuildingOwner(shape)
		if (!owner) continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		out.push({
			kind,
			owner,
			cx: bounds.center.x,
			cy: bounds.center.y,
			hp: getBuildingHp(shape),
			upgradeLevel: getBuildingUpgradeLevel(shape),
		})
	}
	return out
}
export function placeBuilding(
	editor: Editor,
	kind: BuildingKind,
	playerId: PlayerId,
	cx: number,
	cy: number
): TLShapeId | null {
	if (checkPlacement(editor, kind, playerId, cx, cy) !== 'ok') return null
	const cfg = BUILDING_CONFIG[kind]
	const half = cfg.size / 2

	const id = createShapeId()
	const player = getPlayer(playerId)
	const maxHp = Math.round(cfg.maxHp * getBuildingHpMultiplier(playerId))
	editor.createShape({
		id,
		type: 'geo',
		x: cx - half,
		y: cy - half,
		isLocked: true,
		props: {
			geo: cfg.geo,
			w: cfg.size,
			h: cfg.size,
			color: player.buildingColor,
			fill: 'solid',
		},
		// hp + maxHp + upgradeLevel are baked at construction. Town halls also
		// get a town name pulled from the shuffled name deck — that's what
		// makes them a "town" the player can cluster town-bound buildings
		// around. The townName key is omitted entirely for non-town-halls
		// because tldraw's meta validator rejects `undefined` values.
		meta: {
			buildingKind: kind,
			hp: maxHp,
			maxHp,
			owner: playerId,
			upgradeLevel: 0,
			...(kind === 'town-hall' ? { townName: pickTownName() } : {}),
		},
	})
	updateResources(playerId, (rr) => ({
		...rr,
		gold: rr.gold - cfg.cost.gold,
		wood: rr.wood - cfg.cost.wood,
		stone: rr.stone - (cfg.cost.stone ?? 0),
	}))
	return id
}

function overlapsExistingBuilding(editor: Editor, cx: number, cy: number, size: number): boolean {
	const half = size / 2
	for (const shape of editor.getCurrentPageShapes()) {
		if (!getBuildingKind(shape)) continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		const inflate = BUILDING_PADDING
		if (
			cx + half + inflate < bounds.minX ||
			cx - half - inflate > bounds.maxX ||
			cy + half + inflate < bounds.minY ||
			cy - half - inflate > bounds.maxY
		) {
			continue
		}
		return true
	}
	return false
}

export function queueUnit(buildingId: TLShapeId, kind: UnitKind, playerId: PlayerId): boolean {
	const cfg = UNIT_CONFIG[kind]
	if (!canTrainUnit(playerId, kind)) return false
	const r = getResources(playerId)
	if (r.gold < cfg.trainCost.gold) return false
	if (r.wood < cfg.trainCost.wood) return false
	if (r.food + cfg.trainCost.food > r.foodCap) return false
	updateResources(playerId, (rr) => ({
		...rr,
		gold: rr.gold - cfg.trainCost.gold,
		wood: rr.wood - cfg.trainCost.wood,
	}))
	const now = elapsedMs$.get()
	const queue = trainQueues.get(buildingId) ?? []
	const startedAtMs = queue.length === 0 ? now : 0
	const item: TrainQueueItem = {
		id: nextQueueItemId(),
		kind,
		startedAtMs,
		durationMs: cfg.trainMs,
	}
	queue.push(item)
	trainQueues.set(buildingId, queue)
	trainQueuesAtom$.update((prev) => ({
		...prev,
		[buildingId as unknown as string]: queue.slice(),
	}))
	return true
}

export type QueueResearchOutcome =
	| 'queued'
	| 'already-completed'
	| 'already-in-progress'
	| 'cant-afford'
	| 'requires-barracks'
	| 'requires-prereq'
	| 'wrong-nation'

export function canQueueResearch(
	editor: Editor,
	techId: TechId,
	playerId: PlayerId
): QueueResearchOutcome {
	if (completedTechs$.get()[playerId]?.has(techId)) return 'already-completed'
	if (techIsInProgressForPlayer(editor, playerId, techId)) return 'already-in-progress'
	const cfg = TECH_CONFIG[techId]
	if (cfg.requiredNation) {
		const myNation = playerNations$.get()[playerId]
		if (myNation !== cfg.requiredNation) return 'wrong-nation'
	}
	for (const prereq of cfg.prereqs) {
		if (!hasTech(playerId, prereq)) return 'requires-prereq'
	}
	const r = getResources(playerId)
	if (r.gold < cfg.cost.gold || r.wood < cfg.cost.wood || r.stone < (cfg.cost.stone ?? 0)) {
		return 'cant-afford'
	}
	if (techId === 'cavalry-training' && !playerHasBuildingKind(editor, playerId, 'barracks')) {
		return 'requires-barracks'
	}
	return 'queued'
}

export function queueResearch(
	editor: Editor,
	libraryId: TLShapeId,
	techId: TechId,
	playerId: PlayerId
): boolean {
	const outcome = canQueueResearch(editor, techId, playerId)
	if (outcome !== 'queued') return false
	const cfg = TECH_CONFIG[techId]
	updateResources(playerId, (rr) => ({
		...rr,
		gold: rr.gold - cfg.cost.gold,
		wood: rr.wood - cfg.cost.wood,
		stone: rr.stone - (cfg.cost.stone ?? 0),
	}))
	const now = elapsedMs$.get()
	const queue = researchQueues.get(libraryId) ?? []
	const startedAtMs = queue.length === 0 ? now : 0
	// Mystic perk: research completes faster. Bake the multiplier into the
	// queued item so a mid-research nation change couldn't game the timer.
	const speedMult = getResearchSpeedMultiplier(playerId)
	const item: ResearchQueueItem = {
		id: nextResearchItemId(),
		techId,
		startedAtMs,
		durationMs: Math.round(cfg.researchMs / speedMult),
	}
	queue.push(item)
	researchQueues.set(libraryId, queue)
	researchQueuesAtom$.update((prev) => ({
		...prev,
		[libraryId as unknown as string]: queue.slice(),
	}))
	return true
}

function techIsInProgressForPlayer(editor: Editor, playerId: PlayerId, techId: TechId): boolean {
	for (const shape of editor.getCurrentPageShapes()) {
		if (getBuildingKind(shape) !== 'library') continue
		if (shape.meta?.owner !== playerId) continue
		const queue = researchQueues.get(shape.id) ?? []
		if (queue.some((it) => it.techId === techId)) return true
	}
	return false
}

// ---- Upgrades ----

export type QueueUpgradeOutcome =
	| 'queued'
	| 'no-upgrade'
	| 'already-upgraded'
	| 'already-in-progress'
	| 'cant-afford'
	| 'wrong-owner'

export function canQueueUpgrade(
	shapeId: TLShapeId,
	editor: Editor,
	playerId: PlayerId
): QueueUpgradeOutcome {
	const shape = editor.getShape(shapeId)
	if (!shape) return 'no-upgrade'
	const kind = getBuildingKind(shape)
	if (!kind) return 'no-upgrade'
	if (getBuildingOwner(shape) !== playerId) return 'wrong-owner'
	const cfg = BUILDING_CONFIG[kind]
	if (!cfg.upgrade) return 'no-upgrade'
	if (getBuildingUpgradeLevel(shape) >= 1) return 'already-upgraded'
	if (upgradeQueues.get(shapeId)) return 'already-in-progress'
	const r = getResources(playerId)
	if (
		r.gold < cfg.upgrade.cost.gold ||
		r.wood < cfg.upgrade.cost.wood ||
		r.stone < (cfg.upgrade.cost.stone ?? 0)
	) {
		return 'cant-afford'
	}
	return 'queued'
}

export function queueUpgrade(shapeId: TLShapeId, editor: Editor, playerId: PlayerId): boolean {
	if (canQueueUpgrade(shapeId, editor, playerId) !== 'queued') return false
	const shape = editor.getShape(shapeId)
	if (!shape) return false
	const kind = getBuildingKind(shape)
	if (!kind) return false
	const cfg = BUILDING_CONFIG[kind]
	if (!cfg.upgrade) return false
	updateResources(playerId, (rr) => ({
		...rr,
		gold: rr.gold - cfg.upgrade!.cost.gold,
		wood: rr.wood - cfg.upgrade!.cost.wood,
		stone: rr.stone - (cfg.upgrade!.cost.stone ?? 0),
	}))
	const item: UpgradeQueueItem = {
		id: nextUpgradeItemId(),
		startedAtMs: elapsedMs$.get(),
		durationMs: cfg.upgrade.durationMs,
	}
	upgradeQueues.set(shapeId, item)
	upgradeQueuesAtom$.update((prev) => ({
		...prev,
		[shapeId as unknown as string]: item,
	}))
	return true
}

// Apply a completed upgrade to the shape. Updates hp + maxHp + upgradeLevel
// in shape.meta. Called from the game loop's tickUpgrades.
export function finishUpgrade(editor: Editor, shapeId: TLShapeId) {
	const shape = editor.getShape(shapeId)
	if (!shape) return
	const kind = getBuildingKind(shape)
	if (!kind) return
	const newLevel = getBuildingUpgradeLevel(shape) + 1
	const newMaxHp = Math.round(
		getEffectiveMaxHp(kind, newLevel) * getBuildingHpMultiplier(getBuildingOwner(shape) as PlayerId)
	)
	const currentHp = getBuildingHp(shape)
	// Heal the building proportionally to the HP bump from the upgrade —
	// matches the AoE behaviour of upgrades feeling restorative.
	const healed = Math.min(
		newMaxHp,
		Math.round(currentHp + (newMaxHp - getEffectiveMaxHp(kind, newLevel - 1)))
	)
	editor.run(
		() =>
			editor.updateShape({
				id: shapeId,
				type: 'geo',
				meta: {
					...shape.meta,
					upgradeLevel: newLevel,
					hp: healed,
					maxHp: newMaxHp,
				},
			}),
		{ ignoreShapeLock: true }
	)
}

function playerHasBuildingKind(editor: Editor, playerId: PlayerId, kind: BuildingKind): boolean {
	for (const shape of editor.getCurrentPageShapes()) {
		if (getBuildingKind(shape) !== kind) continue
		if (shape.meta?.owner === playerId) return true
	}
	return false
}

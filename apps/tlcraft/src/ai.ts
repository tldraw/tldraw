import { Editor, TLShapeId } from 'tldraw'
import {
	canQueueResearch,
	canQueueUpgrade,
	placeBuilding,
	queueResearch,
	queueUnit,
	queueUpgrade,
} from './building-actions'
import { BUILDING_CONFIG, BuildingKind } from './building-config'
import {
	Unit,
	completedTechs$,
	getResources,
	playerNations$,
	researchQueues,
	resources$,
	trainQueues,
	units$,
} from './game-state'
import { getNation } from './nations'
import { PlayerId, isEnemyOf } from './players'
import { nextInt, nextRandom } from './random'
import { canTrainUnit, isKnightUnlocked } from './tech'
import { TECH_IDS, TechId } from './tech-config'
import { UNIT_CONFIG, UnitKind } from './unit-config'

// Per-AI-player decisions. Called every game tick after movement / combat have
// resolved. Cheap and idempotent — if the AI has nothing to do this tick, it
// just returns.

interface BuildingsByKind {
	townHalls: BuildingSnap[]
	barracks: BuildingSnap[]
	towers: BuildingSnap[]
	libraries: BuildingSnap[]
	farms: BuildingSnap[]
	walls: BuildingSnap[]
	gates: BuildingSnap[]
	castles: BuildingSnap[]
}

export interface BuildingSnap {
	id: TLShapeId
	kind: BuildingKind
	owner: PlayerId
	cx: number
	cy: number
	halfSize: number
	hp: number
	upgradeLevel: number
	// Only meaningful when kind === 'gate'. Open gates are passable by all
	// units (friendly + enemy); closed gates block like walls.
	gateOpen: boolean
}

// AI cadences (in elapsed ms). Coarse so the AI feels deliberate, not twitchy.
const DECISION_INTERVAL_MS = 800
// Pause for a short ramp-up before AI starts pushing — gives the human a
// chance to scout and scale up before being attacked.
const AI_WARMUP_MS = 18_000
// Max army size per AI before they stop training to avoid food-cap stalls.
const MAX_WORKERS = 5
const MAX_FIGHTERS = 8
// Tower auto-attack range squared (pages). Reused for AI scouting too.
const VISION_RANGE_SQ = 380 * 380

const lastDecisionAt = new Map<PlayerId, number>()
// Where each AI is currently rallying its army. Updated when an aggressive push begins.
const aiRallyTarget = new Map<PlayerId, { x: number; y: number } | null>()

export function resetAi() {
	lastDecisionAt.clear()
	aiRallyTarget.clear()
}

export function tickAi(
	editor: Editor,
	playerId: PlayerId,
	allBuildings: BuildingSnap[],
	now: number
) {
	const last = lastDecisionAt.get(playerId) ?? -DECISION_INTERVAL_MS
	if (now - last < DECISION_INTERVAL_MS) return
	lastDecisionAt.set(playerId, now)

	const own = bucketize(allBuildings, playerId)
	if (own.townHalls.length === 0) return // wiped out

	const myUnits = units$.get().filter((u) => u.owner === playerId && u.hp > 0)
	const workers = myUnits.filter((u) => u.kind === 'worker')
	const fighters = myUnits.filter((u) => u.kind !== 'worker')

	keepWorkersGathering(playerId, workers)
	maybeTrainWorker(playerId, own, workers.length)
	maybeBuildBarracks(editor, playerId, own)
	maybeBuildFarm(editor, playerId, own)
	maybeBuildLibrary(editor, playerId, own)
	maybeResearch(editor, playerId, own)
	maybeTrainFighters(playerId, own, fighters.length)
	maybeBuildTower(editor, playerId, own)
	maybeBuildCastle(editor, playerId, own)
	maybeUpgrade(editor, playerId, own)
	maybePush(playerId, own, fighters, allBuildings, now)
}

function maybeBuildCastle(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	if (own.castles.length >= 1) return
	if (own.barracks.length === 0) return
	const cost = BUILDING_CONFIG.castle.cost
	const r = getResources(playerId)
	if (r.gold < cost.gold || r.wood < cost.wood) return
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG.castle.size, 220, 320)
	if (spot) placeBuilding(editor, 'castle', playerId, spot.x, spot.y)
}

// Upgrade priority: town-hall first (HP + food), then library (research speed
// follow-on), then barracks. We skip walls and farms unless really flush.
const AI_UPGRADE_PRIORITY: BuildingKind[] = ['town-hall', 'library', 'barracks', 'tower']

function maybeUpgrade(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	const r = getResources(playerId)
	if (r.gold < 200) return // keep some economy buffer
	for (const kind of AI_UPGRADE_PRIORITY) {
		const list = ownByKind(own, kind)
		for (const b of list) {
			if (b.upgradeLevel >= 1) continue
			if (canQueueUpgrade(b.id, editor, playerId) === 'queued') {
				queueUpgrade(b.id, editor, playerId)
				return
			}
		}
	}
}

function ownByKind(own: BuildingsByKind, kind: BuildingKind): BuildingSnap[] {
	if (kind === 'town-hall') return own.townHalls
	if (kind === 'barracks') return own.barracks
	if (kind === 'tower') return own.towers
	if (kind === 'library') return own.libraries
	if (kind === 'farm') return own.farms
	if (kind === 'wall') return own.walls
	if (kind === 'gate') return own.gates
	return own.castles
}

function bucketize(all: BuildingSnap[], owner: PlayerId): BuildingsByKind {
	const out: BuildingsByKind = {
		townHalls: [],
		barracks: [],
		towers: [],
		libraries: [],
		farms: [],
		walls: [],
		gates: [],
		castles: [],
	}
	for (const b of all) {
		if (b.owner !== owner) continue
		if (b.kind === 'town-hall') out.townHalls.push(b)
		else if (b.kind === 'barracks') out.barracks.push(b)
		else if (b.kind === 'tower') out.towers.push(b)
		else if (b.kind === 'library') out.libraries.push(b)
		else if (b.kind === 'farm') out.farms.push(b)
		else if (b.kind === 'wall') out.walls.push(b)
		else if (b.kind === 'gate') out.gates.push(b)
		else if (b.kind === 'castle') out.castles.push(b)
	}
	return out
}

function maybeBuildLibrary(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	if (own.libraries.length >= 1) return
	if (own.barracks.length === 0) return // need an army first
	const cost = BUILDING_CONFIG.library.cost
	const r = getResources(playerId)
	if (r.gold < cost.gold || r.wood < cost.wood) return
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG.library.size)
	if (spot) placeBuilding(editor, 'library', playerId, spot.x, spot.y)
}

function maybeBuildFarm(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	const r = getResources(playerId)
	// Build farms when we're food-capped or close to it, up to 3 farms.
	if (own.farms.length >= 3) return
	if (r.foodCap - r.food > 2) return
	const cost = BUILDING_CONFIG.farm.cost
	if (r.gold < cost.gold || r.wood < cost.wood) return
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG.farm.size, 110, 200)
	if (spot) placeBuilding(editor, 'farm', playerId, spot.x, spot.y)
}

// Generic tech priority. The AI's nation-specific signature tech is appended
// dynamically in pickNextTech so each player chases the unit they're allowed
// to train.
const AI_RESEARCH_ORDER_BASE: TechId[] = [
	'tools-of-the-trade',
	'sharp-blades',
	'cavalry-training',
	'heavy-armor',
	'reinforced-walls',
	'stonemasonry',
	'tower-marksmanship',
]

function maybeResearch(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	if (own.libraries.length === 0) return
	for (const library of own.libraries) {
		const queue = researchQueues.get(library.id) ?? []
		if (queue.length > 0) continue
		const techId = pickNextTech(editor, playerId)
		if (!techId) return
		queueResearch(editor, library.id, techId, playerId)
	}
}

function pickNextTech(editor: Editor, playerId: PlayerId): TechId | null {
	const completed = completedTechs$.get()[playerId] ?? new Set<TechId>()
	const nationId = playerNations$.get()[playerId]
	const order = [...AI_RESEARCH_ORDER_BASE]
	// The signature tech is the highest-priority unlock once its prereqs are
	// met. We slot it into the order right after its prereq chain so the AI
	// rushes the unique unit when feasible.
	if (nationId) {
		order.splice(2, 0, getNation(nationId).signatureTech)
	}
	for (const techId of order) {
		if (completed.has(techId)) continue
		if (canQueueResearch(editor, techId, playerId) === 'queued') return techId
	}
	void TECH_IDS
	return null
}

function maybeTrainWorker(playerId: PlayerId, own: BuildingsByKind, workerCount: number) {
	if (workerCount >= MAX_WORKERS) return
	const th = own.townHalls[0]
	if (!th) return
	const queue = trainQueues.get(th.id) ?? []
	if (queue.length >= 2) return
	queueUnit(th.id, 'worker', playerId)
}

function maybeTrainFighters(playerId: PlayerId, own: BuildingsByKind, fighterCount: number) {
	if (fighterCount >= MAX_FIGHTERS) return
	for (const b of own.barracks) {
		const queue = trainQueues.get(b.id) ?? []
		if (queue.length >= 2) continue
		// Prefer the unique unit if it's unlocked + affordable; else a knight if
		// researched; otherwise fall back to soldiers.
		const r = getResources(playerId)
		const nationId = playerNations$.get()[playerId]
		const uniqueKind = nationId ? getNation(nationId).uniqueUnit : null
		const uniqueOK =
			uniqueKind &&
			canTrainUnit(playerId, uniqueKind) &&
			r.gold >= UNIT_CONFIG[uniqueKind].trainCost.gold &&
			r.wood >= UNIT_CONFIG[uniqueKind].trainCost.wood &&
			r.food + UNIT_CONFIG[uniqueKind].trainCost.food <= r.foodCap
		const knightOK =
			isKnightUnlocked(playerId) &&
			r.gold >= UNIT_CONFIG.knight.trainCost.gold &&
			r.wood >= UNIT_CONFIG.knight.trainCost.wood
		let kind: UnitKind = 'soldier'
		if (uniqueOK && nextRandom() < 0.5) kind = uniqueKind!
		else if (knightOK && nextRandom() < 0.35) kind = 'knight'
		queueUnit(b.id, kind, playerId)
	}
}

function maybeBuildBarracks(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	if (own.barracks.length >= 2) return
	const cost = BUILDING_CONFIG.barracks.cost
	const r = getResources(playerId)
	if (r.gold < cost.gold || r.wood < cost.wood) return
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG.barracks.size)
	if (spot) placeBuilding(editor, 'barracks', playerId, spot.x, spot.y)
}

function maybeBuildTower(editor: Editor, playerId: PlayerId, own: BuildingsByKind) {
	if (own.towers.length >= 2) return
	const cost = BUILDING_CONFIG.tower.cost
	const r = getResources(playerId)
	if (r.gold < cost.gold || r.wood < cost.wood) return
	if (own.barracks.length === 0) return // build economy/army first
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG.tower.size, 130, 220)
	if (spot) placeBuilding(editor, 'tower', playerId, spot.x, spot.y)
}

// Pick an empty spot in a ring around the anchor building, snapping to the
// first open ring slot. Returns null if every slot is too close to other
// buildings.
function findOpenSpotNear(
	editor: Editor,
	anchor: BuildingSnap,
	size: number,
	minR = 130,
	maxR = 200
): { x: number; y: number } | null {
	const TRIES = 16
	for (let i = 0; i < TRIES; i++) {
		const angle = (i / TRIES) * Math.PI * 2
		const radius = minR + ((maxR - minR) * i) / TRIES
		const x = anchor.cx + Math.cos(angle) * radius
		const y = anchor.cy + Math.sin(angle) * radius
		// Trial placement: placeBuilding does its own bounds + overlap check, so
		// we just probe by calling a non-mutating preflight here. Since we want
		// to actually place, use placeBuilding which returns null on failure.
		// To avoid the resource side-effect on a probe, we inline the check.
		if (!intersects(editor, x, y, size)) return { x, y }
	}
	return null
}

function intersects(editor: Editor, cx: number, cy: number, size: number): boolean {
	const half = size / 2 + 18
	for (const shape of editor.getCurrentPageShapes()) {
		if (!shape.meta?.buildingKind) continue
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		if (
			cx + half < bounds.minX ||
			cx - half > bounds.maxX ||
			cy + half < bounds.minY ||
			cy - half > bounds.maxY
		) {
			continue
		}
		return true
	}
	return false
}

function keepWorkersGathering(_playerId: PlayerId, workers: Unit[]) {
	const idle = workers.filter((w) => w.command.type === 'idle' && w.gatherUntilMs === 0)
	if (idle.length === 0) return
	const ids = new Set(idle.map((w) => w.id))
	units$.update((list) =>
		list.map((u) => {
			if (!ids.has(u.id)) return u
			const r = nearestResource(u.x, u.y)
			if (!r) return u
			return { ...u, command: { type: 'gather', resourceId: r.id } }
		})
	)
}

function nearestResource(x: number, y: number) {
	let best = null as ReturnType<typeof resources$.get>[number] | null
	let bestDistSq = Infinity
	for (const r of resources$.get()) {
		if (r.remaining <= 0) continue
		const dx = r.x - x
		const dy = r.y - y
		const dsq = dx * dx + dy * dy
		if (dsq < bestDistSq) {
			bestDistSq = dsq
			best = r
		}
	}
	return best
}

// Send idle fighters at an enemy. Ramp-up + minimum army size keeps the AI
// from suiciding 1-by-1 on the human's town hall.
function maybePush(
	playerId: PlayerId,
	own: BuildingsByKind,
	fighters: Unit[],
	allBuildings: BuildingSnap[],
	now: number
) {
	if (now < AI_WARMUP_MS) return
	const idle = fighters.filter((u) => u.command.type === 'idle')
	if (idle.length === 0) return
	// First, defend: if any enemy is near our town hall, attack the nearest
	// regardless of army size.
	const th = own.townHalls[0]
	const nearbyEnemy = th ? findNearestEnemyUnit(playerId, th.cx, th.cy, VISION_RANGE_SQ) : null
	if (nearbyEnemy) {
		assignAttack(
			idle.map((u) => u.id),
			nearbyEnemy.id,
			null
		)
		return
	}

	// Otherwise, only push out once we have a critical mass.
	if (fighters.length < 4) return

	let target = aiRallyTarget.get(playerId) ?? null
	if (!target) {
		target = pickEnemyBaseTarget(playerId, allBuildings)
		aiRallyTarget.set(playerId, target)
	}
	if (!target) return
	// Move command toward the target; if any fighter strays into vision of an
	// enemy along the way, the unit step will switch to an auto-attack via the
	// idle-to-engage branch in the game loop.
	const ids = new Set(idle.map((u) => u.id))
	units$.update((list) =>
		list.map((u) => {
			if (!ids.has(u.id)) return u
			return { ...u, command: { type: 'move', x: target!.x, y: target!.y } }
		})
	)
	// Once the army arrives near the target, clear the rally so we re-pick a
	// fresh target for the next push (e.g. if the previous enemy was wiped).
	const arrivedNear = idle.some((u) => Math.hypot(u.x - target!.x, u.y - target!.y) < 80)
	if (arrivedNear) aiRallyTarget.set(playerId, null)
}

function pickEnemyBaseTarget(
	playerId: PlayerId,
	allBuildings: BuildingSnap[]
): { x: number; y: number } | null {
	const candidates = allBuildings.filter(
		(b) => isEnemyOf(playerId, b.owner) && b.kind === 'town-hall' && b.hp > 0
	)
	if (candidates.length === 0) return null
	const pick = candidates[nextInt(candidates.length)]
	return { x: pick.cx, y: pick.cy }
}

function findNearestEnemyUnit(
	viewer: PlayerId,
	x: number,
	y: number,
	maxDistSq: number
): Unit | null {
	let best: Unit | null = null
	let bestDistSq = maxDistSq
	for (const u of units$.get()) {
		if (!isEnemyOf(viewer, u.owner) || u.hp <= 0) continue
		const dx = u.x - x
		const dy = u.y - y
		const dsq = dx * dx + dy * dy
		if (dsq < bestDistSq) {
			bestDistSq = dsq
			best = u
		}
	}
	return best
}

function assignAttack(
	unitIds: number[],
	targetUnitId: number | null,
	targetBuildingId: TLShapeId | null
) {
	const ids = new Set(unitIds)
	units$.update((list) =>
		list.map((u) =>
			ids.has(u.id) ? { ...u, command: { type: 'attack', targetUnitId, targetBuildingId } } : u
		)
	)
}

import { Editor, TLShapeId } from 'tldraw'
import { DIFFICULTY_PROFILES, styleForNation } from './ai-strategy'
import {
	pickRememberedEnemyBase,
	pickScoutTarget,
	queryEnemyUnits,
	updateAiVision,
} from './ai-vision'
import {
	canQueueAgeAdvance,
	canQueueResearch,
	canQueueUpgrade,
	placeBuilding as _placeBuilding,
	queueAgeAdvance,
	queueResearch,
	queueUnit,
	queueUpgrade,
} from './building-actions'
import { BUILDING_CONFIG, BuildingKind } from './building-config'
import {
	acceptPeace,
	declareWar,
	declinePeace,
	diplomacyProposals$,
	getRelation,
	proposePeace,
} from './diplomacy'
import {
	Unit,
	aiDifficulty$,
	completedTechs$,
	getResources,
	playerNations$,
	researchQueues,
	resources$,
	trainQueues,
	units$,
} from './game-state'
import { getNation } from './nations'
import { pathfind } from './nav'
import { PLAYERS, PlayerId } from './players'
import { nextRandom } from './random'
import { canTrainUnit } from './tech'
import { TECH_IDS, TechId } from './tech-config'
import { UNIT_CONFIG, UnitKind } from './unit-config'

// Wrapper around placeBuilding that auto-assigns the AI's nearest idle worker
// to construct the new site. Otherwise the building would sit at 10% HP
// forever (the AI doesn't otherwise issue 'build' commands).
function placeBuilding(
	editor: Editor,
	kind: BuildingKind,
	playerId: PlayerId,
	cx: number,
	cy: number
): TLShapeId | null {
	const id = _placeBuilding(editor, kind, playerId, cx, cy)
	if (!id) return null
	// Pick the nearest idle worker (or just nearest worker — gather is fine
	// to interrupt for construction).
	let best: Unit | null = null
	let bestDsq = Infinity
	for (const u of units$.get()) {
		if (u.owner !== playerId || u.hp <= 0) continue
		if (u.kind !== 'worker') continue
		const dx = u.x - cx
		const dy = u.y - cy
		const dsq = dx * dx + dy * dy
		if (dsq < bestDsq) {
			bestDsq = dsq
			best = u
		}
	}
	if (best) {
		const builderId = best.id
		units$.update((list) =>
			list.map((u) =>
				u.id === builderId ? { ...u, command: { type: 'build', buildingId: id }, path: null } : u
			)
		)
	}
	return id
}

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
	archeryRanges: BuildingSnap[]
	stables: BuildingSnap[]
	monasteries: BuildingSnap[]
	siegeWorkshops: BuildingSnap[]
	mills: BuildingSnap[]
	lumberCamps: BuildingSnap[]
	miningCamps: BuildingSnap[]
	markets: BuildingSnap[]
	docks: BuildingSnap[]
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
	// True while the building is still being constructed by workers. Such
	// buildings can be damaged but can't train, fire, or contribute food cap.
	constructing: boolean
}

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
	const profile = DIFFICULTY_PROFILES[aiDifficulty$.get()]
	const last = lastDecisionAt.get(playerId) ?? -profile.decisionIntervalMs
	if (now - last < profile.decisionIntervalMs) return
	lastDecisionAt.set(playerId, now)

	// Refresh this AI's sightings (per-player fog of war): only see enemies
	// within range of its own alive units / buildings. Anything spotted is
	// remembered for ~90s after losing line of sight.
	updateAiVision(
		playerId,
		allBuildings.map((b) => ({
			id: b.id,
			kind: b.kind,
			owner: b.owner,
			cx: b.cx,
			cy: b.cy,
			hp: b.hp,
		})),
		now
	)

	const own = bucketize(allBuildings, playerId)
	if (own.townHalls.length === 0) return // wiped out

	const myUnits = units$.get().filter((u) => u.owner === playerId && u.hp > 0)
	const workers = myUnits.filter((u) => u.kind === 'worker')
	const fighters = myUnits.filter((u) => u.kind !== 'worker')

	keepWorkersGathering(playerId, workers)
	maybeAdvanceAge(playerId)
	maybeTrainWorker(playerId, own, workers.length, profile.maxWorkers)
	maybeBuildBarracks(editor, playerId, own, profile.parallelBuildingsCap)
	maybeBuildFarm(editor, playerId, own)
	maybeBuildLibrary(editor, playerId, own)
	maybeBuildArcheryRange(editor, playerId, own, profile.parallelBuildingsCap)
	maybeBuildStable(editor, playerId, own, profile.parallelBuildingsCap)
	maybeResearch(editor, playerId, own)
	maybeTrainFighters(playerId, own, fighters.length, profile.maxFighters)
	maybeBuildTower(editor, playerId, own)
	maybeBuildCastle(editor, playerId, own)
	maybeUpgrade(editor, playerId, own)
	maybeDiplomacy(playerId, fighters.length, now)
	maybePush(playerId, own, fighters, now, profile.warmupMs)
}

// Try to advance to the next age once it's affordable. Greedy — no
// economy-vs-research trade-off, just "if we can, do it".
function maybeAdvanceAge(playerId: PlayerId) {
	if (canQueueAgeAdvance(playerId) === 'queued') queueAgeAdvance(playerId)
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
		archeryRanges: [],
		stables: [],
		monasteries: [],
		siegeWorkshops: [],
		mills: [],
		lumberCamps: [],
		miningCamps: [],
		markets: [],
		docks: [],
	}
	for (const b of all) {
		if (b.owner !== owner) continue
		switch (b.kind) {
			case 'town-hall':
				out.townHalls.push(b)
				break
			case 'barracks':
				out.barracks.push(b)
				break
			case 'tower':
				out.towers.push(b)
				break
			case 'library':
				out.libraries.push(b)
				break
			case 'farm':
				out.farms.push(b)
				break
			case 'wall':
				out.walls.push(b)
				break
			case 'gate':
				out.gates.push(b)
				break
			case 'castle':
				out.castles.push(b)
				break
			case 'archery-range':
				out.archeryRanges.push(b)
				break
			case 'stable':
				out.stables.push(b)
				break
			case 'monastery':
				out.monasteries.push(b)
				break
			case 'siege-workshop':
				out.siegeWorkshops.push(b)
				break
			case 'mill':
				out.mills.push(b)
				break
			case 'lumber-camp':
				out.lumberCamps.push(b)
				break
			case 'mining-camp':
				out.miningCamps.push(b)
				break
			case 'market':
				out.markets.push(b)
				break
			case 'dock':
				out.docks.push(b)
				break
		}
	}
	return out
}

function maybeBuildArcheryRange(
	editor: Editor,
	playerId: PlayerId,
	own: BuildingsByKind,
	parallelCap: number
) {
	if (own.archeryRanges.length >= parallelCap) return
	if (own.barracks.length === 0) return // gate behind having a basic military first
	const cost = BUILDING_CONFIG['archery-range'].cost
	const r = getResources(playerId)
	if (r.gold < cost.gold || r.wood < cost.wood) return
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG['archery-range'].size)
	if (spot) placeBuilding(editor, 'archery-range', playerId, spot.x, spot.y)
}

function maybeBuildStable(
	editor: Editor,
	playerId: PlayerId,
	own: BuildingsByKind,
	parallelCap: number
) {
	if (own.stables.length >= parallelCap) return
	if (own.barracks.length === 0) return
	const cost = BUILDING_CONFIG.stable.cost
	const r = getResources(playerId)
	if (r.gold < cost.gold || r.wood < cost.wood) return
	const th = own.townHalls[0]
	if (!th) return
	const spot = findOpenSpotNear(editor, th, BUILDING_CONFIG.stable.size)
	if (spot) placeBuilding(editor, 'stable', playerId, spot.x, spot.y)
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
	'wheelbarrow',
	'sharp-blades',
	'masonry',
	'forging',
	'padded-armor',
	'stonemasonry',
	'blast-furnace',
	'architecture',
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

function maybeTrainWorker(
	playerId: PlayerId,
	own: BuildingsByKind,
	workerCount: number,
	maxWorkers: number
) {
	if (workerCount >= maxWorkers) return
	const th = own.townHalls[0]
	if (!th) return
	const queue = trainQueues.get(th.id) ?? []
	if (queue.length >= 2) return
	queueUnit(th.id, 'worker', playerId)
}

// Pick the next unit kind to train based on the civ's play-style composition
// weights, biased toward counters. Falls back to whatever the building can
// actually train.
function pickTrainKind(
	playerId: PlayerId,
	building: BuildingSnap,
	availableKinds: UnitKind[]
): UnitKind | null {
	const r = getResources(playerId)
	const nationId = playerNations$.get()[playerId]
	if (!nationId) return null
	const style = styleForNation(nationId)
	const uniqueKind = getNation(nationId).uniqueUnit
	// If this building trains the civ's unique and we have the signature tech,
	// roll for it first.
	if (
		availableKinds.includes(uniqueKind) &&
		UNIT_CONFIG[uniqueKind].trainedBy === building.kind &&
		canTrainUnit(playerId, uniqueKind) &&
		canAfford(r, uniqueKind) &&
		nextRandom() < 0.5
	) {
		return uniqueKind
	}
	// Otherwise pick from available kinds weighted by the civ's composition.
	const weighted: { kind: UnitKind; weight: number }[] = []
	for (const kind of availableKinds) {
		if (!canTrainUnit(playerId, kind)) continue
		if (!canAfford(r, kind)) continue
		const arch = UNIT_CONFIG[kind].archetype
		const weight = style.composition[arch] ?? 0
		if (weight > 0) weighted.push({ kind, weight })
	}
	if (weighted.length === 0) {
		// Style didn't list anything from this building. Train any trainable
		// kind we can afford so the barracks isn't idle.
		for (const kind of availableKinds) {
			if (canTrainUnit(playerId, kind) && canAfford(r, kind)) return kind
		}
		return null
	}
	const total = weighted.reduce((s, w) => s + w.weight, 0)
	let pick = nextRandom() * total
	for (const w of weighted) {
		pick -= w.weight
		if (pick <= 0) return w.kind
	}
	return weighted[weighted.length - 1].kind
}

function canAfford(
	r: { gold: number; wood: number; food: number; foodCap: number },
	kind: UnitKind
): boolean {
	const cost = UNIT_CONFIG[kind].trainCost
	return r.gold >= cost.gold && r.wood >= cost.wood && r.food + cost.food <= r.foodCap
}

function maybeTrainFighters(
	playerId: PlayerId,
	own: BuildingsByKind,
	fighterCount: number,
	maxFighters: number
) {
	if (fighterCount >= maxFighters) return
	// Train from every production building the AI has. Each is independent.
	for (const b of own.barracks) {
		const queue = trainQueues.get(b.id) ?? []
		if (queue.length >= 2) continue
		const kind = pickTrainKind(playerId, b, BUILDING_CONFIG.barracks.trains)
		if (kind) queueUnit(b.id, kind, playerId)
	}
	for (const b of own.archeryRanges) {
		const queue = trainQueues.get(b.id) ?? []
		if (queue.length >= 2) continue
		const kind = pickTrainKind(playerId, b, BUILDING_CONFIG['archery-range'].trains)
		if (kind) queueUnit(b.id, kind, playerId)
	}
	for (const b of own.stables) {
		const queue = trainQueues.get(b.id) ?? []
		if (queue.length >= 2) continue
		const kind = pickTrainKind(playerId, b, BUILDING_CONFIG.stable.trains)
		if (kind) queueUnit(b.id, kind, playerId)
	}
}

function maybeBuildBarracks(
	editor: Editor,
	playerId: PlayerId,
	own: BuildingsByKind,
	parallelCap: number
) {
	if (own.barracks.length >= parallelCap) return
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
			const mode = UNIT_CONFIG[u.kind].canTraverseWater === true ? 'water' : 'land'
			return {
				...u,
				command: { type: 'gather', resourceId: r.id },
				path: pathfind(u.x, u.y, r.x, r.y, mode),
			}
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

// Send idle fighters at an enemy. Uses per-AI sightings instead of being
// omniscient — the AI can only push toward enemy bases it has actually seen.
// If it knows nothing, sends a scout to the next unexplored quadrant first.
function maybePush(
	playerId: PlayerId,
	own: BuildingsByKind,
	fighters: Unit[],
	now: number,
	warmupMs: number
) {
	if (now < warmupMs) return
	const idle = fighters.filter((u) => u.command.type === 'idle')
	if (idle.length === 0) return

	// Defend: if a remembered enemy unit is near our town hall, attack-move
	// the army onto it. Uses sightings — only enemies we've actually seen
	// count, so we don't react to invisible attackers.
	const th = own.townHalls[0]
	if (th) {
		const enemies = queryEnemyUnits(playerId)
		let nearestEnemy: { x: number; y: number } | null = null
		let bestDsq = VISION_RANGE_SQ
		for (const e of enemies) {
			if (!e.visibleNow) continue
			const dx = e.x - th.cx
			const dy = e.y - th.cy
			const dsq = dx * dx + dy * dy
			if (dsq < bestDsq) {
				bestDsq = dsq
				nearestEnemy = { x: e.x, y: e.y }
			}
		}
		if (nearestEnemy) {
			issueAttackMove(idle, nearestEnemy.x, nearestEnemy.y)
			return
		}
	}

	// Otherwise, only push out once we have the civ-style critical mass.
	const nationId = playerNations$.get()[playerId]
	const pushSize = nationId ? styleForNation(nationId).pushArmySize : 6
	if (fighters.length < pushSize) return

	let target = aiRallyTarget.get(playerId) ?? null
	if (!target && th) {
		target = pickRememberedEnemyBase(playerId, th.cx, th.cy)
		if (!target) {
			// We've never seen an enemy base — go scout instead.
			target = pickScoutTarget(playerId)
		}
		aiRallyTarget.set(playerId, target)
	}
	if (!target) return
	issueAttackMove(idle, target.x, target.y)
	// Once the army arrives near the target, clear the rally so we re-pick a
	// fresh target for the next push.
	const arrivedNear = idle.some((u) => Math.hypot(u.x - target!.x, u.y - target!.y) < 80)
	if (arrivedNear) aiRallyTarget.set(playerId, null)
}

function issueAttackMove(units: Unit[], gx: number, gy: number) {
	const ids = new Set(units.map((u) => u.id))
	units$.update((list) =>
		list.map((u) => {
			if (!ids.has(u.id)) return u
			const mode = UNIT_CONFIG[u.kind].canTraverseWater === true ? 'water' : 'land'
			return {
				...u,
				command: { type: 'attack-move', x: gx, y: gy },
				path: pathfind(u.x, u.y, gx, gy, mode),
			}
		})
	)
}

// Diplomacy: AI proposes peace when losing badly, accepts when offered if
// it's not currently winning, declines when dominant, occasionally declares
// war when overwhelmingly strong. Strength is judged from this AI's own
// sightings — it doesn't peek at the actual scores.
function maybeDiplomacy(playerId: PlayerId, ownFighters: number, now: number) {
	const nationId = playerNations$.get()[playerId]
	const aggression = nationId ? styleForNation(nationId).aggression : 0.5

	// Respond to pending incoming proposals first.
	const proposals = diplomacyProposals$.get()
	for (const p of proposals) {
		if (p.to !== playerId) continue
		// Estimate the proposer's strength relative to ours from sightings.
		const proposerSighted = countSightedFighters(playerId, p.from)
		// If aggression is high, decline most peace offers.
		const acceptThreshold = 1.2 - aggression // rush ≈ 0.35, turtle ≈ 0.9
		const ratio = proposerSighted === 0 ? 0.5 : ownFighters / Math.max(1, proposerSighted)
		if (ratio < acceptThreshold) {
			acceptPeace(p.from, playerId, now)
		} else {
			declinePeace(p.from, playerId, now)
		}
	}

	// Propose peace to whichever enemy is beating us (we see lots of their
	// units, we have few). Throttled by the cooldown inside proposePeace.
	for (const p of PLAYERS) {
		if (p.id === playerId) continue
		if (getRelation(playerId, p.id) === 'peace') continue
		const enemySighted = countSightedFighters(playerId, p.id)
		if (enemySighted >= 4 && ownFighters * 2 <= enemySighted) {
			proposePeace(playerId, p.id, now)
		}
	}

	// Aggressive civs occasionally declare war on a peaceful neighbour they
	// dominate. Rare — a roll on each AI tick.
	if (aggression > 0.7 && nextRandom() < 0.005) {
		for (const p of PLAYERS) {
			if (p.id === playerId) continue
			if (getRelation(playerId, p.id) === 'war') continue
			const enemySighted = countSightedFighters(playerId, p.id)
			if (ownFighters > enemySighted * 2 && ownFighters >= 8) {
				declareWar(playerId, p.id, now)
				break
			}
		}
	}
}

function countSightedFighters(playerId: PlayerId, owner: PlayerId): number {
	let n = 0
	for (const e of queryEnemyUnits(playerId)) {
		if (e.owner !== owner) continue
		if (e.unitKind === 'worker') continue
		n++
	}
	return n
}

import { Editor, TLShapeId } from 'tldraw'
import { BuildingSnap, resetAi, tickAi } from './ai'
import { finishUpgrade } from './building-actions'
import {
	BUILDING_CONFIG,
	getBuildingGateOpen,
	getBuildingHp,
	getBuildingKind,
	getBuildingOwner,
	getBuildingUpgradeLevel,
	getEffectiveAttack,
	getEffectiveFoodCapacity,
	getEffectiveTerritoryRadius,
} from './building-config'
import { computeFog, resetFog } from './fog'
import { flushTickStats, time } from './perf'
import { nextRandom } from './random'
void getEffectiveTerritoryRadius // referenced by overlays; keep it next to the building helpers

import {
	Command,
	PROJECTILE_MAX_AGE_MS,
	Projectile,
	ResearchQueueItem,
	ResourceNode,
	TrainQueueItem,
	Unit,
	buildingCooldowns,
	completedTechs$,
	damageNumbers$,
	elapsedMs$,
	fogVersion$,
	gainBounty,
	gameOver$,
	gameStarted$,
	nextProjectileId,
	paused$,
	nextUnitId,
	upgradeQueues,
	upgradeQueuesAtom$,
	playerResources$,
	projectiles$,
	researchQueues,
	researchQueuesAtom$,
	resources$,
	selectedUnitIds$,
	spawnDamageNumber,
	trainQueues,
	trainQueuesAtom$,
	units$,
	updateResources,
} from './game-state'
import { HUMAN_PLAYER_ID, PLAYERS, PlayerId, isEnemyOf } from './players'
import {
	getCarryMultiplier,
	getDamageMultiplier,
	getTowerRangeMultiplier,
	getUnitHpMultiplier,
	getUnitSpeedMultiplier,
} from './tech'
import { UNIT_CONFIG, UnitKind } from './unit-config'

const HIT_FLASH_MS = 180
const DAMAGE_NUMBER_DURATION_MS = 700
const ARRIVE_DIST = 6
const GATHER_DURATION_MS = 1500
const DEPOSIT_RANGE = 38
const AUTO_ENGAGE_RANGE = 220

let lastBuildingsByTick: BuildingSnap[] = []
let lastBuildingsById = new Map<TLShapeId, BuildingSnap>()

export function resetGameLoop() {
	lastBuildingsByTick = []
	lastBuildingsById = new Map()
	resetAi()
	resetFog()
}

export function runGameTick(editor: Editor, dtMs: number) {
	if (!gameStarted$.get()) return
	if (gameOver$.get()) return
	if (paused$.get()) return
	const now = elapsedMs$.get() + dtMs
	elapsedMs$.set(now)
	const dt = dtMs / 1000

	// Each phase is wrapped with `time()` so we can spot regressions and find
	// optimization targets — see perf.ts for what to look at next. Overhead
	// per call is ~1µs; ten phases = ~10µs/tick, well below noise.
	time('syncBuildings', () => syncBuildings(editor))
	time('tickTraining', () => tickTraining(now))
	time('tickResearch', () => tickResearch(now))
	time('tickUpgrades', () => tickUpgrades(editor, now))
	time('tickUnits', () => tickUnits(editor, dt, now))
	time('tickTowers', () => tickTowers(now))
	time('tickProjectiles', () => tickProjectiles(editor, dt, dtMs, now))
	time('tickDamageNumbers', () => tickDamageNumbers(dtMs))
	// Recompute fog after units/buildings have moved/died, before AI sees
	// the world. AI players ignore fog so it doesn't matter for them, but
	// keeping it in this order means the next render sees fresh fog.
	time('computeFog', () => computeFog(HUMAN_PLAYER_ID, units$.get(), lastBuildingsByTick))
	fogVersion$.update((v) => v + 1)
	time('tickAi', () => {
		for (const p of PLAYERS) {
			if (p.isHuman) continue
			tickAi(editor, p.id, lastBuildingsByTick, now)
		}
	})
	checkEndConditions()
	flushTickStats()
}

// ------------------------------ buildings -------------------------------

function snapshotBuildings(editor: Editor): BuildingSnap[] {
	const out: BuildingSnap[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		const kind = getBuildingKind(shape)
		if (!kind) continue
		const owner = getBuildingOwner(shape)
		if (!owner) continue
		const cfg = BUILDING_CONFIG[kind]
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		out.push({
			id: shape.id,
			kind,
			owner,
			cx: bounds.center.x,
			cy: bounds.center.y,
			halfSize: cfg.size / 2,
			hp: getBuildingHp(shape),
			upgradeLevel: getBuildingUpgradeLevel(shape),
			gateOpen: kind === 'gate' ? getBuildingGateOpen(shape) : false,
		})
	}
	return out
}

function syncBuildings(editor: Editor) {
	lastBuildingsByTick = snapshotBuildings(editor)
	lastBuildingsById = new Map(lastBuildingsByTick.map((b) => [b.id, b]))

	// Recompute foodCap per player. Upgraded buildings contribute their
	// effective food capacity (level 1 buildings keep their base value).
	const foodCapByOwner = new Map<PlayerId, number>()
	for (const p of PLAYERS) foodCapByOwner.set(p.id, 0)
	const liveIds = new Set<TLShapeId>()
	for (const shape of editor.getCurrentPageShapes()) {
		const kind = getBuildingKind(shape)
		if (!kind) continue
		const owner = getBuildingOwner(shape)
		if (!owner) continue
		const level = getBuildingUpgradeLevel(shape)
		const cap = getEffectiveFoodCapacity(kind, level)
		foodCapByOwner.set(owner, (foodCapByOwner.get(owner) ?? 0) + cap)
	}
	for (const b of lastBuildingsByTick) {
		liveIds.add(b.id)
	}
	playerResources$.update((all) => {
		const next = { ...all }
		let changed = false
		for (const [id, cap] of foodCapByOwner) {
			if (next[id] && next[id].foodCap !== cap) {
				next[id] = { ...next[id], foodCap: cap }
				changed = true
			}
		}
		return changed ? next : all
	})
	for (const id of [...trainQueues.keys()]) {
		if (!liveIds.has(id)) trainQueues.delete(id)
	}
	for (const id of [...buildingCooldowns.keys()]) {
		if (!liveIds.has(id)) buildingCooldowns.delete(id)
	}
	for (const id of [...researchQueues.keys()]) {
		if (!liveIds.has(id)) researchQueues.delete(id)
	}
	for (const id of [...upgradeQueues.keys()]) {
		if (!liveIds.has(id)) upgradeQueues.delete(id)
	}
}

// Upgrade per-tick: apply finished upgrades. Each shape can have at most one
// upgrade in flight (we cap at level 1 in canQueueUpgrade), so this is a
// simple linear pass.
function tickUpgrades(editor: Editor, now: number) {
	if (upgradeQueues.size === 0) return
	let mutated = false
	for (const [shapeId, item] of upgradeQueues) {
		if (!item) continue
		if (now - item.startedAtMs < item.durationMs) continue
		finishUpgrade(editor, shapeId)
		upgradeQueues.delete(shapeId)
		mutated = true
	}
	if (mutated) {
		const snap: Record<
			string,
			typeof upgradeQueues extends Map<TLShapeId, infer V> ? V : never
		> = {}
		for (const [id, item] of upgradeQueues) snap[id as unknown as string] = item
		upgradeQueuesAtom$.set(snap)
	}
}

function findNearestPlayerDropOff(owner: PlayerId, x: number, y: number): BuildingSnap | null {
	let best: BuildingSnap | null = null
	let bestDistSq = Infinity
	for (const b of lastBuildingsByTick) {
		if (b.owner !== owner || b.hp <= 0) continue
		if (!BUILDING_CONFIG[b.kind].isDropOff) continue
		const dx = b.cx - x
		const dy = b.cy - y
		const distSq = dx * dx + dy * dy
		if (distSq < bestDistSq) {
			best = b
			bestDistSq = distSq
		}
	}
	return best
}

// ------------------------------ training --------------------------------

function tickTraining(now: number) {
	if (trainQueues.size === 0) return
	let mutated = false
	for (const [shapeId, queue] of trainQueues) {
		if (queue.length === 0) continue
		const head = queue[0]
		if (now - head.startedAtMs < head.durationMs) continue
		const building = lastBuildingsById.get(shapeId)
		if (!building) {
			queue.shift()
			mutated = true
			continue
		}
		// Spawn just outside the building footprint.
		const angle = nextRandom() * Math.PI * 2
		const distFromCenter = building.halfSize + 26
		const x = building.cx + Math.cos(angle) * distFromCenter
		const y = building.cy + Math.sin(angle) * distFromCenter
		spawnUnit(head.kind, x, y, building.owner)
		queue.shift()
		// Re-anchor the next item's start to "now" so the head clock matches the
		// game-loop's elapsedMs (toolbar enqueues set startedAtMs=0 for non-head
		// items because they don't know when the head will pop).
		if (queue.length > 0) queue[0].startedAtMs = now
		mutated = true
	}
	if (mutated) trainQueuesAtom$.set(snapshotTrainQueues())
}

function snapshotTrainQueues(): Record<string, TrainQueueItem[]> {
	const out: Record<string, TrainQueueItem[]> = {}
	for (const [id, queue] of trainQueues) {
		out[id as unknown as string] = queue.slice()
	}
	return out
}

function snapshotResearchQueues(): Record<string, ResearchQueueItem[]> {
	const out: Record<string, ResearchQueueItem[]> = {}
	for (const [id, queue] of researchQueues) {
		out[id as unknown as string] = queue.slice()
	}
	return out
}

// Mirrors tickTraining but for the smithies' research queues. On completion
// the head item's techId is added to the library owner's completedTechs set.
function tickResearch(now: number) {
	if (researchQueues.size === 0) return
	let mutated = false
	for (const [shapeId, queue] of researchQueues) {
		if (queue.length === 0) continue
		const head = queue[0]
		if (now - head.startedAtMs < head.durationMs) continue
		const building = lastBuildingsById.get(shapeId)
		if (!building) {
			queue.shift()
			mutated = true
			continue
		}
		completedTechs$.update((prev) => {
			const existing = prev[building.owner] ?? new Set()
			if (existing.has(head.techId)) return prev
			const next = new Set(existing)
			next.add(head.techId)
			return { ...prev, [building.owner]: next }
		})
		queue.shift()
		if (queue.length > 0) queue[0].startedAtMs = now
		mutated = true
	}
	if (mutated) researchQueuesAtom$.set(snapshotResearchQueues())
}

export function spawnUnit(kind: UnitKind, x: number, y: number, owner: PlayerId) {
	const cfg = UNIT_CONFIG[kind]
	// Heavy armor tech buffs HP at spawn time only; existing units don't heal up.
	const hpMult = kind === 'worker' ? 1 : getUnitHpMultiplier(owner)
	const maxHp = Math.round(cfg.maxHp * hpMult)
	const unit: Unit = {
		id: nextUnitId(),
		kind,
		owner,
		x,
		y,
		hp: maxHp,
		maxHp,
		command: { type: 'idle' },
		nextAttackAtMs: 0,
		carrying: null,
		gatherUntilMs: 0,
		hitFlashUntilMs: 0,
	}
	units$.update((list) => [...list, unit])
	updateResources(owner, (r) => ({ ...r, food: r.food + 1 }))
}

// ------------------------------ units -----------------------------------

function tickUnits(editor: Editor, dt: number, now: number) {
	const units = units$.get()
	if (units.length === 0) return
	const next: Unit[] = []
	for (const unit of units) {
		const updated = stepUnit(editor, unit, dt, now)
		if (updated) next.push(updated)
	}
	units$.set(next)
}

function stepUnit(editor: Editor, unit: Unit, dt: number, now: number): Unit | null {
	if (unit.hp <= 0) {
		// We don't track which player landed the killing blow exactly, so credit
		// the closest enemy player — usually the same as the unit that finished
		// the kill. Cheap, and good enough for the bounty/score loop.
		const killer = pickClosestEnemy(unit.owner, unit.x, unit.y)
		if (killer) gainBounty(killer, UNIT_CONFIG[unit.kind].bounty)
		updateResources(unit.owner, (r) => ({ ...r, food: Math.max(0, r.food - 1) }))
		if (unit.owner === HUMAN_PLAYER_ID) {
			selectedUnitIds$.update((ids) => {
				if (!ids.has(unit.id)) return ids
				const next = new Set(ids)
				next.delete(unit.id)
				return next
			})
		}
		return null
	}

	if (unit.gatherUntilMs > 0) {
		if (now < unit.gatherUntilMs) return unit
		return finishGather(unit)
	}

	// Idle re-engage: any unit that finishes a command and finds an enemy in
	// vision picks them up. Workers don't auto-engage — they keep gathering.
	if (unit.command.type === 'idle' && unit.kind !== 'worker') {
		const enemy = findNearestEnemyUnit(unit.owner, unit.x, unit.y, AUTO_ENGAGE_RANGE)
		if (enemy) {
			unit = {
				...unit,
				command: { type: 'attack', targetUnitId: enemy.id, targetBuildingId: null },
			}
		}
	}

	switch (unit.command.type) {
		case 'idle':
			return unit
		case 'move':
			return stepMove(unit, dt)
		case 'attack':
			return stepAttack(editor, unit, dt, now)
		case 'gather':
			return stepGather(unit, dt, now)
		case 'return':
			return stepReturn(unit, dt)
	}
}

function pickClosestEnemy(viewer: PlayerId, x: number, y: number): PlayerId | null {
	let best: PlayerId | null = null
	let bestDistSq = Infinity
	for (const u of units$.get()) {
		if (!isEnemyOf(viewer, u.owner)) continue
		if (u.hp <= 0) continue
		const dx = u.x - x
		const dy = u.y - y
		const dsq = dx * dx + dy * dy
		if (dsq < bestDistSq) {
			bestDistSq = dsq
			best = u.owner
		}
	}
	return best
}

// ------------------------ building collision ----------------------------
//
// Units can't walk through buildings. Walls and closed gates block everyone
// (including their owner — realistic enough); open gates pass everyone
// including enemies. Units that start a tick already overlapping a building
// (e.g. spawned next to one, or hitbox just grazing the edge) are exempted
// for that building so they don't get permanently trapped.
//
// Sliding is axis-aligned: try moving on X first; if that collides, hold X.
// Then try moving on Y with whatever X we accepted. This is the standard AABB
// platformer trick — cheap and produces "slide along the wall" steering.

function isPassableForUnit(b: BuildingSnap): boolean {
	if (b.hp <= 0) return true
	if (b.kind === 'gate' && b.gateOpen) return true
	return false
}

function unitOverlapsBuilding(b: BuildingSnap, x: number, y: number, radius: number): boolean {
	const half = b.halfSize
	return (
		x > b.cx - half - radius &&
		x < b.cx + half + radius &&
		y > b.cy - half - radius &&
		y < b.cy + half + radius
	)
}

function clampMoveAgainstBuildings(
	prevX: number,
	prevY: number,
	nextX: number,
	nextY: number,
	radius: number
): { x: number; y: number } {
	if (lastBuildingsByTick.length === 0) return { x: nextX, y: nextY }
	const blocking: BuildingSnap[] = []
	for (const b of lastBuildingsByTick) {
		if (isPassableForUnit(b)) continue
		// If the unit is already inside this building's footprint at the start
		// of the step, don't constrain against it — they'll walk out and the
		// next tick will start enforcing.
		if (unitOverlapsBuilding(b, prevX, prevY, radius)) continue
		blocking.push(b)
	}
	if (blocking.length === 0) return { x: nextX, y: nextY }
	let x = nextX
	for (const b of blocking) {
		if (unitOverlapsBuilding(b, x, prevY, radius)) {
			x = prevX
			break
		}
	}
	let y = nextY
	for (const b of blocking) {
		if (unitOverlapsBuilding(b, x, y, radius)) {
			y = prevY
			break
		}
	}
	return { x, y }
}

function findNearestEnemyUnit(viewer: PlayerId, x: number, y: number, range: number): Unit | null {
	let best: Unit | null = null
	let bestDistSq = range * range
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

function stepMove(unit: Unit, dt: number): Unit {
	const cmd = unit.command
	if (cmd.type !== 'move') return unit
	const cfg = UNIT_CONFIG[unit.kind]
	const dx = cmd.x - unit.x
	const dy = cmd.y - unit.y
	const dist = Math.hypot(dx, dy)
	if (dist <= ARRIVE_DIST) {
		return { ...unit, command: { type: 'idle' } }
	}
	const step = Math.min(dist, cfg.speed * getUnitSpeedMultiplier(unit.owner) * dt)
	const candX = unit.x + (dx / dist) * step
	const candY = unit.y + (dy / dist) * step
	const clamped = clampMoveAgainstBuildings(unit.x, unit.y, candX, candY, cfg.radius)
	return { ...unit, x: clamped.x, y: clamped.y }
}

function stepAttack(editor: Editor, unit: Unit, dt: number, now: number): Unit {
	const cmd = unit.command
	if (cmd.type !== 'attack') return unit
	const cfg = UNIT_CONFIG[unit.kind]
	const { targetUnitId, targetBuildingId } = cmd

	let tx = 0
	let ty = 0
	let targetRadius = 0
	let isBuilding = false
	let exists = false

	if (targetUnitId !== null) {
		const target = units$.get().find((u) => u.id === targetUnitId)
		if (target && target.hp > 0 && isEnemyOf(unit.owner, target.owner)) {
			tx = target.x
			ty = target.y
			targetRadius = UNIT_CONFIG[target.kind].radius
			exists = true
		}
	} else if (targetBuildingId !== null) {
		const b = lastBuildingsById.get(targetBuildingId)
		if (b && b.hp > 0 && isEnemyOf(unit.owner, b.owner)) {
			tx = b.cx
			ty = b.cy
			targetRadius = b.halfSize
			isBuilding = true
			exists = true
		}
	}

	if (!exists) {
		return { ...unit, command: { type: 'idle' } }
	}

	const dx = tx - unit.x
	const dy = ty - unit.y
	const dist = Math.hypot(dx, dy)
	const reach = Math.sqrt(cfg.attackRangeSq) + targetRadius

	if (dist > reach) {
		const step = Math.min(dist - reach + 1, cfg.speed * getUnitSpeedMultiplier(unit.owner) * dt)
		const candX = unit.x + (dx / dist) * step
		const candY = unit.y + (dy / dist) * step
		const clamped = clampMoveAgainstBuildings(unit.x, unit.y, candX, candY, cfg.radius)
		return { ...unit, x: clamped.x, y: clamped.y }
	}

	if (now < unit.nextAttackAtMs) return unit
	const dmg = Math.round(cfg.attackDamage * getDamageMultiplier(unit.owner))
	if (isBuilding && targetBuildingId !== null) {
		applyBuildingDamage(editor, targetBuildingId, dmg, unit.owner, tx, ty)
	} else if (targetUnitId !== null) {
		applyUnitDamage(targetUnitId, dmg, unit.owner, now)
	}
	return { ...unit, nextAttackAtMs: now + cfg.attackCooldownMs }
}

function stepGather(unit: Unit, dt: number, now: number): Unit {
	const cmd = unit.command
	if (cmd.type !== 'gather') return unit
	const cfg = UNIT_CONFIG[unit.kind]
	const resource = resources$.get().find((r) => r.id === cmd.resourceId)
	if (!resource || resource.remaining <= 0) {
		const replacement = findNearestResource(unit.x, unit.y, resource?.kind ?? 'tree')
		if (replacement) {
			return { ...unit, command: { type: 'gather', resourceId: replacement.id } }
		}
		return { ...unit, command: { type: 'idle' } }
	}
	const dx = resource.x - unit.x
	const dy = resource.y - unit.y
	const dist = Math.hypot(dx, dy)
	const reach = resource.radius + cfg.radius - 4
	if (dist > reach) {
		const step = Math.min(dist - reach + 1, cfg.speed * getUnitSpeedMultiplier(unit.owner) * dt)
		const candX = unit.x + (dx / dist) * step
		const candY = unit.y + (dy / dist) * step
		const clamped = clampMoveAgainstBuildings(unit.x, unit.y, candX, candY, cfg.radius)
		return { ...unit, x: clamped.x, y: clamped.y }
	}
	return { ...unit, gatherUntilMs: now + GATHER_DURATION_MS, x: resource.x, y: resource.y }
}

function finishGather(unit: Unit): Unit {
	const cmd = unit.command
	if (cmd.type !== 'gather') {
		return { ...unit, gatherUntilMs: 0 }
	}
	const cfg = UNIT_CONFIG[unit.kind]
	const resourceId = cmd.resourceId
	let pickedUp = 0
	let resourceKind: 'wood' | 'gold' | 'stone' = 'wood'
	const carryCap = Math.round(cfg.carryCapacity * getCarryMultiplier(unit.owner))
	resources$.update((list) =>
		list.map((r) => {
			if (r.id !== resourceId) return r
			resourceKind = r.kind === 'tree' ? 'wood' : r.kind === 'mine' ? 'gold' : 'stone'
			const take = Math.min(r.remaining, carryCap)
			pickedUp = take
			return { ...r, remaining: r.remaining - take }
		})
	)
	if (pickedUp <= 0) {
		return { ...unit, gatherUntilMs: 0, command: { type: 'idle' } }
	}
	return {
		...unit,
		gatherUntilMs: 0,
		carrying: { resource: resourceKind, amount: pickedUp },
		command: { type: 'return', buildingId: null },
	}
}

function stepReturn(unit: Unit, dt: number): Unit {
	const cmd = unit.command
	if (cmd.type !== 'return') return unit
	const cfg = UNIT_CONFIG[unit.kind]
	let target = cmd.buildingId !== null ? lastBuildingsById.get(cmd.buildingId) : null
	if (!target || target.hp <= 0 || target.owner !== unit.owner) {
		const found = findNearestPlayerDropOff(unit.owner, unit.x, unit.y)
		if (!found) {
			return { ...unit, command: { type: 'idle' } }
		}
		target = found
	}
	const dx = target.cx - unit.x
	const dy = target.cy - unit.y
	const dist = Math.hypot(dx, dy)
	if (dist > target.halfSize + DEPOSIT_RANGE) {
		const step = cfg.speed * getUnitSpeedMultiplier(unit.owner) * dt
		const candX = unit.x + (dx / dist) * step
		const candY = unit.y + (dy / dist) * step
		const clamped = clampMoveAgainstBuildings(unit.x, unit.y, candX, candY, cfg.radius)
		return {
			...unit,
			command: { type: 'return', buildingId: target.id },
			x: clamped.x,
			y: clamped.y,
		}
	}
	const carrying = unit.carrying
	if (carrying) {
		updateResources(unit.owner, (r) => {
			if (carrying.resource === 'wood') return { ...r, wood: r.wood + carrying.amount }
			if (carrying.resource === 'gold') return { ...r, gold: r.gold + carrying.amount }
			return { ...r, stone: r.stone + carrying.amount }
		})
	}
	const replacement = findNearestResource(
		unit.x,
		unit.y,
		carrying?.resource === 'gold' ? 'mine' : carrying?.resource === 'stone' ? 'quarry' : 'tree'
	)
	const next: Command = replacement
		? { type: 'gather', resourceId: replacement.id }
		: { type: 'idle' }
	return { ...unit, carrying: null, command: next }
}

function findNearestResource(x: number, y: number, kind: ResourceNode['kind']) {
	let best: ResourceNode | null = null
	let bestDistSq = Infinity
	for (const r of resources$.get()) {
		if (r.kind !== kind || r.remaining <= 0) continue
		const dx = r.x - x
		const dy = r.y - y
		const distSq = dx * dx + dy * dy
		if (distSq < bestDistSq) {
			best = r
			bestDistSq = distSq
		}
	}
	return best
}

// ------------------------------ damage ----------------------------------

function applyUnitDamage(targetId: number, amount: number, attacker: PlayerId, now: number) {
	void attacker
	const list = units$.get()
	let hitX = 0
	let hitY = 0
	let hit = false
	const next = list.map((u) => {
		if (u.id !== targetId) return u
		hit = true
		hitX = u.x
		hitY = u.y
		return { ...u, hp: u.hp - amount, hitFlashUntilMs: now + HIT_FLASH_MS }
	})
	if (!hit) return
	units$.set(next)
	spawnDamageNumber(hitX, hitY, amount)
}

function applyBuildingDamage(
	editor: Editor,
	id: TLShapeId,
	amount: number,
	attacker: PlayerId,
	fxX: number,
	fxY: number
) {
	const snap = lastBuildingsById.get(id)
	if (!snap) return
	const newHp = snap.hp - amount
	if (newHp <= 0) {
		lastBuildingsById.delete(id)
		lastBuildingsByTick = lastBuildingsByTick.filter((b) => b.id !== id)
		trainQueues.delete(id)
		buildingCooldowns.delete(id)
		// Award attacker a bounty for finishing a building.
		gainBounty(attacker, 40)
		editor.run(() => editor.deleteShape(id), { ignoreShapeLock: true })
		spawnDamageNumber(fxX, fxY, amount)
		return
	}
	snap.hp = newHp
	const editorShape = editor.getShape(id)
	if (editorShape) {
		editor.run(
			() =>
				editor.updateShape({
					id,
					type: 'geo',
					meta: { ...editorShape.meta, hp: newHp },
				}),
			{ ignoreShapeLock: true }
		)
	}
	spawnDamageNumber(fxX, fxY, amount)
}

// ------------------------------ towers ----------------------------------

function tickTowers(now: number) {
	for (const b of lastBuildingsByTick) {
		if (b.hp <= 0) continue
		// Use the upgrade-aware attack stats so a Bastion-level tower (or
		// upgraded Castle) gets the +30% damage / range bump it paid for.
		const cfg = getEffectiveAttack(b.kind, b.upgradeLevel)
		if (!cfg) continue
		const cd = buildingCooldowns.get(b.id)
		if (cd && now - cd.lastFiredAt < cfg.fireRateMs) continue
		// Pick nearest enemy. Tower marksmanship tech extends the range
		// retroactively, so we read the multiplier here per fire.
		const rangeMult = getTowerRangeMultiplier(b.owner)
		const effectiveRangeSq = cfg.rangeSq * rangeMult * rangeMult
		let target: Unit | null = null
		let bestDistSq = effectiveRangeSq
		for (const u of units$.get()) {
			if (!isEnemyOf(b.owner, u.owner) || u.hp <= 0) continue
			const dx = u.x - b.cx
			const dy = u.y - b.cy
			const distSq = dx * dx + dy * dy
			if (distSq <= bestDistSq) {
				bestDistSq = distSq
				target = u
			}
		}
		if (!target) continue
		const dx = target.x - b.cx
		const dy = target.y - b.cy
		const dist = Math.hypot(dx, dy) || 1
		const projectile: Projectile = {
			id: nextProjectileId(),
			x: b.cx,
			y: b.cy,
			vx: (dx / dist) * cfg.projectileSpeed,
			vy: (dy / dist) * cfg.projectileSpeed,
			damage: Math.round(cfg.damage * getDamageMultiplier(b.owner)),
			owner: b.owner,
			targetUnitId: target.id,
			targetBuildingId: null,
			ageMs: 0,
		}
		projectiles$.update((list) => [...list, projectile])
		buildingCooldowns.set(b.id, { lastFiredAt: now })
	}
}

// --------------------------- projectiles --------------------------------

function tickProjectiles(_editor: Editor, dt: number, dtMs: number, now: number) {
	const list = projectiles$.get()
	if (list.length === 0) return
	const surviving: Projectile[] = []
	const allUnits = units$.get()
	for (const p of list) {
		const ageMs = p.ageMs + dtMs
		if (ageMs > PROJECTILE_MAX_AGE_MS) continue
		const x = p.x + p.vx * dt
		const y = p.y + p.vy * dt
		// Hit-test against enemies of the projectile's owner.
		const enemies = allUnits.filter((u) => u.hp > 0 && isEnemyOf(p.owner, u.owner))
		let hit: Unit | null = null
		const target = p.targetUnitId !== null ? enemies.find((e) => e.id === p.targetUnitId) : null
		if (target) {
			const dx = target.x - x
			const dy = target.y - y
			const r = UNIT_CONFIG[target.kind].radius
			if (dx * dx + dy * dy <= r * r) hit = target
		}
		if (!hit) {
			for (const e of enemies) {
				const dx = e.x - x
				const dy = e.y - y
				const r = UNIT_CONFIG[e.kind].radius
				if (dx * dx + dy * dy <= r * r) {
					hit = e
					break
				}
			}
		}
		if (hit) {
			applyUnitDamage(hit.id, p.damage, p.owner, now)
			continue
		}
		surviving.push({ ...p, x, y, ageMs })
	}
	projectiles$.set(surviving)
}

function tickDamageNumbers(dtMs: number) {
	const list = damageNumbers$.get()
	if (list.length === 0) return
	const next = []
	for (const d of list) {
		const ageMs = d.ageMs + dtMs
		if (ageMs >= DAMAGE_NUMBER_DURATION_MS) continue
		next.push({ ...d, ageMs })
	}
	damageNumbers$.set(next)
}

function checkEndConditions() {
	// A player is "alive" if they still have a town hall.
	const alive = new Set<PlayerId>()
	for (const b of lastBuildingsByTick) {
		if (b.kind === 'town-hall' && b.hp > 0) alive.add(b.owner)
	}
	if (alive.size === 1) {
		const winner = [...alive][0]
		gameOver$.set({ winnerId: winner })
		return
	}
	if (alive.size === 0) {
		// Everyone dead — pick the player with the highest score.
		let best: { id: PlayerId; score: number } | null = null
		const allRes = playerResources$.get()
		for (const id of Object.keys(allRes)) {
			const score = allRes[id].score
			if (!best || score > best.score) best = { id, score }
		}
		if (best) gameOver$.set({ winnerId: best.id })
	}
}

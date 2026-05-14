// Per-AI vision + memory. Replaces the previous omniscient
// `allBuildings` / `units$.get()` scans the AI used to make decisions.
//
// Each AI keeps a Map of sightings keyed by entity ID (unit id as string or
// shape id). On every AI tick we:
//   1. Mark all sightings as !visibleNow.
//   2. Walk the AI's own alive units + buildings; for each enemy entity
//      within visionRadius, refresh the sighting (or insert).
//   3. Drop sightings older than MEMORY_MS (last sighting time + MEMORY_MS).
//
// AI decisions consume the sightings:
//   - queryEnemyBuildings(playerId) → currently visible OR remembered enemy
//     buildings, with their last known position.
//   - pickAttackTarget(playerId) → first viable enemy TH from sightings.
//   - pickScoutTarget(playerId) → next unexplored map quadrant when there's
//     no remembered enemy building.
//
// The system runs in O(my-entities × enemy-entities) per AI per tick — fine
// for the ~50-unit counts we hit. We avoid allocating per tick by mutating
// the existing Map entries instead of creating new ones.

import { TLShapeId } from 'tldraw'
import { BuildingKind } from './building-config'
import { Unit, units$ } from './game-state'
import { MAP_BOUNDS } from './map'
import { PLAYERS, PlayerId, isEnemyOf } from './players'
import { UNIT_CONFIG, UnitKind } from './unit-config'

export interface UnitSighting {
	kind: 'unit'
	id: number
	x: number
	y: number
	owner: PlayerId
	unitKind: UnitKind
	lastSeenAt: number
	visibleNow: boolean
}

export interface BuildingSighting {
	kind: 'building'
	id: TLShapeId
	x: number
	y: number
	owner: PlayerId
	buildingKind: BuildingKind
	hp: number
	lastSeenAt: number
	visibleNow: boolean
}

export type Sighting = UnitSighting | BuildingSighting

// How long a stale sighting hangs around before we forget about it. Long
// enough that a scout that lost line of sight to an enemy base can still
// command a push to that location; short enough that abandoned positions
// don't clutter targeting.
const MEMORY_MS = 90_000

const sightingsByPlayer: Map<PlayerId, Map<string, Sighting>> = new Map()
// Track which map quadrants each AI has already scouted so pickScoutTarget
// rotates through them. Bit 0..3 = NE / NW / SW / SE.
const scoutedQuadrants: Map<PlayerId, number> = new Map()

export function resetAiVision() {
	sightingsByPlayer.clear()
	scoutedQuadrants.clear()
}

function getSightings(playerId: PlayerId): Map<string, Sighting> {
	let m = sightingsByPlayer.get(playerId)
	if (!m) {
		m = new Map()
		sightingsByPlayer.set(playerId, m)
	}
	return m
}

interface VisionInputBuilding {
	id: TLShapeId
	kind: BuildingKind
	owner: PlayerId
	cx: number
	cy: number
	hp: number
}

/** Recompute one AI's sightings from the current state. Call from the AI
 * tick. The `now` value is elapsedMs — used for sighting timestamps. */
export function updateAiVision(
	playerId: PlayerId,
	allBuildings: VisionInputBuilding[],
	now: number
): void {
	const sightings = getSightings(playerId)
	// Step 1: forget anything that's gone stale. We do this here so the
	// memory bounds are enforced even when the AI doesn't have any alive
	// units (which would skip the scan loop).
	for (const [key, s] of sightings) {
		if (now - s.lastSeenAt > MEMORY_MS) sightings.delete(key)
		else s.visibleNow = false
	}

	// Step 2: build the AI's vision sources (own alive units + buildings).
	const ownUnits: Unit[] = []
	const ownBuildings: VisionInputBuilding[] = []
	for (const u of units$.get()) {
		if (u.owner === playerId && u.hp > 0) ownUnits.push(u)
	}
	for (const b of allBuildings) {
		if (b.owner === playerId && b.hp > 0) ownBuildings.push(b)
	}

	// Step 3: scan enemy entities and refresh sightings for those in vision.
	const allUnits = units$.get()
	for (const e of allUnits) {
		if (e.hp <= 0) continue
		if (e.owner === playerId) continue
		if (!isEnemyOf(playerId, e.owner)) continue
		if (!isVisible(ownUnits, ownBuildings, e.x, e.y)) continue
		const key = `u${e.id}`
		const existing = sightings.get(key)
		if (existing && existing.kind === 'unit') {
			existing.x = e.x
			existing.y = e.y
			existing.unitKind = e.kind
			existing.lastSeenAt = now
			existing.visibleNow = true
		} else {
			sightings.set(key, {
				kind: 'unit',
				id: e.id,
				x: e.x,
				y: e.y,
				owner: e.owner,
				unitKind: e.kind,
				lastSeenAt: now,
				visibleNow: true,
			})
		}
	}
	for (const b of allBuildings) {
		if (b.hp <= 0) continue
		if (b.owner === playerId) continue
		if (!isEnemyOf(playerId, b.owner)) continue
		if (!isVisible(ownUnits, ownBuildings, b.cx, b.cy)) continue
		const key = `b${b.id}`
		const existing = sightings.get(key)
		if (existing && existing.kind === 'building') {
			existing.x = b.cx
			existing.y = b.cy
			existing.buildingKind = b.kind
			existing.hp = b.hp
			existing.lastSeenAt = now
			existing.visibleNow = true
		} else {
			sightings.set(key, {
				kind: 'building',
				id: b.id,
				x: b.cx,
				y: b.cy,
				owner: b.owner,
				buildingKind: b.kind,
				hp: b.hp,
				lastSeenAt: now,
				visibleNow: true,
			})
		}
	}

	// Step 4: drop sightings for buildings we *currently see* but that are
	// gone (hp ≤ 0 in their owner's records — not in the allBuildings list).
	// We can't observe a destroyed building so the existing sighting becomes
	// invalid. Scan our own sightings and remove visibleNow entries that
	// don't appear in the world.
	const aliveBuildingIds = new Set(allBuildings.filter((b) => b.hp > 0).map((b) => b.id))
	for (const [key, s] of sightings) {
		if (s.kind !== 'building') continue
		if (!s.visibleNow) continue
		if (!aliveBuildingIds.has(s.id)) sightings.delete(key)
	}
}

function isVisible(
	ownUnits: Unit[],
	ownBuildings: VisionInputBuilding[],
	x: number,
	y: number
): boolean {
	for (const u of ownUnits) {
		const r = UNIT_CONFIG[u.kind].visionRadius
		const dx = u.x - x
		const dy = u.y - y
		if (dx * dx + dy * dy <= r * r) return true
	}
	for (const b of ownBuildings) {
		const r = buildingVisionRadius(b.kind)
		const dx = b.cx - x
		const dy = b.cy - y
		if (dx * dx + dy * dy <= r * r) return true
	}
	return false
}

function buildingVisionRadius(kind: BuildingKind): number {
	// Mirror of BUILDING_CONFIG[kind].visionRadius without paying the import
	// cycle cost — building-config is loaded by everything, this stays light.
	switch (kind) {
		case 'town-hall':
			return 420
		case 'castle':
			return 480
		case 'tower':
			return 360
		case 'barracks':
		case 'archery-range':
		case 'stable':
			return 320
		case 'library':
			return 260
		case 'monastery':
			return 280
		case 'siege-workshop':
			return 300
		case 'market':
			return 240
		case 'farm':
		case 'mill':
		case 'lumber-camp':
		case 'mining-camp':
			return 200
		case 'wall':
			return 140
		case 'gate':
			return 160
		case 'dock':
			return 280
		default:
			return 200
	}
}

// ---------------------------------------------------------------------------
// Queries used by the AI brain

export function queryEnemyBuildings(playerId: PlayerId): BuildingSighting[] {
	const out: BuildingSighting[] = []
	const sightings = sightingsByPlayer.get(playerId)
	if (!sightings) return out
	for (const s of sightings.values()) {
		if (s.kind === 'building') out.push(s)
	}
	return out
}

export function queryEnemyUnits(playerId: PlayerId): UnitSighting[] {
	const out: UnitSighting[] = []
	const sightings = sightingsByPlayer.get(playerId)
	if (!sightings) return out
	for (const s of sightings.values()) {
		if (s.kind === 'unit') out.push(s)
	}
	return out
}

/** Tally of currently-remembered enemy units by archetype. Drives the AI's
 * counter-composition decisions ("I see a lot of cavalry → train pikemen"). */
export function enemyArchetypeTally(playerId: PlayerId): Record<string, number> {
	const tally: Record<string, number> = {}
	const sightings = sightingsByPlayer.get(playerId)
	if (!sightings) return tally
	for (const s of sightings.values()) {
		if (s.kind !== 'unit') continue
		const arch = UNIT_CONFIG[s.unitKind].archetype
		tally[arch] = (tally[arch] ?? 0) + 1
	}
	return tally
}

/** Best enemy town hall to push toward. Picks the closest remembered one
 * (visible or remembered) from a reference point — usually the AI's main
 * Town Hall. Returns null if the AI has no idea where any enemy is. */
export function pickRememberedEnemyBase(
	playerId: PlayerId,
	fromX: number,
	fromY: number
): { x: number; y: number } | null {
	const sightings = sightingsByPlayer.get(playerId)
	if (!sightings) return null
	let best: BuildingSighting | null = null
	let bestDistSq = Infinity
	for (const s of sightings.values()) {
		if (s.kind !== 'building') continue
		if (s.buildingKind !== 'town-hall') continue
		const dx = s.x - fromX
		const dy = s.y - fromY
		const dsq = dx * dx + dy * dy
		if (dsq < bestDistSq) {
			bestDistSq = dsq
			best = s
		}
	}
	return best ? { x: best.x, y: best.y } : null
}

/** Map quadrant centre to scout next. Rotates through the four corners; we
 * mark each quadrant scouted once the AI's vision touches it. */
export function pickScoutTarget(playerId: PlayerId): { x: number; y: number } | null {
	const visited = scoutedQuadrants.get(playerId) ?? 0
	const { minX, maxX, minY, maxY } = MAP_BOUNDS
	const midX = (minX + maxX) / 2
	const midY = (minY + maxY) / 2
	const quads: Array<{ bit: number; x: number; y: number }> = [
		{ bit: 0, x: (midX + maxX) / 2, y: (minY + midY) / 2 }, // NE
		{ bit: 1, x: (minX + midX) / 2, y: (minY + midY) / 2 }, // NW
		{ bit: 2, x: (minX + midX) / 2, y: (midY + maxY) / 2 }, // SW
		{ bit: 3, x: (midX + maxX) / 2, y: (midY + maxY) / 2 }, // SE
	]
	for (const q of quads) {
		if (!(visited & (1 << q.bit))) {
			return { x: q.x, y: q.y }
		}
	}
	// All four quadrants scouted — reset the bitmask so the AI rotates through
	// them again over time (enemies move).
	scoutedQuadrants.set(playerId, 0)
	return null
}

export function markQuadrantScouted(playerId: PlayerId, x: number, y: number): void {
	const { minX, maxX, minY, maxY } = MAP_BOUNDS
	const midX = (minX + maxX) / 2
	const midY = (minY + maxY) / 2
	let bit = 0
	if (x > midX && y < midY) bit = 0
	else if (x <= midX && y < midY) bit = 1
	else if (x <= midX && y >= midY) bit = 2
	else bit = 3
	const existing = scoutedQuadrants.get(playerId) ?? 0
	scoutedQuadrants.set(playerId, existing | (1 << bit))
}

// Auto-mark quadrants the AI's units occupy each tick — saves manual calls
// from the AI brain. Wired from updateAiVision via:
// updateAiVision also calls this for every alive own unit.
export function markScoutedFromUnits(playerId: PlayerId): void {
	const visited = scoutedQuadrants.get(playerId) ?? 0
	let next = visited
	for (const u of units$.get()) {
		if (u.owner !== playerId || u.hp <= 0) continue
		const { minX, maxX, minY, maxY } = MAP_BOUNDS
		const midX = (minX + maxX) / 2
		const midY = (minY + maxY) / 2
		let bit = 0
		if (u.x > midX && u.y < midY) bit = 0
		else if (u.x <= midX && u.y < midY) bit = 1
		else if (u.x <= midX && u.y >= midY) bit = 2
		else bit = 3
		next |= 1 << bit
	}
	for (const p of PLAYERS) void p
	scoutedQuadrants.set(playerId, next)
}

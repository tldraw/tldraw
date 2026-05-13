// Runtime lookups for tech effects, civ bonuses, and age gates.
//
// The game loop reads multipliers from here at swing / spawn / fire / gather
// time. Each function combines:
//   - Civ bonuses (from the player's nation.bonuses[])
//   - Researched tech multipliers (from completedTechs$)
//
// Bonuses are typed in nations.ts as a discriminated union. We iterate the
// player's bonuses[] each lookup; the per-player set is small (2-3 entries)
// so the cost is negligible.

import { AgeId, isAgeAtLeast } from './age-config'
import { BuildingConfig, BuildingScope } from './building-config'
import { completedTechs$, playerAges$, playerNations$ } from './game-state'
import { GatherResource, NATIONS, Nation, getNation } from './nations'
import { PlayerId } from './players'
import { TECH_CONFIG, TechId } from './tech-config'
import { ArchetypeId, UNIT_CONFIG, UnitKind } from './unit-config'

export function hasTech(playerId: PlayerId, techId: TechId): boolean {
	return completedTechs$.get()[playerId]?.has(techId) ?? false
}

function nationFor(playerId: PlayerId): Nation | null {
	const id = playerNations$.get()[playerId]
	return id ? getNation(id) : null
}

export function getPlayerAge(playerId: PlayerId): AgeId {
	return playerAges$.get()[playerId] ?? 'dark'
}

// ---------------------------------------------------------------------------
// Bonus walking
//
// Each bonus is matched by kind + discriminator. We fold cumulatively: for
// 'mult' bonuses we multiply, for additive bonuses we sum.

function unitMult(
	playerId: PlayerId,
	archetype: ArchetypeId,
	stat: 'hp' | 'attack' | 'speed' | 'cost' | 'trainTime'
): number {
	const nation = nationFor(playerId)
	if (!nation) return 1
	let m = 1
	for (const b of nation.bonuses) {
		if (b.kind !== 'unit-mult') continue
		if (b.stat !== stat) continue
		if (b.archetype !== 'all' && b.archetype !== archetype) continue
		m *= b.mult
	}
	return m
}

function buildingMult(
	playerId: PlayerId,
	scope: BuildingScope,
	stat: 'hp' | 'cost' | 'buildTime'
): number {
	const nation = nationFor(playerId)
	if (!nation) return 1
	let m = 1
	for (const b of nation.bonuses) {
		if (b.kind !== 'building-mult') continue
		if (b.stat !== stat) continue
		if (b.scope !== 'all' && b.scope !== scope) continue
		m *= b.mult
	}
	return m
}

function gatherMult(playerId: PlayerId, resource: GatherResource): number {
	const nation = nationFor(playerId)
	if (!nation) return 1
	let m = 1
	for (const b of nation.bonuses) {
		if (b.kind !== 'gather-mult') continue
		if (b.resource !== 'all' && b.resource !== resource) continue
		m *= b.mult
	}
	return m
}

function archerRangeFlat(playerId: PlayerId): number {
	const nation = nationFor(playerId)
	if (!nation) return 0
	let bonus = 0
	for (const b of nation.bonuses) {
		if (b.kind === 'archer-range') bonus += b.bonus
	}
	if (hasTech(playerId, 'fletching')) bonus += 1
	if (hasTech(playerId, 'bodkin-arrow')) bonus += 1
	if (hasTech(playerId, 'bracer')) bonus += 1
	return bonus
}

function towerRangeFlat(playerId: PlayerId): number {
	const nation = nationFor(playerId)
	if (!nation) return 0
	let bonus = 0
	for (const b of nation.bonuses) {
		if (b.kind === 'tower-range') bonus += b.bonus
	}
	return bonus
}

function researchMult(playerId: PlayerId): number {
	const nation = nationFor(playerId)
	if (!nation) return 1
	let m = 1
	for (const b of nation.bonuses) {
		if (b.kind === 'research-mult') m *= b.mult
	}
	return m
}

function farmCapMult(playerId: PlayerId): number {
	const nation = nationFor(playerId)
	if (!nation) return 1
	let m = 1
	for (const b of nation.bonuses) {
		if (b.kind === 'farm-cap-mult') m *= b.mult
	}
	return m
}

export function getStartingVillagerBonus(playerId: PlayerId): number {
	const nation = nationFor(playerId)
	if (!nation) return 0
	let bonus = 0
	for (const b of nation.bonuses) {
		if (b.kind === 'starting-villagers') bonus += b.bonus
	}
	return bonus
}

export function getStartingResourceBonus(playerId: PlayerId): {
	gold: number
	wood: number
	stone: number
} {
	const nation = nationFor(playerId)
	const out = { gold: 0, wood: 0, stone: 0 }
	if (!nation) return out
	for (const b of nation.bonuses) {
		if (b.kind !== 'starting-resources') continue
		if (b.gold) out.gold += b.gold
		if (b.wood) out.wood += b.wood
		if (b.stone) out.stone += b.stone
	}
	return out
}

// ---------------------------------------------------------------------------
// Existing-shape multipliers (kept for game-loop call sites)
//
// These layer tech effects on top of civ bonuses. They preserve the names
// the rest of the codebase already uses so the call-site changes stay small.

export function getDamageMultiplier(playerId: PlayerId, unitKind?: UnitKind): number {
	let m = 1
	if (hasTech(playerId, 'sharp-blades')) m *= 1.1
	if (hasTech(playerId, 'forging')) m *= 1.15
	if (hasTech(playerId, 'blast-furnace')) m *= 1.2
	if (unitKind) {
		const archetype = UNIT_CONFIG[unitKind].archetype
		m *= unitMult(playerId, archetype, 'attack')
	}
	return m
}

export function getUnitHpMultiplier(playerId: PlayerId, unitKind?: UnitKind): number {
	let m = 1
	if (hasTech(playerId, 'padded-armor')) m *= 1.2
	if (hasTech(playerId, 'plate-mail')) m *= 1.3
	if (hasTech(playerId, 'chain-mail')) m *= 1.2
	if (hasTech(playerId, 'bloodlines')) m *= 1.2
	if (hasTech(playerId, 'loom') && unitKind === 'worker') m *= 1.25
	if (unitKind) {
		const archetype = UNIT_CONFIG[unitKind].archetype
		m *= unitMult(playerId, archetype, 'hp')
	}
	return m
}

export function getCarryMultiplier(playerId: PlayerId): number {
	let m = 1
	if (hasTech(playerId, 'wheelbarrow')) m *= 1.25
	if (hasTech(playerId, 'hand-cart')) m *= 1.5
	return m
}

export function getGatherRateMultiplier(playerId: PlayerId, resource: GatherResource): number {
	let m = gatherMult(playerId, resource)
	if (hasTech(playerId, 'wheelbarrow')) m *= 1.25
	return m
}

export function getBuildingHpMultiplier(playerId: PlayerId, scope: BuildingScope = 'all'): number {
	let m = buildingMult(playerId, scope, 'hp')
	if (hasTech(playerId, 'masonry')) m *= 1.2
	if (hasTech(playerId, 'architecture')) m *= 1.2
	return m
}

export function getBuildingCostMultiplier(
	playerId: PlayerId,
	scope: BuildingScope = 'all'
): number {
	return buildingMult(playerId, scope, 'cost')
}

export function getBuildingBuildTimeMultiplier(
	playerId: PlayerId,
	scope: BuildingScope = 'all'
): number {
	let m = buildingMult(playerId, scope, 'buildTime')
	if (hasTech(playerId, 'architecture')) m *= 0.9
	return m
}

export function getTowerRangeMultiplier(playerId: PlayerId): number {
	let m = 1
	if (hasTech(playerId, 'tower-marksmanship')) m *= 1.3
	// Tower range bonuses from civ are flat-tile bumps. Convert the additive
	// bonus to a multiplier the call site can fold into rangeSq. Each "+1" is
	// treated as +25 game units of straight-line range.
	const flat = towerRangeFlat(playerId)
	if (flat > 0) m *= 1 + flat * 0.15
	return m
}

export function getArcherRangeMultiplier(playerId: PlayerId): number {
	// Each +1 is treated as ~+20 game units of straight-line range, expressed
	// as a percentage of the archer's base range so call sites can multiply
	// rangeSq by m*m.
	const flat = archerRangeFlat(playerId)
	if (flat === 0) return 1
	return 1 + flat * 0.1
}

export function getUnitSpeedMultiplier(playerId: PlayerId, unitKind?: UnitKind): number {
	let m = 1
	if (hasTech(playerId, 'husbandry')) {
		const arch = unitKind ? UNIT_CONFIG[unitKind].archetype : null
		if (arch === 'heavy-cavalry' || arch === 'light-cavalry') m *= 1.15
	}
	if (unitKind) {
		const archetype = UNIT_CONFIG[unitKind].archetype
		m *= unitMult(playerId, archetype, 'speed')
	}
	return m
}

export function getResearchSpeedMultiplier(playerId: PlayerId): number {
	return researchMult(playerId)
}

export function getTrainTimeMultiplier(playerId: PlayerId, unitKind: UnitKind): number {
	const archetype = UNIT_CONFIG[unitKind].archetype
	return unitMult(playerId, archetype, 'trainTime')
}

export function getUnitCostMultiplier(playerId: PlayerId, unitKind: UnitKind): number {
	const archetype = UNIT_CONFIG[unitKind].archetype
	return unitMult(playerId, archetype, 'cost')
}

export function getFarmCapacityMultiplier(playerId: PlayerId): number {
	return farmCapMult(playerId)
}

// ---------------------------------------------------------------------------
// Age and tech gates

export function canBuildInAge(playerId: PlayerId, cfg: BuildingConfig): boolean {
	return isAgeAtLeast(getPlayerAge(playerId), cfg.minAge)
}

export function canTrainInAge(playerId: PlayerId, kind: UnitKind): boolean {
	return isAgeAtLeast(getPlayerAge(playerId), UNIT_CONFIG[kind].minAge)
}

export function canResearchInAge(playerId: PlayerId, techId: TechId): boolean {
	const cfg = TECH_CONFIG[techId]
	return isAgeAtLeast(getPlayerAge(playerId), cfg.minAge)
}

// True if the player can train this unit kind right now. Combines:
//   - Age gate
//   - Unique-unit nation match + signature tech (if applicable)
export function canTrainUnit(playerId: PlayerId, kind: UnitKind): boolean {
	if (!canTrainInAge(playerId, kind)) return false
	const nation = nationFor(playerId)
	for (const n of NATIONS) {
		if (n.uniqueUnit !== kind) continue
		if (!nation || nation.id !== n.id) return false
		return hasTech(playerId, n.signatureTech)
	}
	return true
}

export function getUniqueUnitKindForPlayer(playerId: PlayerId): UnitKind | null {
	const nation = nationFor(playerId)
	return nation?.uniqueUnit ?? null
}

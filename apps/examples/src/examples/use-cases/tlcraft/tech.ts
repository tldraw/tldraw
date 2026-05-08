// Runtime helpers for tech effects + nation perks. Effects:
//   - Nation perks are passive multipliers always applied while playing.
//   - Researched techs add additional multipliers / unlocks.
// The game loop reads these at swing / spawn / fire / gather time.

import { completedTechs$, playerNations$ } from './game-state'
import { NATIONS, getNation } from './nations'
import { PlayerId } from './players'
import { TechId } from './tech-config'
import { UnitKind } from './unit-config'

export function hasTech(playerId: PlayerId, techId: TechId): boolean {
	return completedTechs$.get()[playerId]?.has(techId) ?? false
}

function nationFor(playerId: PlayerId) {
	const id = playerNations$.get()[playerId]
	return id ? getNation(id) : null
}

export function getDamageMultiplier(playerId: PlayerId): number {
	return hasTech(playerId, 'sharp-blades') ? 1.25 : 1
}

export function getUnitHpMultiplier(playerId: PlayerId): number {
	return hasTech(playerId, 'heavy-armor') ? 1.25 : 1
}

export function getCarryMultiplier(playerId: PlayerId): number {
	const techMult = hasTech(playerId, 'tools-of-the-trade') ? 1.5 : 1
	const nationMult = nationFor(playerId)?.gatherMult ?? 1
	return techMult * nationMult
}

export function getBuildingHpMultiplier(playerId: PlayerId): number {
	const techMult = hasTech(playerId, 'reinforced-walls') ? 1.3 : 1
	const nationMult = nationFor(playerId)?.buildingHpMult ?? 1
	return techMult * nationMult
}

export function getTowerRangeMultiplier(playerId: PlayerId): number {
	return hasTech(playerId, 'tower-marksmanship') ? 1.3 : 1
}

export function getUnitSpeedMultiplier(playerId: PlayerId): number {
	return nationFor(playerId)?.unitSpeedMult ?? 1
}

// Mystic perk: research completes faster. Used to scale ResearchQueueItem
// duration when queued.
export function getResearchSpeedMultiplier(playerId: PlayerId): number {
	return nationFor(playerId)?.researchSpeedMult ?? 1
}

export function isKnightUnlocked(playerId: PlayerId): boolean {
	return hasTech(playerId, 'cavalry-training')
}

// True if the player can train this unit kind right now. Unique units are
// gated behind a nation match + the nation's signature tech.
export function canTrainUnit(playerId: PlayerId, kind: UnitKind): boolean {
	if (kind === 'knight') return isKnightUnlocked(playerId)
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

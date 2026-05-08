import { TLShapeId, atom } from 'tldraw'
import { BuildingKind } from './building-config'
import { NationId } from './nations'
import { HUMAN_PLAYER_ID, PLAYERS, PlayerId } from './players'
import { TechId } from './tech-config'
import { UnitKind } from './unit-config'

// Multi-player game state. Every Unit and building shape carries a PlayerId on
// `owner`; the AI tick reads its slice from playerResources$ and the human's
// HUD reads p0's slice.

export interface CommandIdle {
	type: 'idle'
}
export interface CommandMove {
	type: 'move'
	x: number
	y: number
}
export interface CommandAttack {
	type: 'attack'
	targetUnitId: number | null
	targetBuildingId: TLShapeId | null
}
export interface CommandGather {
	type: 'gather'
	resourceId: number
}
export interface CommandReturn {
	type: 'return'
	buildingId: TLShapeId | null
}

export type Command = CommandIdle | CommandMove | CommandAttack | CommandGather | CommandReturn

export interface Unit {
	id: number
	kind: UnitKind
	owner: PlayerId
	x: number
	y: number
	hp: number
	// Baked at spawn so the Heavy Armor tech only buffs newly trained units;
	// HP bars use this rather than the static UNIT_CONFIG default.
	maxHp: number
	command: Command
	nextAttackAtMs: number
	carrying: { resource: CarriedResource; amount: number } | null
	gatherUntilMs: number
	hitFlashUntilMs: number
}

// Resource node kinds. Trees deposit wood; mines deposit gold; quarries
// deposit stone. Stone is a late-game resource — only Castle, Stonemasonry,
// and the Stone Wall upgrade demand it.
export type ResourceKind = 'tree' | 'mine' | 'quarry'

export type CarriedResource = 'wood' | 'gold' | 'stone'

export interface ResourceNode {
	id: number
	kind: ResourceKind
	x: number
	y: number
	radius: number
	remaining: number
}

export interface Projectile {
	id: number
	x: number
	y: number
	vx: number
	vy: number
	damage: number
	owner: PlayerId
	targetUnitId: number | null
	targetBuildingId: TLShapeId | null
	ageMs: number
}

export interface DamageNumber {
	id: number
	x: number
	y: number
	amount: number
	ageMs: number
}

export interface TrainQueueItem {
	id: number
	kind: UnitKind
	startedAtMs: number
	durationMs: number
}

export interface ResearchQueueItem {
	id: number
	techId: TechId
	startedAtMs: number
	durationMs: number
}

export interface UpgradeQueueItem {
	id: number
	startedAtMs: number
	durationMs: number
}

export interface PlayerResources {
	gold: number
	wood: number
	stone: number
	food: number
	foodCap: number
	score: number
}

export const STARTING_GOLD = 220
export const STARTING_WOOD = 120
export const PROJECTILE_MAX_AGE_MS = 4000

function freshResources(): PlayerResources {
	return {
		gold: STARTING_GOLD,
		wood: STARTING_WOOD,
		stone: 0,
		food: 0,
		foodCap: 0,
		score: 0,
	}
}

function freshAllResources(): Record<PlayerId, PlayerResources> {
	const out: Record<PlayerId, PlayerResources> = {}
	for (const p of PLAYERS) out[p.id] = freshResources()
	return out
}

export const units$ = atom<Unit[]>('units', [])
export const resources$ = atom<ResourceNode[]>('resources', [])
export const projectiles$ = atom<Projectile[]>('projectiles', [])
export const damageNumbers$ = atom<DamageNumber[]>('damageNumbers', [])

export const selectedUnitIds$ = atom<Set<number>>('selectedUnitIds', new Set())
export const selectedBuildingId$ = atom<TLShapeId | null>('selectedBuildingId', null)
export const dragSelect$ = atom<{ x1: number; y1: number; x2: number; y2: number } | null>(
	'dragSelect',
	null
)
export const placingBuilding$ = atom<BuildingKind | null>('placingBuilding', null)

export const playerResources$ = atom<Record<PlayerId, PlayerResources>>(
	'playerResources',
	freshAllResources()
)

export const elapsedMs$ = atom('elapsedMs', 0)
export const gameOver$ = atom<{ winnerId: PlayerId } | null>('gameOver', null)
// True while the pause menu is open. Game tick checks this and short-circuits
// so units, AI, training and research all freeze together.
export const paused$ = atom('paused', false)
// Bumped after every fog recompute so overlays that read fog state can re-run
// reactively. The grids themselves live in fog.ts and are mutated in place.
export const fogVersion$ = atom('fogVersion', 0)

// True once the player has picked a nation and clicked Start. Game tick
// short-circuits before this so the AI doesn't run before we have nations
// assigned.
export const gameStarted$ = atom('gameStarted', false)

// True when the full-screen research tree overlay is open. The game keeps
// running underneath — only the pause menu pauses time.
export const researchTreeOpen$ = atom('researchTreeOpen', false)

// Per-player nation. Set when the human picks a nation in the start menu;
// remaining slots are filled with random AI nations.
export const playerNations$ = atom<Record<PlayerId, NationId>>('playerNations', {})

// Map type selected at game start. Set just before gameStarted$ flips true.
export const selectedMapType$ = atom<import('./map').MapTypeId | null>('selectedMapType', null)

export const trainQueues = new Map<TLShapeId, TrainQueueItem[]>()
export const buildingCooldowns = new Map<TLShapeId, { lastFiredAt: number }>()
export const trainQueuesAtom$ = atom<Record<string, TrainQueueItem[]>>('trainQueues', {})

// Research lives on smithies. Like trainQueues, this is keyed by shape id so
// players with multiple smithies can research two things at once.
export const researchQueues = new Map<TLShapeId, ResearchQueueItem[]>()
export const researchQueuesAtom$ = atom<Record<string, ResearchQueueItem[]>>('researchQueues', {})

// Building upgrades live on the building shape itself — at most one upgrade
// per building (since upgrades cap at level 1).
export const upgradeQueues = new Map<TLShapeId, UpgradeQueueItem | null>()
export const upgradeQueuesAtom$ = atom<Record<string, UpgradeQueueItem | null>>('upgradeQueues', {})
// Per-player completed techs. Replaced wholesale on each update so atom
// subscribers see every change.
export const completedTechs$ = atom<Record<PlayerId, ReadonlySet<TechId>>>(
	'completedTechs',
	freshTechs()
)

function freshTechs(): Record<PlayerId, ReadonlySet<TechId>> {
	const out: Record<PlayerId, ReadonlySet<TechId>> = {}
	for (const p of PLAYERS) out[p.id] = new Set<TechId>()
	return out
}

let _nextUnitId = 1
export const nextUnitId = () => _nextUnitId++
let _nextResourceId = 1
export const nextResourceId = () => _nextResourceId++
let _nextProjectileId = 1
export const nextProjectileId = () => _nextProjectileId++
let _nextDamageId = 1
export const nextDamageId = () => _nextDamageId++
let _nextQueueItemId = 1
export const nextQueueItemId = () => _nextQueueItemId++
let _nextResearchItemId = 1
export const nextResearchItemId = () => _nextResearchItemId++
let _nextUpgradeItemId = 1
export const nextUpgradeItemId = () => _nextUpgradeItemId++

export function resetGameState() {
	units$.set([])
	resources$.set([])
	projectiles$.set([])
	damageNumbers$.set([])
	selectedUnitIds$.set(new Set())
	selectedBuildingId$.set(null)
	dragSelect$.set(null)
	placingBuilding$.set(null)
	playerResources$.set(freshAllResources())
	elapsedMs$.set(0)
	gameOver$.set(null)
	paused$.set(false)
	fogVersion$.set(0)
	gameStarted$.set(false)
	researchTreeOpen$.set(false)
	playerNations$.set({})
	selectedMapType$.set(null)
	trainQueues.clear()
	buildingCooldowns.clear()
	trainQueuesAtom$.set({})
	researchQueues.clear()
	researchQueuesAtom$.set({})
	upgradeQueues.clear()
	upgradeQueuesAtom$.set({})
	completedTechs$.set(freshTechs())
	_nextUnitId = 1
	_nextResourceId = 1
	_nextProjectileId = 1
	_nextDamageId = 1
	_nextQueueItemId = 1
	_nextResearchItemId = 1
	_nextUpgradeItemId = 1
}

export function getResources(playerId: PlayerId): PlayerResources {
	return playerResources$.get()[playerId]
}

export function updateResources(
	playerId: PlayerId,
	patch: (r: PlayerResources) => PlayerResources
) {
	playerResources$.update((all) => ({ ...all, [playerId]: patch(all[playerId]) }))
}

export function gainBounty(playerId: PlayerId, amount: number) {
	updateResources(playerId, (r) => ({ ...r, gold: r.gold + amount, score: r.score + amount }))
}

export function spawnDamageNumber(x: number, y: number, amount: number) {
	damageNumbers$.update((list) => [...list, { id: nextDamageId(), x, y, amount, ageMs: 0 }])
}

export function humanResources(): PlayerResources {
	return playerResources$.get()[HUMAN_PLAYER_ID]
}

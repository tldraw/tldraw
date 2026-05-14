import { TLShapeId, atom } from 'tldraw'
import { AgeId, STARTING_AGE } from './age-config'
import { resetAiVision } from './ai-vision'
import { BuildingKind } from './building-config'
import { resetDiplomacy } from './diplomacy'
import { NationId } from './nations'
import { HUMAN_PLAYER_ID, PLAYERS, PlayerId } from './players'
import { freshSeed, setRandomSeed } from './random'
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
export interface CommandAttackMove {
	type: 'attack-move'
	// Final destination; the unit walks toward it but auto-engages any enemy
	// it sees along the way. On kill it resumes attack-move toward (x, y).
	x: number
	y: number
}

export type Command =
	| CommandIdle
	| CommandMove
	| CommandAttack
	| CommandGather
	| CommandReturn
	| CommandAttackMove

// Per-unit stance. Affects how the unit reacts to enemies it sees:
//   - aggressive (default): chases enemies until they're dead or out of vision.
//   - defensive: engages enemies in range but returns to its previous waypoint
//     after the kill instead of pursuing.
//   - hold-position: never moves. Attacks anything that comes into range.
export type Stance = 'aggressive' | 'defensive' | 'hold-position'

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
	// Waypoints from A* pathfinding. First entry is the next target; pop on
	// arrival. null / undefined means no path computed (e.g. straight-line
	// move within a single tile, or a target we already reached). Saved games
	// may omit it — step functions treat undefined as null.
	path?: { x: number; y: number }[] | null
	// Combat stance — see Stance above. Defaults to 'aggressive' if absent
	// (saved games from before stances may omit it).
	stance?: Stance
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

// Single in-flight age-advance research, queued at a player's Town Hall.
// At most one per player; null when no age-up is in progress.
export interface AgeResearchItem {
	id: number
	techId: TechId
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

// True while the player has pressed `A` to arm attack-move. The next right-
// click is interpreted as an attack-move command instead of the normal move /
// attack / gather. Cleared after one command, or by pressing Esc.
export const attackMoveArmed$ = atom('attackMoveArmed', false)

// AI difficulty for all AI players this match. Set from the start menu before
// the match begins. Resets to 'normal' on game reset.
export const aiDifficulty$ = atom<'easy' | 'normal' | 'hard'>('aiDifficulty', 'normal')

// Control groups: slot (1–9) → unit-id set. Ctrl+digit assigns the current
// selection; plain digit re-selects the slot. Double-tap centres camera.
export const controlGroups$ = atom<Record<number, ReadonlySet<number>>>('controlGroups', {})

// Last idle-worker cycle target so the period key rotates through workers
// instead of selecting the same one twice.
export const lastIdleWorkerCycleId$ = atom<number | null>('lastIdleWorkerCycle', null)

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
// Map size (small/medium/large/huge) selected at game start. Drives both the
// playable area dimensions and how much resource the generators pour out.
export const selectedMapSize$ = atom<import('./map').MapSizeId>(
	'selectedMapSize',
	'large' as import('./map').MapSizeId
)

// 32-bit integer seed for the simulation's PRNG. Set explicitly when the
// match starts (single-player rerolls; multiplayer takes the host's seed
// from a synced tlc-game record). Stored as an atom for observability /
// future sync, but the actual PRNG state lives in random.ts and is
// advanced per call by the simulation.
export const simSeed$ = atom('simSeed', 1)

/** Pick a fresh seed and apply it to the PRNG. Call at the top of every
 * match (start menu's Start, restart button, etc.). */
export function reseedSim(seed: number = freshSeed()) {
	simSeed$.set(seed)
	setRandomSeed(seed)
}

// Per-production-building rally point. When a unit finishes training, the
// game loop issues an automatic move command toward this point so the player
// doesn't have to babysit each barracks. Cleaned up in syncBuildings when
// the source building dies.
export const rallyPoints = new Map<TLShapeId, { x: number; y: number }>()

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

// Per-player current age. Every player starts at the Dark Age (see
// STARTING_AGE in age-config). Updated when the age-advance research at the
// Town Hall completes.
export const playerAges$ = atom<Record<PlayerId, AgeId>>('playerAges', freshAges())

function freshAges(): Record<PlayerId, AgeId> {
	const out: Record<PlayerId, AgeId> = {}
	for (const p of PLAYERS) out[p.id] = STARTING_AGE
	return out
}

// Per-player age-advance research. At most one in flight per player. The
// non-reactive map is the source of truth; the atom mirrors it for UI.
export const ageResearchByPlayer = new Map<PlayerId, AgeResearchItem | null>()
export const ageResearchByPlayer$ = atom<Record<PlayerId, AgeResearchItem | null>>(
	'ageResearchByPlayer',
	{}
)

let _nextUnitId = 1
export function nextUnitId() {
	return _nextUnitId++
}
let _nextResourceId = 1
export function nextResourceId() {
	return _nextResourceId++
}
let _nextProjectileId = 1
export function nextProjectileId() {
	return _nextProjectileId++
}
let _nextDamageId = 1
export function nextDamageId() {
	return _nextDamageId++
}
let _nextQueueItemId = 1
export function nextQueueItemId() {
	return _nextQueueItemId++
}
let _nextResearchItemId = 1
export function nextResearchItemId() {
	return _nextResearchItemId++
}
let _nextUpgradeItemId = 1
export function nextUpgradeItemId() {
	return _nextUpgradeItemId++
}
let _nextAgeResearchId = 1
export function nextAgeResearchId() {
	return _nextAgeResearchId++
}

export interface NextIds {
	unit: number
	resource: number
	projectile: number
	damage: number
	queueItem: number
	researchItem: number
	upgradeItem: number
	ageResearch: number
}

/** Snapshot all the ID counters at once — used by save/load so the counters
 * pick up where they left off after a load (otherwise newly spawned units /
 * projectiles would collide with saved IDs). */
export function getNextIds(): NextIds {
	return {
		unit: _nextUnitId,
		resource: _nextResourceId,
		projectile: _nextProjectileId,
		damage: _nextDamageId,
		queueItem: _nextQueueItemId,
		researchItem: _nextResearchItemId,
		upgradeItem: _nextUpgradeItemId,
		ageResearch: _nextAgeResearchId,
	}
}

export function setNextIds(ids: NextIds) {
	_nextUnitId = ids.unit
	_nextResourceId = ids.resource
	_nextProjectileId = ids.projectile
	_nextDamageId = ids.damage
	_nextQueueItemId = ids.queueItem
	_nextResearchItemId = ids.researchItem
	_nextUpgradeItemId = ids.upgradeItem
	_nextAgeResearchId = ids.ageResearch ?? 1
}

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
	reseedSim()
	trainQueues.clear()
	rallyPoints.clear()
	buildingCooldowns.clear()
	trainQueuesAtom$.set({})
	researchQueues.clear()
	researchQueuesAtom$.set({})
	upgradeQueues.clear()
	upgradeQueuesAtom$.set({})
	completedTechs$.set(freshTechs())
	playerAges$.set(freshAges())
	ageResearchByPlayer.clear()
	ageResearchByPlayer$.set({})
	attackMoveArmed$.set(false)
	aiDifficulty$.set('normal')
	controlGroups$.set({})
	lastIdleWorkerCycleId$.set(null)
	resetDiplomacy()
	resetAiVision()
	_nextUnitId = 1
	_nextResourceId = 1
	_nextProjectileId = 1
	_nextDamageId = 1
	_nextQueueItemId = 1
	_nextResearchItemId = 1
	_nextUpgradeItemId = 1
	_nextAgeResearchId = 1
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

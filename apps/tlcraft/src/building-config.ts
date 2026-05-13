import { TLShape } from 'tldraw'
import { shuffleInPlace } from './random'
import { TechId } from './tech-config'
import { UnitKind } from './unit-config'

// Buildings are real locked geo shapes. meta.buildingKind tells the game loop
// how to treat each one; meta.owner is a PlayerId. Visual colour comes from
// the player config (players.ts), the geo + size from BuildingConfig.

export type BuildingKind =
	| 'town-hall'
	| 'barracks'
	| 'tower'
	| 'library'
	| 'farm'
	| 'wall'
	| 'gate'
	| 'castle'

export interface ResourceCost {
	gold: number
	wood: number
	// Stone is optional — late-game fortifications cost it; everything else
	// leaves it undefined (treated as 0).
	stone?: number
}

export interface UpgradeConfig {
	label: string
	cost: ResourceCost
	durationMs: number
}

export interface BuildingConfig {
	label: string
	geo: 'rectangle' | 'triangle'
	size: number
	maxHp: number
	cost: ResourceCost
	trains: UnitKind[]
	researches: TechId[]
	attack: {
		damage: number
		rangeSq: number
		fireRateMs: number
		projectileSpeed: number
	} | null
	isDropOff: boolean
	foodCapacity: number
	keyHint: string
	visionRadius: number
	territoryRadius: number
	requiresTech?: import('./tech-config').TechId
	upgrade?: UpgradeConfig | null
	// 'town' = must be placed inside the radius of one of the player's town
	// halls (a town). 'territory' = anywhere in the player's wider territory
	// (any of their alive buildings' disks). Town halls themselves are
	// 'territory' so subsequent town halls can be founded out at the frontier.
	placement: 'town' | 'territory'
}

export const BUILDING_CONFIG: Record<BuildingKind, BuildingConfig> = {
	'town-hall': {
		label: 'Town hall',
		geo: 'rectangle',
		size: 180,
		maxHp: 1500,
		cost: { gold: 400, wood: 200 },
		trains: ['worker'],
		researches: [],
		attack: null,
		isDropOff: true,
		foodCapacity: 8,
		keyHint: '1',
		visionRadius: 420,
		territoryRadius: 540,
		upgrade: {
			label: 'Stronghold',
			cost: { gold: 300, wood: 200, stone: 80 },
			durationMs: 32_000,
		},
		placement: 'territory',
	},
	barracks: {
		label: 'Barracks',
		geo: 'rectangle',
		size: 130,
		maxHp: 800,
		cost: { gold: 150, wood: 80 },
		trains: ['soldier', 'knight'],
		researches: [],
		attack: null,
		isDropOff: false,
		foodCapacity: 4,
		keyHint: '2',
		visionRadius: 320,
		territoryRadius: 320,
		upgrade: {
			label: 'War Camp',
			cost: { gold: 200, wood: 100 },
			durationMs: 25_000,
		},
		placement: 'town',
	},
	tower: {
		label: 'Tower',
		geo: 'triangle',
		size: 80,
		maxHp: 600,
		cost: { gold: 120, wood: 40 },
		trains: [],
		researches: [],
		attack: { damage: 18, rangeSq: 220 * 220, fireRateMs: 800, projectileSpeed: 700 },
		isDropOff: false,
		foodCapacity: 0,
		keyHint: '3',
		visionRadius: 360,
		territoryRadius: 280,
		upgrade: {
			label: 'Bastion',
			cost: { gold: 200, wood: 80 },
			durationMs: 25_000,
		},
		placement: 'territory',
	},
	library: {
		label: 'Library',
		geo: 'rectangle',
		size: 110,
		maxHp: 700,
		cost: { gold: 140, wood: 80 },
		trains: [],
		// The Library hosts the entire tech tree. The toolbar surfaces a single
		// "Open research" action when one is selected; the actual node graph is
		// rendered by ResearchTreeOverlay.
		researches: [
			'sharp-blades',
			'tools-of-the-trade',
			'heavy-armor',
			'cavalry-training',
			'reinforced-walls',
			'tower-marksmanship',
			'holy-orders',
			'blood-frenzy',
			'arcane-studies',
			'champions-path',
		],
		attack: null,
		isDropOff: false,
		foodCapacity: 0,
		keyHint: '4',
		visionRadius: 260,
		territoryRadius: 240,
		upgrade: {
			label: 'Grand Library',
			cost: { gold: 240, wood: 120 },
			durationMs: 28_000,
		},
		placement: 'town',
	},
	farm: {
		label: 'Farm',
		geo: 'rectangle',
		size: 90,
		maxHp: 280,
		cost: { gold: 60, wood: 40 },
		trains: [],
		researches: [],
		attack: null,
		isDropOff: false,
		foodCapacity: 4,
		keyHint: '5',
		visionRadius: 200,
		territoryRadius: 220,
		upgrade: {
			label: 'Greater Farm',
			cost: { gold: 100, wood: 60 },
			durationMs: 18_000,
		},
		placement: 'town',
	},
	wall: {
		label: 'Wall',
		geo: 'rectangle',
		size: 60,
		maxHp: 400,
		cost: { gold: 30, wood: 30 },
		trains: [],
		researches: [],
		attack: null,
		isDropOff: false,
		foodCapacity: 0,
		keyHint: '6',
		visionRadius: 140,
		territoryRadius: 200,
		upgrade: {
			label: 'Stone Wall',
			cost: { gold: 30, wood: 30, stone: 40 },
			durationMs: 12_000,
		},
		placement: 'territory',
	},
	gate: {
		// Same footprint as a wall so it slots cleanly into a chain. Players
		// toggle gateOpen via the toolbar — open lets any unit (including
		// enemies) walk through, closed blocks like a wall.
		label: 'Gate',
		geo: 'rectangle',
		size: 60,
		maxHp: 350,
		cost: { gold: 60, wood: 50 },
		trains: [],
		researches: [],
		attack: null,
		isDropOff: false,
		foodCapacity: 0,
		keyHint: '8',
		visionRadius: 160,
		territoryRadius: 200,
		upgrade: null,
		placement: 'territory',
	},
	castle: {
		// Heavy fortified building with an area attack — basically a beefy
		// tower at 3x the size and HP. Locked behind Stonemasonry research so
		// it shows up as the player's late-game power play.
		label: 'Castle',
		geo: 'rectangle',
		size: 220,
		maxHp: 2800,
		cost: { gold: 500, wood: 300, stone: 200 },
		trains: [],
		researches: [],
		attack: { damage: 32, rangeSq: 280 * 280, fireRateMs: 650, projectileSpeed: 800 },
		isDropOff: false,
		foodCapacity: 4,
		keyHint: '7',
		visionRadius: 480,
		territoryRadius: 560,
		requiresTech: 'stonemasonry',
		upgrade: null,
		placement: 'territory',
	},
}

export const BUILDING_KINDS: BuildingKind[] = [
	'town-hall',
	'barracks',
	'tower',
	'library',
	'farm',
	'wall',
	'gate',
	'castle',
]

// Read upgrade level baked at construction / re-baked after upgrade. 0 means
// the base building; 1 means upgraded once.
export function getBuildingUpgradeLevel(shape: TLShape): number {
	const lvl = shape.meta?.upgradeLevel
	return typeof lvl === 'number' ? lvl : 0
}

// Effective stats given the upgrade level. Upgrades add a flat +50% HP, +1
// food cap (if it had any), and +30% damage / +30% range (if it has an attack).
// Vision and territory get a 10% bump too. We compute these lazily so changing
// the formula here updates everywhere consistently.
export function getEffectiveLabel(kind: BuildingKind, level: number): string {
	const cfg = BUILDING_CONFIG[kind]
	if (level >= 1 && cfg.upgrade) return cfg.upgrade.label
	return cfg.label
}

export function getEffectiveMaxHp(kind: BuildingKind, level: number): number {
	const base = BUILDING_CONFIG[kind].maxHp
	return level >= 1 ? Math.round(base * 1.5) : base
}

export function getEffectiveFoodCapacity(kind: BuildingKind, level: number): number {
	const base = BUILDING_CONFIG[kind].foodCapacity
	if (base === 0) return 0
	return level >= 1 ? base + 2 : base
}

export function getEffectiveAttack(kind: BuildingKind, level: number) {
	const base = BUILDING_CONFIG[kind].attack
	if (!base) return null
	if (level === 0) return base
	return {
		...base,
		damage: Math.round(base.damage * 1.3),
		rangeSq: base.rangeSq * 1.3 * 1.3,
	}
}

export function getEffectiveTerritoryRadius(kind: BuildingKind, level: number): number {
	const base = BUILDING_CONFIG[kind].territoryRadius
	return level >= 1 ? Math.round(base * 1.1) : base
}

export function getBuildingKind(shape: TLShape): BuildingKind | null {
	const kind = shape.meta?.buildingKind
	if (typeof kind !== 'string') return null
	return (kind in BUILDING_CONFIG ? kind : null) as BuildingKind | null
}

export function getBuildingHp(shape: TLShape): number {
	const hp = shape.meta?.hp
	return typeof hp === 'number' ? hp : 0
}

export function getBuildingMaxHp(shape: TLShape): number {
	// Stored at construction so the "Reinforced walls" tech only buffs new
	// builds and HP bars stay correctly scaled.
	const m = shape.meta?.maxHp
	return typeof m === 'number' ? m : 0
}

export function getBuildingOwner(shape: TLShape): string | null {
	const owner = shape.meta?.owner
	return typeof owner === 'string' ? owner : null
}

export function getBuildingTownName(shape: TLShape): string | null {
	const name = shape.meta?.townName
	return typeof name === 'string' ? name : null
}

// Gate-only state. False (closed) by default. Non-gate buildings always
// return false — callers should also check getBuildingKind() === 'gate'
// before treating this as meaningful.
export function getBuildingGateOpen(shape: TLShape): boolean {
	return shape.meta?.gateOpen === true
}

// Pool of town names. We hand them out in shuffled-deck order so each town a
// player founds gets a distinct name within a match, and across matches the
// shuffle gives variety. The pool is intentionally far larger than any
// reasonable per-match town count.
const TOWN_NAME_POOL = [
	// Coast & water
	'Bluehaven',
	'Saltmere',
	'Riverbend',
	'Brightwater',
	'Tideguard',
	'Westport',
	'Lakehold',
	'Bayshore',
	'Mistmere',
	'Foamcrest',
	'Reedmarsh',
	'Otterbrook',
	'Silverbrook',
	'Whisperbrook',
	'Stillwater',
	// Highlands & cliffs
	'Highmoor',
	'Greycliff',
	'Crownpoint',
	'Eaglecrag',
	'Thornpeak',
	'Skyspire',
	'Cloudreach',
	'Ravenhill',
	'Stonecrest',
	'Wolfridge',
	'Sunspire',
	'Larkspur',
	'Brackenhill',
	'Bramblerise',
	'Hollowfell',
	// Forest & wood
	'Ashenvale',
	'Elderwood',
	'Mosswood',
	'Thistlewood',
	'Greenshade',
	'Foxglen',
	'Birchhollow',
	'Whisperwood',
	'Ravensgrove',
	'Pinemarch',
	'Hartwood',
	'Briargrove',
	'Willowbrake',
	'Owlswood',
	'Silverleaf',
	// Forts & holds
	'Ironhold',
	'Stoneford',
	'Stoneshield',
	'Thornkeep',
	'Whitewall',
	'Stormwatch',
	'Westwatch',
	'Northgate',
	'Eastmarch',
	'Southkeep',
	'Coldgate',
	'Highgate',
	'Highwall',
	'Goldgate',
	'Kingscrown',
	'Queenshelm',
	'Shieldhall',
	'Bastionrock',
	'Rampartfell',
	'Drakehold',
	'Wyrmrest',
	'Dragonfast',
	// Fire & metal
	'Emberhold',
	'Forgefall',
	'Cinderfall',
	'Brassgate',
	'Goldreach',
	'Coppervale',
	'Tinford',
	'Blackforge',
	'Ashforge',
	'Sunforge',
	// Cold & frost
	'Frostgale',
	'Icehollow',
	'Snowbrook',
	'Glacierford',
	'Coldhaven',
	'Whitethaw',
	'Hailpoint',
	// Plains & farms
	'Wheatford',
	'Grainhold',
	'Hayhollow',
	'Cloverfield',
	'Honeymoor',
	'Meadowmere',
	'Bramblefield',
	'Fellfield',
	'Greenwell',
	// Misc / mythic
	'Stormwell',
	'Moonfell',
	'Starwatch',
	'Sablerise',
	'Crowsmarket',
	'Fairhollow',
	'Goldenmere',
	'Lionsreach',
	'Bearpoint',
	'Falconrest',
	'Ravensford',
	'Stagspire',
	'Doewood',
	'Boarmarch',
	'Hollowmere',
	'Deepwell',
	'Brightspire',
	'Glassford',
	'Marblemark',
	'Quartzhollow',
	'Onyxgate',
] as const
let _townDeck: string[] = []
function refillTownDeck() {
	// Seeded shuffle so every client agrees on the assigned town names.
	_townDeck = shuffleInPlace([...TOWN_NAME_POOL])
}
export function pickTownName(): string {
	if (_townDeck.length === 0) refillTownDeck()
	return _townDeck.pop()!
}
export function resetTownDeck() {
	_townDeck = []
}

// Multi-slot save / load to localStorage. Each save is a JSON snapshot of
// every atom + the tldraw building shapes + the PRNG state + ID counters.
// Slots are addressed by an opaque id; an index record stores the metadata
// of every saved match so the load menu can render the list without parsing
// every full snapshot.
//
// Storage layout:
//   tlcraft:saves:index:v2  → { slots: SaveSlotInfo[] }
//   tlcraft:saves:slot:v2:<id> → SaveGame JSON
//
// We don't auto-save: every entry is created by an explicit user action so
// an in-flight bad decision doesn't get burned in.

import {
	deleteFromLocalStorage,
	Editor,
	getFromLocalStorage,
	JsonObject,
	setInLocalStorage,
	TLGeoShape,
	TLShapeId,
} from 'tldraw'
import { AgeId } from './age-config'
import { getBuildingKind, resetTownDeck } from './building-config'
import { resetGameLoop } from './game-loop'
import {
	AgeResearchItem,
	DamageNumber,
	NextIds,
	PlayerResources,
	Projectile,
	ResearchQueueItem,
	ResourceNode,
	TrainQueueItem,
	Unit,
	UpgradeQueueItem,
	ageResearchByPlayer,
	ageResearchByPlayer$,
	buildingCooldowns,
	completedTechs$,
	damageNumbers$,
	elapsedMs$,
	fogVersion$,
	gameOver$,
	gameStarted$,
	getNextIds,
	paused$,
	playerAges$,
	playerNations$,
	playerResources$,
	projectiles$,
	researchQueues,
	researchQueuesAtom$,
	resetGameState,
	resources$,
	selectedMapSize$,
	selectedMapType$,
	setNextIds,
	simSeed$,
	trainQueues,
	trainQueuesAtom$,
	units$,
	upgradeQueues,
	upgradeQueuesAtom$,
} from './game-state'
import { MapSizeId, MapTypeId, PLAYER_SPAWNS, getMapSize, getMapType } from './map'
import { NationId, getNation } from './nations'
import { rebuildNav } from './nav'
import { HUMAN_PLAYER_ID, PlayerId, updatePlayerStartBases } from './players'
import { getRandomState, setRandomSeed } from './random'
import { TechId } from './tech-config'
import { bumpTerrainVersion, deserializeTerrain, serializeTerrain } from './terrain'

const SAVES_INDEX_KEY = 'tlcraft:saves:index:v3'
const SAVE_SLOT_PREFIX = 'tlcraft:saves:slot:v3:'
const SAVE_VERSION = 3 as const

interface BuildingSave {
	id: TLShapeId
	x: number
	y: number
	props: {
		geo: 'rectangle' | 'triangle'
		w: number
		h: number
		color: string
		fill: string
	}
	meta: Record<string, unknown>
}

interface SaveGame {
	version: typeof SAVE_VERSION
	savedAt: number

	mapSize: MapSizeId
	mapType: MapTypeId | null
	playerSpawns: Array<{ x: number; y: number }>
	playerNations: Record<PlayerId, NationId>

	prngState: number
	simSeed: number
	elapsedMs: number
	gameOver: { winnerId: PlayerId } | null

	playerResources: Record<PlayerId, PlayerResources>
	completedTechs: Record<PlayerId, TechId[]>

	units: Unit[]
	resources: ResourceNode[]
	projectiles: Projectile[]
	damageNumbers: DamageNumber[]

	trainQueues: Record<string, TrainQueueItem[]>
	researchQueues: Record<string, ResearchQueueItem[]>
	upgradeQueues: Record<string, UpgradeQueueItem | null>
	buildingCooldowns: Record<string, { lastFiredAt: number }>

	nextIds: NextIds
	buildings: BuildingSave[]

	// Per-player current age (e.g. 'feudal') and the age-up research in flight
	// (or null). New in v3.
	playerAges: Record<PlayerId, AgeId>
	ageResearch: Record<PlayerId, AgeResearchItem | null>

	// Terrain grid serialized as base64 (one byte per tile). New in v3.
	terrain: string
}

export interface SaveSlotInfo {
	id: string
	name: string
	savedAt: number
	elapsedMs: number
	mapSize: MapSizeId
	mapType: MapTypeId | null
	humanNation: NationId | null
}

interface SaveIndex {
	slots: SaveSlotInfo[]
}

function readIndex(): SaveIndex {
	try {
		const raw = getFromLocalStorage(SAVES_INDEX_KEY)
		if (!raw) return { slots: [] }
		const data = JSON.parse(raw) as Partial<SaveIndex>
		if (!Array.isArray(data.slots)) return { slots: [] }
		return { slots: data.slots }
	} catch {
		return { slots: [] }
	}
}

function writeIndex(idx: SaveIndex) {
	try {
		setInLocalStorage(SAVES_INDEX_KEY, JSON.stringify(idx))
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[tlcraft] writeIndex failed', e)
	}
}

/** Sort newest-first so the load menu's first row is the most recent save. */
export function listSaves(): SaveSlotInfo[] {
	const idx = readIndex()
	return [...idx.slots].sort((a, b) => b.savedAt - a.savedAt)
}

function defaultSaveName(): string {
	const nationId = playerNations$.get()[HUMAN_PLAYER_ID] as NationId | undefined
	const nationLabel = nationId ? getNation(nationId).label : 'Match'
	const sizeId = selectedMapSize$.get()
	const sizeLabel = getMapSize(sizeId).label
	const mapTypeId = selectedMapType$.get()
	const mapTypeLabel = mapTypeId ? getMapType(mapTypeId).label : null
	const elapsedSec = Math.round(elapsedMs$.get() / 1000)
	const mins = Math.floor(elapsedSec / 60)
	const secs = elapsedSec % 60
	const elapsed = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
	const parts = [nationLabel, mapTypeLabel, sizeLabel, elapsed].filter(Boolean) as string[]
	return parts.join(' · ')
}

/** Snapshot the current match into a fresh slot. Returns the slot info if it
 * worked, null if the match isn't running or the write failed. */
export function saveGame(editor: Editor, name?: string): SaveSlotInfo | null {
	if (!gameStarted$.get()) return null
	try {
		const buildings: BuildingSave[] = []
		for (const shape of editor.getCurrentPageShapes()) {
			if (!getBuildingKind(shape)) continue
			buildings.push({
				id: shape.id,
				x: shape.x,
				y: shape.y,
				props: shape.props as BuildingSave['props'],
				meta: shape.meta as Record<string, unknown>,
			})
		}
		const completedRaw = completedTechs$.get()
		const completed: Record<PlayerId, TechId[]> = {}
		for (const pid of Object.keys(completedRaw)) {
			completed[pid] = [...(completedRaw[pid] as ReadonlySet<TechId>)]
		}

		const ageResearchSnapshot: Record<PlayerId, AgeResearchItem | null> = {}
		for (const [pid, item] of ageResearchByPlayer) ageResearchSnapshot[pid] = item

		const saveData: SaveGame = {
			version: SAVE_VERSION,
			savedAt: Date.now(),
			mapSize: selectedMapSize$.get(),
			mapType: selectedMapType$.get(),
			playerSpawns: PLAYER_SPAWNS.map((s) => ({ x: s.x, y: s.y })),
			playerNations: playerNations$.get() as Record<PlayerId, NationId>,
			prngState: getRandomState(),
			simSeed: simSeed$.get(),
			elapsedMs: elapsedMs$.get(),
			gameOver: gameOver$.get(),
			playerResources: playerResources$.get(),
			completedTechs: completed,
			units: units$.get(),
			resources: resources$.get(),
			projectiles: projectiles$.get(),
			damageNumbers: damageNumbers$.get(),
			trainQueues: trainQueuesAtom$.get(),
			researchQueues: researchQueuesAtom$.get(),
			upgradeQueues: upgradeQueuesAtom$.get(),
			buildingCooldowns: Object.fromEntries(buildingCooldowns),
			nextIds: getNextIds(),
			buildings,
			playerAges: playerAges$.get(),
			ageResearch: ageResearchSnapshot,
			terrain: serializeTerrain(),
		}

		const id = `s_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`
		const info: SaveSlotInfo = {
			id,
			name: name?.trim() || defaultSaveName(),
			savedAt: saveData.savedAt,
			elapsedMs: saveData.elapsedMs,
			mapSize: saveData.mapSize,
			mapType: saveData.mapType,
			humanNation: (playerNations$.get()[HUMAN_PLAYER_ID] as NationId | undefined) ?? null,
		}
		setInLocalStorage(SAVE_SLOT_PREFIX + id, JSON.stringify(saveData))
		const idx = readIndex()
		idx.slots.push(info)
		writeIndex(idx)
		return info
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[tlcraft] saveGame failed', e)
		return null
	}
}

export function deleteSave(id: string) {
	try {
		deleteFromLocalStorage(SAVE_SLOT_PREFIX + id)
		const idx = readIndex()
		idx.slots = idx.slots.filter((s) => s.id !== id)
		writeIndex(idx)
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[tlcraft] deleteSave failed', e)
	}
}

/** Restore the slot with the given id. `applyMapSettings` is the orchestrator
 * from TlcraftExample — passed as a callback so save.ts doesn't have to
 * understand the editor camera-options layout. */
export function loadGame(
	editor: Editor,
	id: string,
	applyMapSettings: (editor: Editor, sizeId: MapSizeId) => void
): boolean {
	const raw = (() => {
		try {
			return getFromLocalStorage(SAVE_SLOT_PREFIX + id)
		} catch {
			return null
		}
	})()
	if (!raw) return false

	let data: SaveGame
	try {
		data = JSON.parse(raw) as SaveGame
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[tlcraft] save JSON parse failed', e)
		return false
	}
	if (data.version !== SAVE_VERSION) {
		// eslint-disable-next-line no-console
		console.warn('[tlcraft] save version', data.version, 'not supported')
		return false
	}

	try {
		resetGameState()
		resetGameLoop()
		resetTownDeck()
		applyMapSettings(editor, data.mapSize)

		// Overwrite the freshly-rolled spawns with the saved ones so resource
		// nodes and buildings line up at exactly the saved coords.
		PLAYER_SPAWNS.length = 0
		for (const s of data.playerSpawns) PLAYER_SPAWNS.push({ x: s.x, y: s.y })
		updatePlayerStartBases(PLAYER_SPAWNS)

		const ids = editor.getCurrentPageShapes().map((s) => s.id)
		if (ids.length > 0) {
			editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
		}
		editor.run(
			() => {
				for (const b of data.buildings) {
					editor.createShape<TLGeoShape>({
						id: b.id,
						type: 'geo',
						x: b.x,
						y: b.y,
						isLocked: true,
						props: b.props as TLGeoShape['props'],
						meta: b.meta as JsonObject,
					})
				}
			},
			{ ignoreShapeLock: true }
		)

		units$.set(data.units)
		resources$.set(data.resources)
		projectiles$.set(data.projectiles)
		damageNumbers$.set(data.damageNumbers)
		playerResources$.set(data.playerResources)
		elapsedMs$.set(data.elapsedMs)
		gameOver$.set(data.gameOver)
		playerNations$.set(data.playerNations)
		selectedMapType$.set(data.mapType)
		selectedMapSize$.set(data.mapSize)
		simSeed$.set(data.simSeed)

		const techs: Record<PlayerId, ReadonlySet<TechId>> = {}
		for (const pid of Object.keys(data.completedTechs)) {
			techs[pid] = new Set(data.completedTechs[pid])
		}
		completedTechs$.set(techs)

		trainQueuesAtom$.set(data.trainQueues)
		researchQueuesAtom$.set(data.researchQueues)
		upgradeQueuesAtom$.set(data.upgradeQueues)
		trainQueues.clear()
		for (const id2 of Object.keys(data.trainQueues)) {
			trainQueues.set(id2 as TLShapeId, data.trainQueues[id2])
		}
		researchQueues.clear()
		for (const id2 of Object.keys(data.researchQueues)) {
			researchQueues.set(id2 as TLShapeId, data.researchQueues[id2])
		}
		upgradeQueues.clear()
		for (const id2 of Object.keys(data.upgradeQueues)) {
			upgradeQueues.set(id2 as TLShapeId, data.upgradeQueues[id2])
		}
		buildingCooldowns.clear()
		for (const id2 of Object.keys(data.buildingCooldowns)) {
			buildingCooldowns.set(id2 as TLShapeId, data.buildingCooldowns[id2])
		}

		setNextIds(data.nextIds)
		setRandomSeed(data.prngState)

		playerAges$.set(data.playerAges as Record<PlayerId, AgeId>)
		ageResearchByPlayer.clear()
		for (const pid of Object.keys(data.ageResearch)) {
			ageResearchByPlayer.set(pid as PlayerId, data.ageResearch[pid as PlayerId])
		}
		ageResearchByPlayer$.set(data.ageResearch)
		if (data.terrain) deserializeTerrain(data.terrain)
		bumpTerrainVersion()
		// Nav masks will be rebuilt on the first game tick via syncBuildings;
		// initial rebuild here gives pathfinding correct state before the
		// player's first command.
		rebuildNav([])

		gameStarted$.set(true)
		paused$.set(true)
		fogVersion$.update((v) => v + 1)
		return true
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('[tlcraft] loadGame failed', e)
		return false
	}
}

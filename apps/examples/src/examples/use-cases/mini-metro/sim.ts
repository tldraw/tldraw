// The pure Mini Metro simulation. No tldraw imports — the `World` is a plain
// mutable object that is the single source of truth. game-state.ts publishes
// snapshots of it into atoms for the overlays and HUD to render.

import {
	LINE_COLORS,
	LineColor,
	MAX_LINES,
	MIN_STATION_GAP,
	NEW_STATION_MS,
	OVERCROWD_LIMIT_MS,
	PASSENGER_BASE_MS,
	SHAPE_POOL,
	STARTING_SHAPES,
	STATION_CAPACITY,
	STATION_DWELL_MS,
	StationShape,
	TRAIN_CAPACITY,
	TRAIN_SPEED,
	WORLD,
} from './constants'

export interface Passenger {
	id: number
	dest: StationShape
}

export interface Station {
	id: number
	x: number
	y: number
	shape: StationShape
	passengers: Passenger[]
	overcrowdMs: number
}

export interface Line {
	id: number
	color: LineColor
	// Ordered path of station ids the line visits.
	stationIds: number[]
}

export interface Train {
	id: number
	lineId: number
	// The train sits on the leg between path[fromIdx] and path[toIdx]; `t` is the
	// fraction travelled along it. dir is implied by sign(toIdx - fromIdx).
	fromIdx: number
	toIdx: number
	t: number
	dwellMs: number
	passengers: Passenger[]
}

export interface World {
	stations: Station[]
	lines: Line[]
	trains: Train[]
	score: number
	timeMs: number
	passengerTimer: number
	stationTimer: number
	gameOver: boolean
	// Bumped whenever the set of stations or lines changes structurally, so the
	// host knows to re-sync the real tldraw shapes.
	structureVersion: number
	nextId: number
}

function uid(world: World) {
	return ++world.nextId
}

function pick<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

export function getStation(world: World, id: number): Station | undefined {
	return world.stations.find((s) => s.id === id)
}

export function getLine(world: World, id: number): Line | undefined {
	return world.lines.find((l) => l.id === id)
}

// The page-space points a line passes through, in order.
export function linePoints(world: World, line: Line) {
	return line.stationIds.map((id) => getStation(world, id)!).filter(Boolean)
}

export function createWorld(): World {
	const world: World = {
		stations: [],
		lines: [],
		trains: [],
		score: 0,
		timeMs: 0,
		passengerTimer: PASSENGER_BASE_MS,
		stationTimer: NEW_STATION_MS,
		gameOver: false,
		structureVersion: 0,
		nextId: 0,
	}

	// Three starting stations, spread across the middle of the map.
	const cx = (WORLD.minX + WORLD.maxX) / 2
	const cy = (WORLD.minY + WORLD.maxY) / 2
	const starts = [
		{ x: cx - 160, y: cy - 70 },
		{ x: cx + 170, y: cy - 30 },
		{ x: cx - 10, y: cy + 120 },
	]
	starts.forEach((p, i) => {
		world.stations.push({
			id: uid(world),
			x: p.x,
			y: p.y,
			shape: STARTING_SHAPES[i],
			passengers: [],
			overcrowdMs: 0,
		})
	})
	world.structureVersion++
	return world
}

// Which shapes currently exist on the map — passengers only ever want a shape
// that's reachable somewhere.
function existingShapes(world: World): StationShape[] {
	return Array.from(new Set(world.stations.map((s) => s.shape)))
}

function spawnPassenger(world: World) {
	const origin = pick(world.stations)
	const shapes = existingShapes(world).filter((s) => s !== origin.shape)
	if (shapes.length === 0) return
	origin.passengers.push({ id: uid(world), dest: pick(shapes) })
}

function spawnStation(world: World) {
	// Try a handful of random spots and keep the first that isn't crowding an
	// existing station.
	for (let attempt = 0; attempt < 24; attempt++) {
		const x = WORLD.minX + 60 + Math.random() * (WORLD.maxX - WORLD.minX - 120)
		const y = WORLD.minY + 60 + Math.random() * (WORLD.maxY - WORLD.minY - 120)
		const tooClose = world.stations.some((s) => Math.hypot(s.x - x, s.y - y) < MIN_STATION_GAP)
		if (tooClose) continue
		world.stations.push({
			id: uid(world),
			x,
			y,
			shape: pick(SHAPE_POOL),
			passengers: [],
			overcrowdMs: 0,
		})
		world.structureVersion++
		return
	}
}

// Does this line reach a station of the given shape? Passengers only board a
// train whose line can actually deliver them, which keeps riders from getting
// stuck (a deliberate simplification — no transfers in this version).
function lineReaches(world: World, line: Line, shape: StationShape) {
	return line.stationIds.some((id) => getStation(world, id)?.shape === shape)
}

// Handle a train arriving at a station: drop off anyone who's home, then board
// waiting passengers the line can deliver.
function serviceStation(world: World, train: Train, station: Station) {
	const line = getLine(world, train.lineId)
	if (!line) return

	// Alight everyone whose destination shape matches this station.
	const staying: Passenger[] = []
	for (const p of train.passengers) {
		if (p.dest === station.shape) world.score++
		else staying.push(p)
	}
	train.passengers = staying

	// Board waiting passengers, oldest first, that this line can deliver.
	const remaining: Passenger[] = []
	for (const p of station.passengers) {
		if (train.passengers.length < TRAIN_CAPACITY && lineReaches(world, line, p.dest)) {
			train.passengers.push(p)
		} else {
			remaining.push(p)
		}
	}
	station.passengers = remaining
}

function moveTrain(world: World, train: Train, dtMs: number) {
	const line = getLine(world, train.lineId)
	if (!line || line.stationIds.length < 2) return

	if (train.dwellMs > 0) {
		train.dwellMs -= dtMs
		return
	}

	const from = getStation(world, line.stationIds[train.fromIdx])
	const to = getStation(world, line.stationIds[train.toIdx])
	if (!from || !to) return

	const legLen = Math.hypot(to.x - from.x, to.y - from.y)
	const step = (TRAIN_SPEED * dtMs) / 1000
	train.t += legLen < 1 ? 1 : step / legLen

	if (train.t < 1) return

	// Arrived at `to`. Service it, then pick the next leg, bouncing at the ends.
	train.t = 0
	serviceStation(world, train, to)
	train.dwellMs = STATION_DWELL_MS

	const last = line.stationIds.length - 1
	let dir = Math.sign(train.toIdx - train.fromIdx) || 1
	if (train.toIdx >= last) dir = -1
	else if (train.toIdx <= 0) dir = 1
	train.fromIdx = train.toIdx
	train.toIdx = Math.max(0, Math.min(last, train.fromIdx + dir))
}

export function stepWorld(world: World, dtMs: number) {
	if (world.gameOver) return
	world.timeMs += dtMs

	// New passengers — the rate gently ramps up over the first few minutes.
	world.passengerTimer -= dtMs
	if (world.passengerTimer <= 0) {
		spawnPassenger(world)
		const ramp = Math.max(0.45, 1 - world.timeMs / 240000)
		world.passengerTimer += PASSENGER_BASE_MS * ramp
	}

	// New stations on a fixed cadence.
	world.stationTimer -= dtMs
	if (world.stationTimer <= 0) {
		spawnStation(world)
		world.stationTimer += NEW_STATION_MS
	}

	for (const train of world.trains) moveTrain(world, train, dtMs)

	// Overcrowding: a station that stays over capacity long enough ends the game.
	for (const station of world.stations) {
		if (station.passengers.length > STATION_CAPACITY) {
			station.overcrowdMs += dtMs
			if (station.overcrowdMs >= OVERCROWD_LIMIT_MS) world.gameOver = true
		} else {
			station.overcrowdMs = Math.max(0, station.overcrowdMs - dtMs * 2)
		}
	}
}

// How crowded a station is, 0..1, for the warning ring the overlay draws.
export function overcrowdFraction(station: Station) {
	return Math.max(0, Math.min(1, station.overcrowdMs / OVERCROWD_LIMIT_MS))
}

// Is this station an endpoint (or sole member) of a line?
function endpointLine(world: World, stationId: number) {
	for (const line of world.lines) {
		const n = line.stationIds.length
		if (line.stationIds[0] === stationId || line.stationIds[n - 1] === stationId) {
			return line
		}
	}
	return undefined
}

function nextFreeColor(world: World): LineColor | undefined {
	const used = new Set(world.lines.map((l) => l.color))
	return LINE_COLORS.find((c) => !used.has(c))
}

// What dragging from `fromId` would produce, without committing it. Returns the
// colour of the affected line so the drag preview can show it, or null if the
// connection isn't allowed.
export function previewColor(world: World, fromId: number, toId: number): LineColor | null {
	if (fromId === toId) return null
	const fromLine = endpointLine(world, fromId)
	const toLine = endpointLine(world, toId)

	if (fromLine && !fromLine.stationIds.includes(toId)) return fromLine.color
	if (toLine && !toLine.stationIds.includes(fromId)) return toLine.color

	const onAnyLine = (id: number) => world.lines.some((l) => l.stationIds.includes(id))
	if (!onAnyLine(fromId) && !onAnyLine(toId)) {
		return nextFreeColor(world) ?? null
	}
	return null
}

function addTrain(world: World, lineId: number) {
	world.trains.push({
		id: uid(world),
		lineId,
		fromIdx: 0,
		toIdx: 1,
		t: 0,
		dwellMs: STATION_DWELL_MS,
		passengers: [],
	})
}

// Commit a connection drawn from `fromId` to `toId`. Extends an existing line if
// one of the stations is an endpoint, otherwise starts a new line if a colour is
// free. Returns true if anything changed.
export function addConnection(world: World, fromId: number, toId: number): boolean {
	if (previewColor(world, fromId, toId) === null) return false

	const fromLine = endpointLine(world, fromId)
	const toLine = endpointLine(world, toId)

	// Extend an existing line by appending or prepending the new station.
	const extend = (line: Line, anchorId: number, addId: number) => {
		const n = line.stationIds.length
		if (line.stationIds[n - 1] === anchorId) {
			line.stationIds.push(addId) // append: existing leg indices stay valid
		} else {
			line.stationIds.unshift(addId) // prepend: shift every train's indices
			for (const train of world.trains) {
				if (train.lineId === line.id) {
					train.fromIdx++
					train.toIdx++
				}
			}
		}
		world.structureVersion++
	}

	if (fromLine && !fromLine.stationIds.includes(toId)) {
		extend(fromLine, fromId, toId)
		return true
	}
	if (toLine && !toLine.stationIds.includes(fromId)) {
		extend(toLine, toId, fromId)
		return true
	}

	const color = nextFreeColor(world)
	if (!color || world.lines.length >= MAX_LINES) return false
	const line: Line = { id: uid(world), color, stationIds: [fromId, toId] }
	world.lines.push(line)
	addTrain(world, line.id)
	world.structureVersion++
	return true
}

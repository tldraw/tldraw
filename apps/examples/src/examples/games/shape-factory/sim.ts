// The pure Shape Factory simulation. No tldraw imports — the `World` is a plain
// mutable object that is the single source of truth. game-state.ts publishes
// snapshots of it into atoms for the overlays and HUD to render.
//
// The model is a directed graph of machines connected by belts. Items are little
// shapes that flow along belts at a fixed speed, queueing behind one another.
// Extractors emit raw items; painters recolour the items that pass through them;
// the hub consumes items and scores the ones that match its current request.

import {
	BUFFER_CAP,
	EXTRACT_MS,
	FLASH_MS,
	HUB_MS,
	ItemColor,
	ItemShape,
	ITEM_GAP,
	ITEM_SPEED,
	MachineKind,
	PAINT_COLORS,
	PAINT_MS,
	RAW_SHAPES,
	WORLD,
} from './constants'

export interface Item {
	id: number
	shape: ItemShape
	color: ItemColor
}

export interface Machine {
	id: number
	kind: MachineKind
	x: number
	y: number
	// extractor: the raw shape it produces. painter: undefined.
	shape?: ItemShape
	// painter: the colour it paints items. extractor/hub: undefined.
	paint?: ItemColor
	// Items waiting to be processed (painter/hub) — what's arrived but not yet
	// handled.
	inbox: Item[]
	// Items ready to leave on an output belt (extractor/painter).
	outbox: Item[]
	// Counts down to the next emit (extractor) or process (painter/hub).
	timer: number
	// Round-robins which output belt the next item leaves on.
	outCursor: number
}

// A piece of cargo on a belt: an item and how far along it has travelled, 0..1.
export interface Cargo {
	item: Item
	t: number
}

export interface Belt {
	id: number
	fromId: number
	toId: number
	// Ordered nearest-the-source first (smallest t) to nearest-the-dest (largest).
	cargo: Cargo[]
}

export interface World {
	machines: Machine[]
	belts: Belt[]
	request: { shape: ItemShape; color: ItemColor }
	score: number
	timeMs: number
	// A short-lived pulse on the hub after it consumes an item: positive when the
	// item matched the request, negative when it didn't. Decays to zero.
	hubFlashMs: number
	hubFlashGood: boolean
	// Bumped whenever machines or belts change structurally, so the host knows to
	// re-sync the real tldraw shapes.
	structureVersion: number
	nextId: number
}

function uid(world: World) {
	return ++world.nextId
}

function pick<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

export function getMachine(world: World, id: number): Machine | undefined {
	return world.machines.find((m) => m.id === id)
}

// The straight page-space path a belt follows, source then destination.
export function beltPoints(world: World, belt: Belt) {
	const from = getMachine(world, belt.fromId)
	const to = getMachine(world, belt.toId)
	if (!from || !to) return null
	return { from, to }
}

export function beltLength(world: World, belt: Belt) {
	const pts = beltPoints(world, belt)
	if (!pts) return 0
	return Math.hypot(pts.to.x - pts.from.x, pts.to.y - pts.from.y) || 1
}

function makeMachine(world: World, kind: MachineKind, x: number, y: number): Machine {
	return { id: uid(world), kind, x, y, inbox: [], outbox: [], timer: 0, outCursor: 0 }
}

// Pick a request the player can plausibly fulfil: any raw shape, in grey or any
// painter colour.
function rollRequest(): { shape: ItemShape; color: ItemColor } {
	const colors: ItemColor[] = ['grey', ...PAINT_COLORS]
	return { shape: pick(RAW_SHAPES), color: pick(colors) }
}

export function createWorld(): World {
	const world: World = {
		machines: [],
		belts: [],
		request: { shape: 'circle', color: 'blue' },
		score: 0,
		timeMs: 0,
		hubFlashMs: 0,
		hubFlashGood: false,
		structureVersion: 0,
		nextId: 0,
	}

	const midY = (WORLD.minY + WORLD.maxY) / 2

	// Three raw-resource extractors down the left edge, one per raw shape.
	RAW_SHAPES.forEach((shape, i) => {
		const y = WORLD.minY + 120 + i * 200
		const m = makeMachine(world, 'extractor', WORLD.minX + 120, y)
		m.shape = shape
		m.timer = EXTRACT_MS * (i / RAW_SHAPES.length) // stagger so they don't pulse in unison
		world.machines.push(m)
	})

	// One painter per colour, stacked in the middle.
	PAINT_COLORS.forEach((color, i) => {
		const y = WORLD.minY + 140 + i * 180
		const m = makeMachine(world, 'painter', (WORLD.minX + WORLD.maxX) / 2, y)
		m.paint = color
		world.machines.push(m)
	})

	// One hub on the right — the goal everything flows toward.
	world.machines.push(makeMachine(world, 'hub', WORLD.maxX - 120, midY))

	world.request = rollRequest()
	world.structureVersion++
	return world
}

// Belts leaving / arriving at a machine.
function outBelts(world: World, machineId: number) {
	return world.belts.filter((b) => b.fromId === machineId)
}

// Can an item enter this belt right now — i.e. is the source end clear enough?
function beltHasRoom(world: World, belt: Belt) {
	if (belt.cargo.length === 0) return true
	const len = beltLength(world, belt)
	const gapT = ITEM_GAP / len
	// cargo[0] is nearest the source (smallest t).
	return belt.cargo[0].t >= gapT
}

// Try to move one item from a machine's outbox onto one of its output belts,
// round-robining across them so a fork is fed evenly.
function drainOutbox(world: World, machine: Machine) {
	if (machine.outbox.length === 0) return
	const belts = outBelts(world, machine.id)
	if (belts.length === 0) return

	for (let i = 0; i < belts.length; i++) {
		const belt = belts[(machine.outCursor + i) % belts.length]
		if (beltHasRoom(world, belt)) {
			belt.cargo.unshift({ item: machine.outbox.shift()!, t: 0 })
			machine.outCursor = (machine.outCursor + i + 1) % belts.length
			return
		}
	}
}

// Advance every item on a belt, keeping items spaced and delivering any that
// reach the destination machine's inbox.
function stepBelt(world: World, belt: Belt, dtMs: number) {
	const len = beltLength(world, belt)
	const step = (ITEM_SPEED * dtMs) / 1000 / len
	const gapT = ITEM_GAP / len
	const dest = getMachine(world, belt.toId)

	// Move from the front (largest t, nearest the destination) backwards so each
	// item is capped by the one ahead of it.
	for (let i = belt.cargo.length - 1; i >= 0; i--) {
		const c = belt.cargo[i]
		const ahead = belt.cargo[i + 1]
		const ceil = ahead ? ahead.t - gapT : Infinity
		c.t = Math.min(c.t + step, Math.min(1, ceil))
	}

	// Deliver any front items that have reached the end and that the destination
	// has room to accept.
	while (belt.cargo.length > 0) {
		const front = belt.cargo[belt.cargo.length - 1]
		if (front.t < 1) break
		if (!dest || dest.inbox.length >= BUFFER_CAP) break
		dest.inbox.push(front.item)
		belt.cargo.pop()
	}
}

function processMachine(world: World, machine: Machine, dtMs: number) {
	machine.timer -= dtMs

	switch (machine.kind) {
		case 'extractor': {
			if (machine.timer <= 0) {
				if (machine.outbox.length < BUFFER_CAP) {
					machine.outbox.push({ id: uid(world), shape: machine.shape!, color: 'grey' })
				}
				machine.timer += EXTRACT_MS
			}
			break
		}
		case 'painter': {
			if (machine.timer <= 0) {
				if (machine.inbox.length > 0 && machine.outbox.length < BUFFER_CAP) {
					const item = machine.inbox.shift()!
					item.color = machine.paint!
					machine.outbox.push(item)
				}
				machine.timer += PAINT_MS
			}
			break
		}
		case 'hub': {
			if (machine.timer <= 0) {
				if (machine.inbox.length > 0) {
					const item = machine.inbox.shift()!
					const matched = item.shape === world.request.shape && item.color === world.request.color
					if (matched) {
						world.score++
						world.request = rollRequest()
					}
					world.hubFlashMs = FLASH_MS
					world.hubFlashGood = matched
				}
				machine.timer += HUB_MS
			}
			break
		}
	}
}

export function stepWorld(world: World, dtMs: number) {
	world.timeMs += dtMs
	world.hubFlashMs = Math.max(0, world.hubFlashMs - dtMs)

	for (const machine of world.machines) processMachine(world, machine, dtMs)
	for (const machine of world.machines) drainOutbox(world, machine)
	for (const belt of world.belts) stepBelt(world, belt, dtMs)
}

// What kinds of connection are legal: extractors only output, the hub only
// inputs, and you can't connect a machine to itself or duplicate a belt.
export function canConnect(world: World, fromId: number, toId: number): boolean {
	if (fromId === toId) return false
	const from = getMachine(world, fromId)
	const to = getMachine(world, toId)
	if (!from || !to) return false
	if (from.kind === 'hub') return false // hub has no output
	if (to.kind === 'extractor') return false // extractor has no input
	if (world.belts.some((b) => b.fromId === fromId && b.toId === toId)) return false
	return true
}

// Commit a belt drawn from `fromId` to `toId`. Returns true if anything changed.
export function addBelt(world: World, fromId: number, toId: number): boolean {
	if (!canConnect(world, fromId, toId)) return false
	world.belts.push({ id: uid(world), fromId, toId, cargo: [] })
	world.structureVersion++
	return true
}

// Remove a belt (and drop whatever was riding it). Returns true if removed.
export function removeBelt(world: World, beltId: number): boolean {
	const i = world.belts.findIndex((b) => b.id === beltId)
	if (i === -1) return false
	world.belts.splice(i, 1)
	world.structureVersion++
	return true
}

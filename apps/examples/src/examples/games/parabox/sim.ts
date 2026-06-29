// A recursive-box Sokoban (Patrick's Parabox), with recursion as the primitive:
// the entire game is one recursive resolver where push, enter, and exit are the
// same code path. No tldraw imports — the World is a plain mutable object.
//
// Model: every object lives in exactly one Room at one cell. A `box` object has
// an `interiorRoomId` you enter. A Room has an `ownerId`: the canonical box you
// exit through (unique per room, so exit is never ambiguous). A self-referential
// box is a box sitting inside a room whose `interiorRoomId` points back to that
// same room — entering it loops, which is the infinite enter/exit.

export type Dir = 'up' | 'down' | 'left' | 'right'

export const DIRS: Record<Dir, { dx: number; dy: number }> = {
	up: { dx: 0, dy: -1 },
	down: { dx: 0, dy: 1 },
	left: { dx: -1, dy: 0 },
	right: { dx: 1, dy: 0 },
}

export type ObjKind = 'wall' | 'block' | 'player' | 'box'

export interface Obj {
	id: string
	kind: ObjKind
	color: string
	roomId: string
	x: number
	y: number
	// Present for boxes: the room you enter when pushed into this object.
	interiorRoomId?: string
}

export interface Room {
	id: string
	w: number
	h: number
	// cells[y][x] = object id or null
	cells: (string | null)[][]
	// The canonical box whose interior this room is (null for the root level).
	// Exiting always resolves through the owner, so it must be unique.
	ownerId: string | null
}

export interface Target {
	roomId: string
	x: number
	y: number
}

export interface World {
	rooms: Record<string, Room>
	objects: Record<string, Obj>
	rootRoomId: string
	playerId: string
	targets: Target[]
	moves: number
	won: boolean
}

// Safety net for self-referential cycles: any single move resolves within this
// many recursion steps or it's treated as blocked. Far above any real move.
const MAX_DEPTH = 80

function inBounds(room: Room, x: number, y: number) {
	return x >= 0 && y >= 0 && x < room.w && y < room.h
}

// The slot one step in `dir` from (roomId, x, y), crossing room boundaries by
// exiting through the room's owner box. Returns null at the root boundary.
function stepOut(
	world: World,
	roomId: string,
	x: number,
	y: number,
	dir: Dir
): {
	roomId: string
	x: number
	y: number
} | null {
	const { dx, dy } = DIRS[dir]
	const room = world.rooms[roomId]
	const nx = x + dx
	const ny = y + dy
	if (inBounds(room, nx, ny)) return { roomId, x: nx, y: ny }
	// Out of bounds: exit through the owner box into its room, recursing if the
	// owner is itself at the edge of its room.
	if (!room.ownerId) return null
	const owner = world.objects[room.ownerId]
	return stepOut(world, owner.roomId, owner.x, owner.y, dir)
}

// The cell an entering object lands on, on the face opposite `dir`, centred on
// the perpendicular axis.
function entryCell(room: Room, dir: Dir): { x: number; y: number } {
	const midX = Math.floor((room.w - 1) / 2)
	const midY = Math.floor((room.h - 1) / 2)
	switch (dir) {
		case 'right':
			return { x: 0, y: midY }
		case 'left':
			return { x: room.w - 1, y: midY }
		case 'down':
			return { x: midX, y: 0 }
		case 'up':
			return { x: midX, y: room.h - 1 }
	}
}

function moveObjTo(world: World, objId: string, roomId: string, x: number, y: number) {
	const o = world.objects[objId]
	world.rooms[o.roomId].cells[o.y][o.x] = null
	o.roomId = roomId
	o.x = x
	o.y = y
	world.rooms[roomId].cells[y][x] = objId
}

// Try to put `objId` into cell (roomId, x, y), moving in `dir`, resolving any
// occupant by pushing it onward or entering it. Mutates on success.
function placeAt(
	world: World,
	objId: string,
	roomId: string,
	x: number,
	y: number,
	dir: Dir,
	depth: number
): boolean {
	if (depth > MAX_DEPTH) return false
	const occ = world.rooms[roomId].cells[y][x]
	if (occ == null) {
		moveObjTo(world, objId, roomId, x, y)
		return true
	}
	if (occ === objId) return false
	const occObj = world.objects[occ]
	if (occObj.kind === 'wall') return false

	// 1) Try to push the occupant onward; if it yields, take its place.
	if (tryMove(world, occ, dir, depth + 1)) {
		moveObjTo(world, objId, roomId, x, y)
		return true
	}

	// 2) Otherwise, if the occupant is a box, enter it.
	if (occObj.interiorRoomId) {
		const inner = world.rooms[occObj.interiorRoomId]
		const e = entryCell(inner, dir)
		if (placeAt(world, objId, occObj.interiorRoomId, e.x, e.y, dir, depth + 1)) return true
	}

	return false
}

// Try to move `objId` one step in `dir`. Mutates on success.
function tryMove(world: World, objId: string, dir: Dir, depth: number): boolean {
	if (depth > MAX_DEPTH) return false
	const o = world.objects[objId]
	if (o.kind === 'wall') return false
	const dest = stepOut(world, o.roomId, o.x, o.y, dir)
	if (!dest) return false
	return placeAt(world, objId, dest.roomId, dest.x, dest.y, dir, depth + 1)
}

function checkWin(world: World): boolean {
	return world.targets.every((t) => {
		const occ = world.rooms[t.roomId].cells[t.y][t.x]
		if (!occ) return false
		const kind = world.objects[occ].kind
		return kind === 'box' || kind === 'block'
	})
}

// Move the player one step. Returns whether anything moved.
export function move(world: World, dir: Dir): boolean {
	if (world.won) return false
	const moved = tryMove(world, world.playerId, dir, 0)
	if (moved) {
		world.moves++
		world.won = checkWin(world)
	}
	return moved
}

// Depth of a room below the root (root = 0), via owner chain.
export function roomDepth(world: World, roomId: string): number {
	let d = 0
	let r = world.rooms[roomId]
	while (r.ownerId) {
		r = world.rooms[world.objects[r.ownerId].roomId]
		d++
		if (d > MAX_DEPTH) break
	}
	return d
}

export function cloneWorld(world: World): World {
	return JSON.parse(JSON.stringify(world))
}

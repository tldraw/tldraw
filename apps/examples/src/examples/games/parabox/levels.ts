// Levels as ASCII grids, one grid per room. Characters:
//   #  wall        @  player      $  block (pushable)
//   =  target      .  floor       (space) floor
//   A-Z            a box whose interior is the room with that name
//
// A box character points at the room named by its letter. The first box created
// for a room (the one in the root, parsed first) becomes that room's owner — the
// box you exit through. A box sitting inside its own room (e.g. an `R` inside
// room `R`) is therefore a recursive reference: entering it loops forever.

import { Obj, Room, Target, World } from './sim'

export interface LevelDef {
	name: string
	root: string
	rooms: Record<string, string[]>
}

const BOX_COLORS = ['violet', 'orange', 'green', 'light-red']

export function parseLevel(def: LevelDef): World {
	const rooms: Record<string, Room> = {}
	const objects: Record<string, Obj> = {}
	const targets: Target[] = []
	let playerId = ''
	let n = 0
	const id = (p: string) => `${p}${n++}`

	for (const [name, grid] of Object.entries(def.rooms)) {
		const h = grid.length
		const w = Math.max(...grid.map((r) => r.length))
		rooms[name] = {
			id: name,
			w,
			h,
			cells: Array.from({ length: h }, () => Array(w).fill(null)),
			ownerId: null,
		}
	}

	const colorForLetter: Record<string, string> = {}
	let colorIdx = 0

	// Root first, so the root-level box becomes each interior room's owner and the
	// nested copies are recursive references.
	const order = [def.root, ...Object.keys(def.rooms).filter((r) => r !== def.root)]
	for (const name of order) {
		const grid = def.rooms[name]
		for (let y = 0; y < grid.length; y++) {
			const row = grid[y]
			for (let x = 0; x < row.length; x++) {
				const ch = row[x]
				if (ch === '#') {
					const w = id('w')
					objects[w] = { id: w, kind: 'wall', color: 'grey', roomId: name, x, y }
					rooms[name].cells[y][x] = w
				} else if (ch === '@') {
					const p = id('p')
					objects[p] = { id: p, kind: 'player', color: 'light-blue', roomId: name, x, y }
					rooms[name].cells[y][x] = p
					playerId = p
				} else if (ch === '$') {
					const b = id('b')
					objects[b] = { id: b, kind: 'block', color: 'yellow', roomId: name, x, y }
					rooms[name].cells[y][x] = b
				} else if (ch === '=') {
					targets.push({ roomId: name, x, y })
				} else if (ch >= 'A' && ch <= 'Z') {
					if (!colorForLetter[ch]) colorForLetter[ch] = BOX_COLORS[colorIdx++ % BOX_COLORS.length]
					const x0 = id('x')
					objects[x0] = {
						id: x0,
						kind: 'box',
						color: colorForLetter[ch],
						roomId: name,
						x,
						y,
						interiorRoomId: ch,
					}
					rooms[name].cells[y][x] = x0
					if (rooms[ch] && rooms[ch].ownerId === null) rooms[ch].ownerId = x0
				}
			}
		}
	}

	return { rooms, objects, rootRoomId: def.root, playerId, targets, moves: 0, won: false }
}

export const LEVELS: LevelDef[] = [
	{
		// Warm-up, but it needs a turn: push the block right to the wall, then come
		// round underneath and push it up onto the target.
		name: 'Corner',
		root: 'main',
		rooms: {
			main: [
				'######', //
				'#...=#',
				'#@$..#',
				'#....#',
				'######',
			],
		},
	},
	{
		// Push the block into the box, then follow it in and turn it down onto the
		// target — you have to reposition inside the box.
		name: 'Enter',
		root: 'main',
		rooms: {
			main: [
				'########', //
				'#......#',
				'#@$..A##',
				'#......#',
				'########',
			],
			A: [
				'...', //
				'...',
				'.=.',
			],
		},
	},
	{
		// A box that contains itself — entering loops forever (infinite zoom). Drive
		// the block in, push it across, then up-and-over onto the target.
		name: 'Recursion',
		root: 'main',
		rooms: {
			main: [
				'#######', //
				'#.....#',
				'#@$..R#',
				'#.....#',
				'#######',
			],
			R: [
				'...R.', //
				'.....',
				'..=..',
			],
		},
	},
	{
		// Boxes nested two deep: the block (and you) have to descend main → A → B to
		// reach the target. This is the one that exercises multiple real zooms.
		name: 'Nest',
		root: 'main',
		rooms: {
			main: [
				'#######', //
				'#.....#',
				'#@$..A#',
				'#.....#',
				'#######',
			],
			A: [
				'.....', //
				'.B#..',
				'.....',
			],
			B: [
				'...', //
				'.=.',
				'...',
			],
		},
	},
]

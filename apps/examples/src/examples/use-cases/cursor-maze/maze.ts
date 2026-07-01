import { Vec } from 'tldraw'

/**
 * A grid maze. The grid is forced to odd dimensions so that corridors are one
 * cell wide and walls are one cell thick — a classic "thick wall" labyrinth.
 */
export interface Maze {
	cols: number
	rows: number
	/** World units per grid cell. */
	cell: number
	/** Row-major grid; `true` means the cell is a wall. */
	solid: boolean[]
	/** World position (cell center) where the player starts. */
	start: Vec
	/** World position (cell center) of the exit. */
	goal: Vec
}

/** Anything outside the grid counts as a wall, so the player can't escape. */
export function isWall(maze: Maze, col: number, row: number): boolean {
	if (col < 0 || col >= maze.cols || row < 0 || row >= maze.rows) return true
	return maze.solid[row * maze.cols + col]
}

/**
 * A seeded random-number generator (mulberry32 over an fnv-1a string hash). Two
 * clients that pass the same seed get the identical sequence — and so the
 * identical maze — which is how everyone in a sync room shares one maze.
 */
export function rngFromString(seed: string): () => number {
	let h = 2166136261 >>> 0
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	let a = h >>> 0
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** Carve a maze with an iterative recursive-backtracker. */
export function generateMaze(
	cols: number,
	rows: number,
	cell: number,
	rng: () => number = Math.random
): Maze {
	// Corridors live on odd indices, walls on even ones, so both dimensions
	// need to be odd.
	const c = cols % 2 === 0 ? cols + 1 : cols
	const r = rows % 2 === 0 ? rows + 1 : rows
	const solid = new Array<boolean>(c * r).fill(true)
	const at = (col: number, row: number) => row * c + col

	const stack: Array<[number, number]> = [[1, 1]]
	solid[at(1, 1)] = false

	// Neighbours two cells away (skipping over the wall between them).
	const dirs = [
		[0, -2],
		[2, 0],
		[0, 2],
		[-2, 0],
	]

	while (stack.length > 0) {
		const [cx, cy] = stack[stack.length - 1]
		const options: Array<[number, number, number, number]> = []
		for (const [dx, dy] of dirs) {
			const nx = cx + dx
			const ny = cy + dy
			if (nx > 0 && nx < c - 1 && ny > 0 && ny < r - 1 && solid[at(nx, ny)]) {
				// Track the neighbour and the wall cell between us and it.
				options.push([nx, ny, cx + dx / 2, cy + dy / 2])
			}
		}
		if (options.length === 0) {
			stack.pop()
			continue
		}
		const [nx, ny, wx, wy] = options[Math.floor(rng() * options.length)]
		solid[at(wx, wy)] = false
		solid[at(nx, ny)] = false
		stack.push([nx, ny])
	}

	return {
		cols: c,
		rows: r,
		cell,
		solid,
		start: new Vec(1.5 * cell, 1.5 * cell),
		goal: new Vec((c - 1.5) * cell, (r - 1.5) * cell),
	}
}

// Keep the player a hair off each wall so floating-point rounding can't park it
// exactly on a cell boundary (where the next frame would read it as embedded).
const SKIN = 0.01

/** Move along X, treating the player as an axis-aligned box of half-size `r`. */
function sweepX(maze: Maze, x: number, y: number, dx: number, r: number): number {
	if (dx === 0) return x
	const { cell } = maze
	const nx = x + dx
	const rowTop = Math.floor((y - r + SKIN) / cell)
	const rowBottom = Math.floor((y + r - SKIN) / cell)
	if (dx > 0) {
		const col = Math.floor((nx + r) / cell)
		for (let row = rowTop; row <= rowBottom; row++) {
			if (isWall(maze, col, row)) return col * cell - r - SKIN
		}
	} else {
		const col = Math.floor((nx - r) / cell)
		for (let row = rowTop; row <= rowBottom; row++) {
			if (isWall(maze, col, row)) return (col + 1) * cell + r + SKIN
		}
	}
	return nx
}

/** Move along Y, treating the player as an axis-aligned box of half-size `r`. */
function sweepY(maze: Maze, x: number, y: number, dy: number, r: number): number {
	if (dy === 0) return y
	const { cell } = maze
	const ny = y + dy
	const colLeft = Math.floor((x - r + SKIN) / cell)
	const colRight = Math.floor((x + r - SKIN) / cell)
	if (dy > 0) {
		const row = Math.floor((ny + r) / cell)
		for (let col = colLeft; col <= colRight; col++) {
			if (isWall(maze, col, row)) return row * cell - r - SKIN
		}
	} else {
		const row = Math.floor((ny - r) / cell)
		for (let col = colLeft; col <= colRight; col++) {
			if (isWall(maze, col, row)) return (row + 1) * cell + r + SKIN
		}
	}
	return ny
}

/**
 * Slide the player from `from` toward `to`, stopping at maze walls. Returns the
 * collision-resolved position.
 */
export function moveAvatar(maze: Maze, from: Vec, to: Vec, r: number): Vec {
	const dx = to.x - from.x
	const dy = to.y - from.y
	const dist = Math.hypot(dx, dy)
	if (dist === 0) return from.clone()

	// Substep so a fast flick of the mouse can't tunnel through a thin wall.
	const steps = Math.max(1, Math.ceil(dist / (maze.cell * 0.4)))
	const sx = dx / steps
	const sy = dy / steps

	let x = from.x
	let y = from.y
	for (let i = 0; i < steps; i++) {
		// Resolve the axes one at a time so the player slides along a wall
		// instead of sticking when pushed into it diagonally.
		x = sweepX(maze, x, y, sx, r)
		y = sweepY(maze, x, y, sy, r)
	}
	return new Vec(x, y)
}

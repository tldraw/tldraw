import { Box, Vec } from 'tldraw'

type GridPosition = [number, number]

interface GridNode {
	vec: Vec
	x: number
	y: number
	f: number
	g: number
	h: number
	e: number
	d?: 't' | 'r' | 'b' | 'l'
	parent: GridNode | null
}

export interface ArrowGuide {
	c: GridNode
	grid: GridNode[][]
	map: Map<GridNode, GridPosition>
	startNodes: {
		t: GridNode
		r: GridNode
		b: GridNode
		l: GridNode
	}
	endNodes: {
		t: GridNode
		r: GridNode
		b: GridNode
		l: GridNode
	}
	bannedNodes: Set<GridNode>
	path: Vec[]
}

export function getArrowGuide({
	A,
	B,
	p,
	start,
	end: _,
}: {
	A: Box
	B: Box
	start: 't' | 'r' | 'b' | 'l' | 'any'
	end: 't' | 'r' | 'b' | 'l' | 'any'
	p: number
}) {
	const g: ArrowGuide = {
		grid: [],
		map: new Map(),
		startNodes: {} as any,
		endNodes: {} as any,
		bannedNodes: new Set(),
		path: [],
		c: {} as any,
	}

	// collect all of the points in the grid
	const xs = [
		A.minX,
		A.midX,
		A.maxX,
		B.minX,
		B.midX,
		B.maxX,
		A.minX - p,
		A.maxX + p,
		B.minX - p,
		B.maxX + p,
	]

	const ys = [
		A.minY,
		A.midY,
		A.maxY,
		B.minY,
		B.midY,
		B.maxY,
		A.minY - p,
		A.maxY + p,
		B.minY - p,
		B.maxY + p,
	]

	let cx = A.midX
	let cy = A.midY

	if (A.maxX < B.minX && A.maxX < B.minX) {
		// A left of B
		cx = (A.maxX + B.minX) / 2
		xs.push(cx)
	} else if (A.maxX < B.maxX && A.maxX > B.minX) {
		if (A.minX > B.minX) {
			// A within B, noop
			cx = A.midX
		} else {
			// A partially left of B
			cx = (B.maxX + B.minX) / 2
			xs.push(cx)
		}
	} else if (A.maxX > B.maxX) {
		if (A.minX < B.minX) {
			// A contains B, noop
			cx = A.midX
		} else {
			// A partially right of B
			cx = (A.minX + B.maxX) / 2
			xs.push(cx)
		}
	}

	if (A.maxY < B.minY && A.maxY < B.minY) {
		// A above B
		cy = (A.maxY + B.minY) / 2
		ys.push(cy)
	} else if (A.maxY < B.maxY && A.maxY > B.minY) {
		if (A.minY > B.minY) {
			// A within B, noop
			cy = A.midY
		} else {
			// A partially above B
			cy = (B.maxY + B.minY) / 2
			ys.push(cy)
		}
	} else if (A.maxY > B.maxY) {
		if (A.minY < B.minY) {
			// A contains B, noop
			cy = A.midY
		} else {
			// A partially below B
			cy = (A.minY + B.maxY) / 2
			ys.push(cy)
		}
	}

	xs.sort((a, b) => a - b)
	ys.sort((a, b) => a - b)

	// populate grid and map
	for (let y = 0; y < ys.length; y++) {
		g.grid[y] = []
		for (let x = 0; x < xs.length; x++) {
			g.grid[y][x] = {
				vec: new Vec(xs[x], ys[y]),
				x,
				y,
				g: Infinity,
				h: 0,
				f: 0,
				e: 0,
				parent: null,
			}
			g.map.set(g.grid[y][x], [x, y])
		}
	}

	g.c = g.grid[ys.indexOf(cy)][xs.indexOf(cx)]

	// populate start and end nodes
	for (let i = 0; i < g.grid.length; i++) {
		for (let j = 0; j < g.grid[i].length; j++) {
			const node = g.grid[i][j]
			if (node.vec.x === A.midX && node.vec.y === A.minY) g.startNodes['t'] = node
			if (node.vec.x === A.midX && node.vec.y === A.maxY) g.startNodes['b'] = node
			if (node.vec.x === A.minX && node.vec.y === A.midY) g.startNodes['l'] = node
			if (node.vec.x === A.maxX && node.vec.y === A.midY) g.startNodes['r'] = node
			if (node.vec.x === B.midX && node.vec.y === B.minY) g.endNodes['t'] = node
			if (node.vec.x === B.midX && node.vec.y === B.maxY) g.endNodes['b'] = node
			if (node.vec.x === B.minX && node.vec.y === B.midY) g.endNodes['l'] = node
			if (node.vec.x === B.maxX && node.vec.y === B.midY) g.endNodes['r'] = node
			if (
				// (node.vec.x >= A.minX - p &&
				// 	node.vec.x <= A.maxX + p &&
				// 	node.vec.y >= A.minY - p &&
				// 	node.vec.y <= A.maxY + p) ||
				node.vec.x >= B.minX - p &&
				node.vec.x <= B.maxX + p &&
				node.vec.y >= B.minY - p &&
				node.vec.y <= B.maxY + p
			) {
				g.bannedNodes.add(node)
			}
		}
	}

	// console.log(path)

	const paths = (start === 'any' ? Object.entries(g.startNodes) : [g.startNodes[start]]).map(
		([d, n]: any) => aStarAlgorithm(g, n, d as any)
	)
	const pathToShow = paths.sort((a, b) => a.length - b.length)[0]

	g.path = pathToShow.map((n) => n.vec)

	return g
}

function aStarAlgorithm(g: ArrowGuide, start: GridNode, initialD: 't' | 'r' | 'b' | 'l') {
	const openSet = new Set<GridNode>()
	const closedSet = new Set<GridNode>()

	const endNodes = Object.values(g.endNodes)

	// Reset nodes
	for (let y = 0; y < g.grid.length; y++) {
		for (let x = 0; x < g.grid[y].length; x++) {
			const node = g.grid[y][x]
			node.g = Infinity
			node.h = 0
			node.f = 0
			node.e = 0
			node.parent = null
			delete node.d
		}
	}

	// Initialize start node
	start.g = 0
	start.h = getHeuristic(g, start, endNodes)
	start.f = start.g + start.h
	start.d = initialD
	openSet.add(start)

	while (openSet.size > 0) {
		const current = [...openSet.values()].reduce((acc, node) =>
			!acc || node.f < acc.f ? node : acc
		)

		if (endNodes.includes(current)) {
			return reconstructPath(current)
		}

		openSet.delete(current)
		closedSet.add(current)

		const neighbors = getNeighbors(g, current)

		for (let i = 0; i < 4; i++) {
			const neighbor = neighbors[i]
			const dir = DIRS[i]
			const isElbow = dir !== current.d

			if (!neighbor || closedSet.has(neighbor)) {
				continue
			}

			if (current === start && isElbow) {
				console.log('skipping elbow on start', dir, current.d)
				continue
			}

			if (
				(neighbor === g.endNodes.t && dir !== 'b') ||
				(neighbor === g.endNodes.b && dir !== 't') ||
				(neighbor === g.endNodes.r && dir !== 'l') ||
				(neighbor === g.endNodes.l && dir !== 'r')
			) {
				continue
			}

			// if the next point is in the same direction as the previous point,
			// the cost is zero; otherwise, if the next point would make the path
			// take a left or right turn, then the cost is 1

			const tentativeG = current.g + (isElbow ? 1 : 0)

			if (!openSet.has(neighbor)) {
				openSet.add(neighbor)
			} else if (tentativeG >= neighbor.g) {
				continue
			}

			// Update neighbor scores
			neighbor.parent = current
			neighbor.g = tentativeG
			neighbor.h = getHeuristic(g, neighbor, endNodes)
			neighbor.f = neighbor.g + neighbor.h
			neighbor.d = dir
		}
	}

	return []
}

function getHeuristic(g: ArrowGuide, node: GridNode, endNodes: GridNode[]): number {
	// const distFromCenter = Math.abs(node.x - g.c.x) + Math.abs(node.y - g.c.y)
	return Math.min(
		...endNodes.map((end) => {
			const distFromEndNodes = Math.abs(node.x - end.x) + Math.abs(node.y - end.y)
			return distFromEndNodes // + distFromCenter
		})
	)
}

function reconstructPath(endNode: GridNode): GridNode[] {
	const path: GridNode[] = []
	let current: GridNode | null = endNode

	while (current) {
		path.unshift(current)
		current = current.parent
	}

	return path
}

function getNeighbors(g: ArrowGuide, node: GridNode) {
	return DIRS.map((d) => getAdjacentNode(g, node, d))
}

function getAdjacentNode(
	g: ArrowGuide,
	node: GridNode,
	dir: 't' | 'r' | 'b' | 'l'
): GridNode | undefined {
	const pos = g.map.get(node)!
	const tpos = [pos[0], pos[1]] as GridPosition
	if (dir === 't') tpos[1]--
	if (dir === 'b') tpos[1]++
	if (dir === 'l') tpos[0]--
	if (dir === 'r') tpos[0]++
	return g.grid[tpos[1]]?.[tpos[0]]
}

const DIRS = ['t', 'r', 'b', 'l'] as const

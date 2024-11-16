import { Box, Vec } from 'tldraw'

interface Guide {
	grid: Vec[][]
	map: Map<Vec, [number, number]>
}

export function getArrowNewPath(A: Box, B: Box, p: number) {
	const xs = [
		// A.minX,
		// A.maxX,
		// B.minX,
		// B.maxX,
		A.minX - p,
		A.maxX + p,
		A.midX,
		B.minX - p,
		B.maxX + p,
		B.midX,
	]
	const ys = [
		// A.minY,
		// A.maxY,
		// B.minY,
		// B.maxY,
		A.minY - p,
		A.maxY + p,
		A.midY,
		B.minY - p,
		B.maxY + p,
		B.midY,
	]

	if (A.maxX < B.minX && A.maxX < B.minX) {
		// A left of B
		xs.push(A.maxX + B.minX / 2)
	} else if (A.maxX < B.maxX && A.maxX > B.minX) {
		if (A.minX > B.minX) {
			// A within B, noop
		} else {
			// A partially left of B
			xs.push(B.maxX - B.minX / 2)
		}
	} else if (A.maxX > B.maxX) {
		if (A.minX < B.minX) {
			// A contains B, noop
		} else {
			// A partially right of B
			xs.push(A.minX + B.maxX / 2)
		}
	}

	if (A.maxY < B.minY && A.maxY < B.minY) {
		// A above B
		ys.push(A.maxY + B.minY / 2)
	} else if (A.maxY < B.maxY && A.maxY > B.minY) {
		if (A.minY > B.minY) {
			// A within B, noop
		} else {
			// A partially above B
			ys.push(B.maxY - B.minY / 2)
		}
	} else if (A.maxY > B.maxY) {
		if (A.minY < B.minY) {
			// A contains B, noop
		} else {
			// A partially below B
			ys.push(A.minY + B.maxY / 2)
		}
	}

	xs.sort((a, b) => a - b)
	ys.sort((a, b) => a - b)

	const g: Guide = {
		grid: [],
		map: new Map(),
	}

	for (let i = 0; i < ys.length; i++) {
		g.grid[i] = []
		for (let j = 0; j < xs.length; i++) {
			g.grid[i].push(new Vec(xs[j], ys[i]))
			g.map.set(g.grid[i][j], [i, j])
		}
	}
}

import { DieGeometry, makeFace } from './types'

/**
 * D6 — Cube.
 * 6 square faces. Inscribed in the unit sphere (circumradius = 1).
 * Opposite faces sum to 7.
 */

const s = 1 / Math.sqrt(3)

// 8 vertices of a cube inscribed in the unit sphere
const v0: [number, number, number] = [-s, -s, -s]
const v1: [number, number, number] = [+s, -s, -s]
const v2: [number, number, number] = [+s, +s, -s]
const v3: [number, number, number] = [-s, +s, -s]
const v4: [number, number, number] = [-s, -s, +s]
const v5: [number, number, number] = [+s, -s, +s]
const v6: [number, number, number] = [+s, +s, +s]
const v7: [number, number, number] = [-s, +s, +s]

const vertices: [number, number, number][] = [v0, v1, v2, v3, v4, v5, v6, v7]

// Standard western D6 layout (looking at face 1):
// 1: front (+z), 6: back (-z)
// 3: right (+x), 4: left (-x)
// 2: top (-y),   5: bottom (+y)
const faces = [
	makeFace(1, [v4, v5, v6, v7]), // front (+z)
	makeFace(6, [v1, v0, v3, v2]), // back (-z)
	makeFace(3, [v5, v1, v2, v6]), // right (+x)
	makeFace(4, [v0, v4, v7, v3]), // left (-x)
	makeFace(2, [v0, v1, v5, v4]), // top (-y)
	makeFace(5, [v7, v6, v2, v3]), // bottom (+y)
]

const faceRotations: Record<number, { x: number; y: number; z: number }> = {}
for (const face of faces) {
	const [nx, ny, nz] = face.normal
	const rotY = Math.atan2(nx, nz) * (180 / Math.PI)
	const rotX = Math.asin(ny) * (180 / Math.PI)
	faceRotations[face.value as number] = { x: rotX, y: -rotY, z: 0 }
}

export const d6Geometry: DieGeometry = {
	name: 'D6',
	sides: 6,
	vertices,
	faces,
	faceRotations,
	visualScale: 1.0,
}

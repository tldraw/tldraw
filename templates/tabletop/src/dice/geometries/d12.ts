import { DieGeometry, computeFaceRotation, makeFace } from './types'

/**
 * D12 — Regular dodecahedron.
 * 20 vertices, 12 pentagonal faces.
 */

const PHI = (1 + Math.sqrt(5)) / 2
const INV_PHI = 1 / PHI

// Dodecahedron vertices (unit circumradius = sqrt(3))
// Three groups:
// 1. (±1, ±1, ±1) — cube vertices
// 2. (0, ±φ, ±1/φ) — rectangles in YZ plane
// 3. (±1/φ, 0, ±φ) — rectangles in XZ plane
// 4. (±φ, ±1/φ, 0) — rectangles in XY plane
const rawVerts: [number, number, number][] = [
	// Cube vertices
	[1, 1, 1],
	[1, 1, -1],
	[1, -1, 1],
	[1, -1, -1],
	[-1, 1, 1],
	[-1, 1, -1],
	[-1, -1, 1],
	[-1, -1, -1],
	// YZ rectangles
	[0, PHI, INV_PHI],
	[0, PHI, -INV_PHI],
	[0, -PHI, INV_PHI],
	[0, -PHI, -INV_PHI],
	// XZ rectangles
	[INV_PHI, 0, PHI],
	[INV_PHI, 0, -PHI],
	[-INV_PHI, 0, PHI],
	[-INV_PHI, 0, -PHI],
	// XY rectangles
	[PHI, INV_PHI, 0],
	[PHI, -INV_PHI, 0],
	[-PHI, INV_PHI, 0],
	[-PHI, -INV_PHI, 0],
]

// Normalize to unit circumradius
const circumR = Math.sqrt(3)
const vertices: [number, number, number][] = rawVerts.map(
	([x, y, z]) => [x / circumR, y / circumR, z / circumR] as [number, number, number]
)

// Face definitions by vertex indices (CCW when viewed from outside)
const faceVertexIndices: number[][] = [
	[0, 8, 4, 14, 12],
	[0, 12, 2, 17, 16],
	[0, 16, 1, 9, 8],
	[1, 16, 17, 3, 13],
	[1, 13, 15, 5, 9],
	[2, 12, 14, 6, 10],
	[2, 10, 11, 3, 17],
	[3, 11, 7, 15, 13],
	[4, 8, 9, 5, 18],
	[4, 18, 19, 6, 14],
	[5, 15, 7, 19, 18],
	[6, 19, 7, 11, 10],
]

// Standard D12: opposite faces sum to 13
const faceValues = [1, 12, 2, 11, 3, 10, 4, 9, 5, 8, 6, 7]

const faces = faceVertexIndices.map((indices, i) =>
	makeFace(
		faceValues[i],
		indices.map((idx) => vertices[idx])
	)
)

// Compute face rotations from normals
const faceRotations: Record<number, { x: number; y: number; z: number }> = {}
for (let i = 0; i < faces.length; i++) {
	faceRotations[faceValues[i]] = computeFaceRotation(faces[i].normal)
}

export const d12Geometry: DieGeometry = {
	name: 'D12',
	sides: 12,
	vertices,
	faces,
	faceRotations,
	visualScale: 1.05,
}

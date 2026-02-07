import { DieGeometry, makeFace } from './types'

/**
 * D20 — Regular icosahedron.
 * 12 vertices, 20 triangular faces.
 */

const PHI = (1 + Math.sqrt(5)) / 2

// Icosahedron vertices: three mutually perpendicular golden rectangles
const rawVerts: [number, number, number][] = [
	[0, 1, PHI],
	[0, 1, -PHI],
	[0, -1, PHI],
	[0, -1, -PHI],
	[1, PHI, 0],
	[1, -PHI, 0],
	[-1, PHI, 0],
	[-1, -PHI, 0],
	[PHI, 0, 1],
	[PHI, 0, -1],
	[-PHI, 0, 1],
	[-PHI, 0, -1],
]

// Normalize to unit circumradius
const circumR = Math.sqrt(1 + PHI * PHI)
const vertices: [number, number, number][] = rawVerts.map(
	([x, y, z]) => [x / circumR, y / circumR, z / circumR] as [number, number, number]
)

// Face definitions by vertex indices
const faceVertexIndices: number[][] = [
	[0, 2, 8],
	[0, 8, 4],
	[0, 4, 6],
	[0, 6, 10],
	[0, 10, 2],
	[3, 1, 9],
	[3, 9, 5],
	[3, 5, 7],
	[3, 7, 11],
	[3, 11, 1],
	[2, 5, 8],
	[8, 9, 4],
	[4, 1, 6],
	[6, 11, 10],
	[10, 7, 2],
	[5, 2, 7],
	[9, 8, 5],
	[1, 4, 9],
	[11, 6, 1],
	[7, 10, 11],
]

// Standard D20: opposite faces sum to 21
const faceValues = [1, 2, 3, 4, 5, 20, 19, 18, 17, 16, 6, 7, 8, 9, 10, 15, 14, 13, 12, 11]

const faces = faceVertexIndices.map((indices, i) =>
	makeFace(
		faceValues[i],
		indices.map((idx) => vertices[idx])
	)
)

// Compute face rotations from normals
const faceRotations: Record<number, { x: number; y: number; z: number }> = {}
for (let i = 0; i < faces.length; i++) {
	const [nx, ny, nz] = faces[i].normal
	const rotY = Math.atan2(nx, nz) * (180 / Math.PI)
	const rotX = Math.asin(Math.max(-1, Math.min(1, ny))) * (180 / Math.PI)
	faceRotations[faceValues[i]] = { x: rotX, y: -rotY, z: 0 }
}

export const d20Geometry: DieGeometry = {
	name: 'D20',
	sides: 20,
	vertices,
	faces,
	faceRotations,
	visualScale: 1.0,
}

import { DieGeometry, computeFaceRotation, makeFace } from './types'

/**
 * D8 — Regular octahedron.
 * 6 vertices along axes, 8 triangular faces.
 */

const vertices: [number, number, number][] = [
	[0, -1, 0], // top
	[0, 1, 0], // bottom
	[1, 0, 0], // +X
	[-1, 0, 0], // -X
	[0, 0, 1], // +Z
	[0, 0, -1], // -Z
]

// Standard D8: opposite faces sum to 9
// Top 4 faces (connected to top vertex [0,-1,0])
// Bottom 4 faces (connected to bottom vertex [0,1,0])
const faceIndices: { value: number; verts: [number, number, number] }[] = [
	// Top faces
	{ value: 1, verts: [0, 4, 2] }, // top, +Z, +X
	{ value: 6, verts: [0, 2, 5] }, // top, +X, -Z
	{ value: 2, verts: [0, 5, 3] }, // top, -Z, -X
	{ value: 5, verts: [0, 3, 4] }, // top, -X, +Z
	// Bottom faces
	{ value: 8, verts: [1, 2, 4] }, // bottom, +X, +Z
	{ value: 3, verts: [1, 5, 2] }, // bottom, -Z, +X
	{ value: 7, verts: [1, 3, 5] }, // bottom, -X, -Z
	{ value: 4, verts: [1, 4, 3] }, // bottom, +Z, -X
]

const faces = faceIndices.map(({ value, verts: [a, b, c] }) =>
	makeFace(value, [vertices[a], vertices[b], vertices[c]])
)

const faceRotations: Record<number, { x: number; y: number; z: number }> = {}
for (const face of faces) {
	faceRotations[face.value as number] = computeFaceRotation(face.normal)
}

export const d8Geometry: DieGeometry = {
	name: 'D8',
	sides: 8,
	vertices,
	faces,
	faceRotations,
	visualScale: 1.15,
}

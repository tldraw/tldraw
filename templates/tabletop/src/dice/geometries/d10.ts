import { DieGeometry, computeFaceRotation, makeFace } from './types'

/**
 * D10 — Pentagonal trapezohedron.
 * 10 kite-shaped faces. Two rings of 5 vertices + top and bottom poles.
 *
 * For planar kite faces, the pole height p and ring offset d must satisfy:
 *   p/d = 5 + 2√5  (≈ 9.4721)
 *
 * This is derived from the planarity constraint (scalar triple product = 0)
 * of each kite's four vertices: pole, upper[i], lower[j], upper[i+1].
 */

const TAU = Math.PI * 2

// Planar kite constraint: p/d = 5 + 2√5
const POLE_HEIGHT = 1.0
const RING_OFFSET = POLE_HEIGHT / (5 + 2 * Math.sqrt(5))
const RING_RADIUS = 0.8

const TOP: [number, number, number] = [0, -POLE_HEIGHT, 0]
const BOT: [number, number, number] = [0, POLE_HEIGHT, 0]

function makeRingVert(i: number, offset: number, ySign: number): [number, number, number] {
	const angle = (TAU * i) / 5 + offset
	return [RING_RADIUS * Math.cos(angle), ySign * RING_OFFSET, RING_RADIUS * Math.sin(angle)]
}

const upperRing: [number, number, number][] = Array.from({ length: 5 }, (_, i) =>
	makeRingVert(i, 0, -1)
)

const lowerRing: [number, number, number][] = Array.from({ length: 5 }, (_, i) =>
	makeRingVert(i, TAU / 10, 1)
)

const vertices: [number, number, number][] = [TOP, BOT, ...upperRing, ...lowerRing]

// Each kite face: pole - upperRing[i] - lowerRing[j] - upperRing[(i+1)%5] (or reversed)
// Top kites connect to TOP pole; bottom kites connect to BOT pole
// Standard D10: 0-9
const faceIndices: { value: number; verts: [number, number, number][] }[] = []

for (let i = 0; i < 5; i++) {
	const nextI = (i + 1) % 5
	// Top kite: TOP, upperRing[nextI], lowerRing[i], upperRing[i]
	faceIndices.push({
		value: i * 2,
		verts: [TOP, upperRing[nextI], lowerRing[i], upperRing[i]],
	})
	// Bottom kite: BOT, lowerRing[i], upperRing[nextI], lowerRing[nextI]
	faceIndices.push({
		value: i * 2 + 1,
		verts: [BOT, lowerRing[i], upperRing[nextI], lowerRing[nextI]],
	})
}

const faces = faceIndices.map(({ value, verts }) => makeFace(value, verts))

const faceRotations: Record<number, { x: number; y: number; z: number }> = {}
for (let i = 0; i < 10; i++) {
	faceRotations[i] = computeFaceRotation(faces[i].normal)
}

export const d10Geometry: DieGeometry = {
	name: 'D10',
	sides: 10,
	vertices,
	faces,
	faceRotations,
	visualScale: 1.1,
}

// D% (percentile) variant — same geometry, labels 00-90
const d100Faces = faceIndices.map(({ value, verts }) => {
	const label = String(value * 10).padStart(2, '0')
	return makeFace(label, verts)
})

const d100FaceRotations: Record<string, { x: number; y: number; z: number }> = {}
for (let i = 0; i < 10; i++) {
	const label = String(i * 10).padStart(2, '0')
	d100FaceRotations[label] = computeFaceRotation(d100Faces[i].normal)
}

export const d100Geometry: DieGeometry = {
	name: 'D%',
	sides: 100,
	vertices,
	faces: d100Faces,
	faceRotations: d100FaceRotations,
	visualScale: 1.1,
}

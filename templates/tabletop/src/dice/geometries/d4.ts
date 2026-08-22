import { DieGeometry, FaceDefinition, makeFace, normalize } from './types'

/**
 * D4 — Regular tetrahedron.
 * Inscribed in the unit sphere with apex at top (y=-1), base at y=1/3.
 *
 * Traditional D4: each face shows three numbers (one per vertex).
 * The rolled value is read from the number at the TOP vertex.
 * Vertex values: A=1, B=2, C=3, D=4.
 */

// Regular tetrahedron inscribed in unit sphere (circumradius = 1)
const s6_3 = Math.sqrt(6) / 3
const s2_3 = Math.sqrt(2) / 3
const s2x2_3 = (2 * Math.sqrt(2)) / 3

const vA: [number, number, number] = [0, 1 / 3, s2x2_3]
const vB: [number, number, number] = [s6_3, 1 / 3, -s2_3]
const vC: [number, number, number] = [-s6_3, 1 / 3, -s2_3]
const vD: [number, number, number] = [0, -1, 0]

// For each face, compute localUp pointing away from the opposite vertex (toward the base).
function localDownFromOpposite(
	faceVerts: [number, number, number][],
	opposite: [number, number, number]
): [number, number, number] {
	const c = [
		(faceVerts[0][0] + faceVerts[1][0] + faceVerts[2][0]) / 3,
		(faceVerts[0][1] + faceVerts[1][1] + faceVerts[2][1]) / 3,
		(faceVerts[0][2] + faceVerts[1][2] + faceVerts[2][2]) / 3,
	] as [number, number, number]
	const normal = normalize(c)
	const dot =
		(opposite[0] - c[0]) * normal[0] +
		(opposite[1] - c[1]) * normal[1] +
		(opposite[2] - c[2]) * normal[2]
	const projected: [number, number, number] = [
		opposite[0] - dot * normal[0],
		opposite[1] - dot * normal[1],
		opposite[2] - dot * normal[2],
	]
	const dir: [number, number, number] = [
		c[0] - projected[0],
		c[1] - projected[1],
		c[2] - projected[2],
	]
	return normalize(dir)
}

/** Add vertex labels to a d4 face. Each label is positioned near its vertex. */
function addVertexLabels(face: FaceDefinition, values: (number | string)[]): FaceDefinition {
	const vertexLabels = face.polygon.map(([px, py], i) => {
		const angle = (Math.atan2(py, px) * 180) / Math.PI + 90
		return {
			value: values[i],
			x: px * 0.6,
			y: py * 0.6,
			rotation: angle,
		}
	})
	return { ...face, vertexLabels }
}

// Face layout: each face shows the number of the OPPOSITE vertex
// Face ABD (opposite C) = 3, Face ACD (opposite B) = 2, Face BCD (opposite A) = 1, Face ABC (opposite D) = 4
// Vertex labels on each face: A=1, B=2, C=3, D=4
const faces = [
	addVertexLabels(makeFace(3, [vA, vB, vD], localDownFromOpposite([vA, vB, vD], vC)), [1, 2, 4]),
	addVertexLabels(makeFace(2, [vA, vC, vD], localDownFromOpposite([vA, vC, vD], vB)), [1, 3, 4]),
	addVertexLabels(makeFace(1, [vB, vC, vD], localDownFromOpposite([vB, vC, vD], vA)), [2, 3, 4]),
	addVertexLabels(makeFace(4, [vA, vB, vC], localDownFromOpposite([vA, vB, vC], vD)), [1, 2, 3]),
]

export const d4Geometry: DieGeometry = {
	name: 'D4',
	sides: 4,
	vertices: [vA, vB, vC, vD],
	faces,
	// D4 rotations orient the die so the result VERTEX is at the top.
	// Values 1-3 (base vertices): tilt forward with y-rotation to bring each vertex to top.
	// Value 4 (apex vertex D): already at top, slight backward tilt for depth.
	faceRotations: {
		1: { x: 35, y: 0, z: 0 },
		2: { x: 35, y: -120, z: 0 },
		3: { x: 35, y: 120, z: 0 },
		4: { x: -15, y: 0, z: 0 },
	},
	visualScale: 1.3,
}

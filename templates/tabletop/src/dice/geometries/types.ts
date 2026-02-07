export interface FaceDefinition {
	/** Label: 1-20, or '00'-'90' for D% */
	value: number | string
	/** Unit outward normal (for lighting) */
	normal: [number, number, number]
	/** Face center in model space */
	center: [number, number, number]
	/** 2D polygon vertices in face-local coords (centered at origin) */
	polygon: [number, number][]
	/** Bounding box of polygon */
	polygonSize: { w: number; h: number }
	/** CSS matrix3d transform string for a given scale */
	getTransform(scale: number): string
	/** Labels at each vertex of the face (d4 style: three numbers per face) */
	vertexLabels?: { value: number | string; x: number; y: number; rotation: number }[]
}

export interface DieGeometry {
	name: string
	sides: number
	/** All vertices (unit circumradius), for outline projection */
	vertices: [number, number, number][]
	faces: FaceDefinition[]
	/** Rotation (degrees) to show each face value toward the viewer */
	faceRotations: Record<number | string, { x: number; y: number; z: number }>
	/** Compensate for different apparent sizes (~1.0-1.3) */
	visualScale: number
}

/** Build a matrix3d transform string from a face's center, normal, and localUp vector. */
export function buildFaceTransform(
	center: [number, number, number],
	normal: [number, number, number],
	localUp: [number, number, number],
	scale: number
): string {
	// Z axis = normal
	const zAxis = normal
	// X axis = localUp × normal (cross product)
	let xAxis: [number, number, number] = [
		localUp[1] * zAxis[2] - localUp[2] * zAxis[1],
		localUp[2] * zAxis[0] - localUp[0] * zAxis[2],
		localUp[0] * zAxis[1] - localUp[1] * zAxis[0],
	]
	// Normalize
	let len = Math.sqrt(xAxis[0] ** 2 + xAxis[1] ** 2 + xAxis[2] ** 2)
	if (len < 1e-8) {
		// Fallback if normal is parallel to localUp
		const fallback: [number, number, number] = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
		xAxis = [
			fallback[1] * zAxis[2] - fallback[2] * zAxis[1],
			fallback[2] * zAxis[0] - fallback[0] * zAxis[2],
			fallback[0] * zAxis[1] - fallback[1] * zAxis[0],
		]
		len = Math.sqrt(xAxis[0] ** 2 + xAxis[1] ** 2 + xAxis[2] ** 2)
	}
	xAxis = [xAxis[0] / len, xAxis[1] / len, xAxis[2] / len]
	// Y axis = normal × xAxis
	const yAxis: [number, number, number] = [
		zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1],
		zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2],
		zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0],
	]

	return `matrix3d(${xAxis[0]},${xAxis[1]},${xAxis[2]},0,${yAxis[0]},${yAxis[1]},${yAxis[2]},0,${zAxis[0]},${zAxis[1]},${zAxis[2]},0,${center[0] * scale},${center[1] * scale},${center[2] * scale},1)`
}

/** Normalize a 3D vector in place and return it. */
export function normalize(v: [number, number, number]): [number, number, number] {
	const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
	return [v[0] / len, v[1] / len, v[2] / len]
}

/** Compute the centroid of vertices. */
export function centroid(verts: [number, number, number][]): [number, number, number] {
	const n = verts.length
	let x = 0,
		y = 0,
		z = 0
	for (const v of verts) {
		x += v[0]
		y += v[1]
		z += v[2]
	}
	return [x / n, y / n, z / n]
}

/** Project 3D face vertices into 2D face-local coordinates given xAxis and yAxis. */
export function projectToFaceLocal(
	verts3d: [number, number, number][],
	faceCenter: [number, number, number],
	xAxis: [number, number, number],
	yAxis: [number, number, number]
): [number, number][] {
	return verts3d.map((v) => {
		const dx = v[0] - faceCenter[0]
		const dy = v[1] - faceCenter[1]
		const dz = v[2] - faceCenter[2]
		return [
			dx * xAxis[0] + dy * xAxis[1] + dz * xAxis[2],
			dx * yAxis[0] + dy * yAxis[1] + dz * yAxis[2],
		] as [number, number]
	})
}

/** Compute polygon bounding box. */
export function polygonBounds(polygon: [number, number][]): { w: number; h: number } {
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity
	for (const [x, y] of polygon) {
		if (x < minX) minX = x
		if (x > maxX) maxX = x
		if (y < minY) minY = y
		if (y > maxY) maxY = y
	}
	return { w: maxX - minX, h: maxY - minY }
}

/** Helper to create a FaceDefinition from 3D vertex data. */
export function makeFace(
	value: number | string,
	vertices3d: [number, number, number][],
	localUp: [number, number, number] = [0, 1, 0]
): FaceDefinition {
	const center3d = centroid(vertices3d)
	// Compute face normal from cross product of edges (correct for all polyhedra,
	// not just centrosymmetric ones like Platonic solids).
	const e1: [number, number, number] = [
		vertices3d[1][0] - vertices3d[0][0],
		vertices3d[1][1] - vertices3d[0][1],
		vertices3d[1][2] - vertices3d[0][2],
	]
	const e2: [number, number, number] = [
		vertices3d[2][0] - vertices3d[0][0],
		vertices3d[2][1] - vertices3d[0][1],
		vertices3d[2][2] - vertices3d[0][2],
	]
	let normal3d = normalize([
		e1[1] * e2[2] - e1[2] * e2[1],
		e1[2] * e2[0] - e1[0] * e2[2],
		e1[0] * e2[1] - e1[1] * e2[0],
	])
	// Ensure normal points outward (same side as centroid from origin)
	const outwardDot =
		normal3d[0] * center3d[0] + normal3d[1] * center3d[1] + normal3d[2] * center3d[2]
	if (outwardDot < 0) {
		normal3d = [-normal3d[0], -normal3d[1], -normal3d[2]]
	}
	// Build axes
	const zAxis = normal3d
	let xAxis: [number, number, number] = [
		localUp[1] * zAxis[2] - localUp[2] * zAxis[1],
		localUp[2] * zAxis[0] - localUp[0] * zAxis[2],
		localUp[0] * zAxis[1] - localUp[1] * zAxis[0],
	]
	let len = Math.sqrt(xAxis[0] ** 2 + xAxis[1] ** 2 + xAxis[2] ** 2)
	if (len < 1e-8) {
		const fallback: [number, number, number] = Math.abs(normal3d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
		xAxis = [
			fallback[1] * zAxis[2] - fallback[2] * zAxis[1],
			fallback[2] * zAxis[0] - fallback[0] * zAxis[2],
			fallback[0] * zAxis[1] - fallback[1] * zAxis[0],
		]
		len = Math.sqrt(xAxis[0] ** 2 + xAxis[1] ** 2 + xAxis[2] ** 2)
	}
	xAxis = [xAxis[0] / len, xAxis[1] / len, xAxis[2] / len]
	const yAxis: [number, number, number] = [
		zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1],
		zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2],
		zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0],
	]

	const polygon = projectToFaceLocal(vertices3d, center3d, xAxis, yAxis)
	const polygonSize = polygonBounds(polygon)

	return {
		value,
		normal: normal3d,
		center: center3d,
		polygon,
		polygonSize,
		getTransform: (scale: number) => buildFaceTransform(center3d, normal3d, localUp, scale),
	}
}

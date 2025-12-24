/**
 * Geometry utilities for WebGL indicator rendering.
 * Handles triangulation of strokes and extraction of shape outlines.
 */

import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Group2d } from '../../primitives/geometry/Group2d'
import { Mat, MatModel } from '../../primitives/Mat'
import { Vec, VecLike } from '../../primitives/Vec'

/**
 * Triangulate a polyline into a thick stroke.
 * Converts line segments into quads (2 triangles each) for WebGL rendering.
 *
 * Each line segment becomes a rectangle:
 *   p1 -------- p2
 *   |           |
 *   p1' ------- p2'
 *
 * Which is rendered as 2 triangles: (p1, p1', p2) and (p2, p1', p2')
 *
 * Output format: each vertex is (centerX, centerY, offsetX, offsetY)
 * where offset is the normalized perpendicular direction.
 * The shader computes: finalPosition = center + offset * strokeWidth
 */
export function triangulateStroke(
	vertices: VecLike[],
	isClosed: boolean,
	transform?: MatModel
): Float32Array {
	if (vertices.length < 2) {
		return new Float32Array(0)
	}

	// Each segment needs 6 vertices (2 triangles * 3 vertices)
	// Each vertex is 4 floats (centerX, centerY, offsetX, offsetY)
	const segmentCount = isClosed ? vertices.length : vertices.length - 1
	const floatsPerSegment = 24 // 6 vertices * 4 floats
	const result = new Float32Array(segmentCount * floatsPerSegment)

	let offset = 0

	for (let i = 0; i < segmentCount; i++) {
		const p1 = vertices[i]
		const p2 = vertices[(i + 1) % vertices.length]

		// Apply transform if provided
		let x1 = p1.x
		let y1 = p1.y
		let x2 = p2.x
		let y2 = p2.y

		if (transform) {
			const tp1 = Mat.applyToPoint(transform, p1)
			const tp2 = Mat.applyToPoint(transform, p2)
			x1 = tp1.x
			y1 = tp1.y
			x2 = tp2.x
			y2 = tp2.y
		}

		// Calculate perpendicular direction
		const dx = x2 - x1
		const dy = y2 - y1
		const len = Math.sqrt(dx * dx + dy * dy)

		if (len < 0.001) continue // Skip zero-length segments

		// Normalized perpendicular (unit vector)
		const nx = -dy / len
		const ny = dx / len

		// First triangle: (p1+n, p1-n, p2+n)
		// Vertex 1: p1 with +offset
		result[offset++] = x1
		result[offset++] = y1
		result[offset++] = nx
		result[offset++] = ny
		// Vertex 2: p1 with -offset
		result[offset++] = x1
		result[offset++] = y1
		result[offset++] = -nx
		result[offset++] = -ny
		// Vertex 3: p2 with +offset
		result[offset++] = x2
		result[offset++] = y2
		result[offset++] = nx
		result[offset++] = ny

		// Second triangle: (p2+n, p1-n, p2-n)
		// Vertex 4: p2 with +offset
		result[offset++] = x2
		result[offset++] = y2
		result[offset++] = nx
		result[offset++] = ny
		// Vertex 5: p1 with -offset
		result[offset++] = x1
		result[offset++] = y1
		result[offset++] = -nx
		result[offset++] = -ny
		// Vertex 6: p2 with -offset
		result[offset++] = x2
		result[offset++] = y2
		result[offset++] = -nx
		result[offset++] = -ny
	}

	return result.slice(0, offset)
}

/**
 * Extract outline vertices from a Geometry2d, handling Group2d recursively.
 * Returns an array of vertex arrays (one per separate outline path).
 */
export function extractOutlineVertices(
	geometry: Geometry2d
): Array<{ vertices: Vec[]; isClosed: boolean }> {
	const results: Array<{ vertices: Vec[]; isClosed: boolean }> = []

	if (geometry instanceof Group2d) {
		// Handle composite geometry (e.g., arrows with labels)
		for (const child of geometry.children) {
			// Skip labels and ignored geometry
			if (child.isLabel || child.ignore) continue
			results.push(...extractOutlineVertices(child))
		}
	} else {
		// Simple geometry - just get its vertices
		const vertices = geometry.vertices
		if (vertices.length >= 2) {
			results.push({
				vertices,
				isClosed: geometry.isClosed,
			})
		}
	}

	return results
}

/**
 * Triangulate all outlines from a geometry into a single vertex buffer.
 * Output format: each vertex is (centerX, centerY, offsetX, offsetY).
 * Stroke width is applied in the shader, not here.
 */
export function triangulateGeometry(geometry: Geometry2d, transform?: MatModel): Float32Array {
	const outlines = extractOutlineVertices(geometry)

	// Calculate total size needed
	let totalFloats = 0
	for (const { vertices, isClosed } of outlines) {
		const segmentCount = isClosed ? vertices.length : vertices.length - 1
		totalFloats += segmentCount * 24 // 6 vertices * 4 floats per segment
	}

	if (totalFloats === 0) {
		return new Float32Array(0)
	}

	const result = new Float32Array(totalFloats)
	let offset = 0

	for (const { vertices, isClosed } of outlines) {
		const triangulated = triangulateStroke(vertices, isClosed, transform)
		result.set(triangulated, offset)
		offset += triangulated.length
	}

	return result
}

/**
 * Calculate the bounding box of triangulated geometry.
 * Useful for culling calculations.
 */
export function getTriangulatedBounds(vertices: Float32Array): {
	minX: number
	minY: number
	maxX: number
	maxY: number
} {
	if (vertices.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
	}

	let minX = vertices[0]
	let maxX = vertices[0]
	let minY = vertices[1]
	let maxY = vertices[1]

	for (let i = 2; i < vertices.length; i += 2) {
		const x = vertices[i]
		const y = vertices[i + 1]
		if (x < minX) minX = x
		if (x > maxX) maxX = x
		if (y < minY) minY = y
		if (y > maxY) maxY = y
	}

	return { minX, minY, maxX, maxY }
}

import { Geometry2d, Mat } from '@tldraw/editor'
import earcut from 'earcut'
// @ts-expect-error
import extrudePolyline from 'extrude-polyline'

const stroke = extrudePolyline({
	thickness: 10, // this is in page space
	cap: 'square',
	join: 'bevel',
	miterLimit: 1,
})

export function triangulateGeometry(geometry: Geometry2d) {
	const vertices = geometry.vertices
	if (!geometry.isClosed || !geometry.isFilled) {
		const points = vertices.map((v) => [v.x, v.y])
		if (geometry.isClosed) points.push([vertices[0].x, vertices[0].y])
		const triangles = stroke.build(points)
		const arr = new Float32Array(triangles.cells.length * 3 * 2)
		let j = 0
		for (const cell of triangles.cells) {
			arr[j++] = triangles.positions[cell[0]][0]
			arr[j++] = triangles.positions[cell[0]][1]

			arr[j++] = triangles.positions[cell[1]][0]
			arr[j++] = triangles.positions[cell[1]][1]

			arr[j++] = triangles.positions[cell[2]][0]
			arr[j++] = triangles.positions[cell[2]][1]
		}

		return new Float32Array(arr)
	} else {
		const points = vertices.map((v) => [v.x, v.y]).flat()
		if (geometry.isClosed) points.push(vertices[0].x, vertices[0].y)
		const triangles = earcut(points)
		const arr = new Float32Array(triangles.length * 2)
		let j = 0
		for (const i of triangles) {
			arr[j * 2] = points[i * 2]
			arr[j * 2 + 1] = points[i * 2 + 1]
			j++
		}

		return arr
	}
}

export function applyTransformToGeometry(geometry: Float32Array, transform: Mat) {
	const transformedGeometry = new Float32Array(geometry.length)
	for (let i = 0; i < transformedGeometry.length; i += 2) {
		;[transformedGeometry[i], transformedGeometry[i + 1]] = Mat.applyToXY(
			transform,
			geometry[i],
			geometry[i + 1]
		)
	}
	return transformedGeometry
}

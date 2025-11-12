import { VecModel } from '../misc/geometry-types'

export function decompressDrawPoints(
	compressed: number[],
	hasPressure: boolean = false,
	isScaled: boolean = false,
	scale: number = 1
): VecModel[] {
	if (compressed.length === 0) return []

	const points: VecModel[] = []
	let x = 0
	let y = 0
	let z = 0.5

	const stride = hasPressure ? 3 : 2

	for (let i = 0; i < compressed.length; i += stride) {
		const deltaX = compressed[i]
		const deltaY = compressed[i + 1]
		const deltaZ = hasPressure ? compressed[i + 2] : 0

		x += deltaX
		y += deltaY
		z += deltaZ

		let finalX = x
		let finalY = y
		let finalZ = z

		if (isScaled && scale !== 1) {
			finalX = x / scale
			finalY = y / scale
		}

		points.push({
			x: finalX,
			y: finalY,
			z: hasPressure ? finalZ : undefined,
		})
	}

	return points
}

export function compressDrawPoints(
	points: VecModel[],
	hasPressure: boolean = false,
	isScaled: boolean = false
): number[] {
	if (points.length === 0) return []

	const compressed: number[] = []
	let prevX = 0
	let prevY = 0
	let prevZ = 0.5

	for (const point of points) {
		let x = point.x
		let y = point.y
		let z = point.z ?? 0.5

		if (isScaled) {
			x = Math.round(x)
			y = Math.round(y)
			z = Math.round(z * 100) / 100
		}

		const deltaX = x - prevX
		const deltaY = y - prevY
		const deltaZ = hasPressure ? z - prevZ : 0

		compressed.push(deltaX, deltaY)
		if (hasPressure) {
			compressed.push(deltaZ)
		}

		prevX = x
		prevY = y
		prevZ = z
	}

	return compressed
}

export function shouldStorePressure(points: VecModel[]): boolean {
	if (points.length === 0) return false

	for (const point of points) {
		const z = point.z ?? 0.5
		if (z !== 0 && z !== 0.5) {
			return true
		}
	}
	return false
}

export function shouldScalePoints(zoomLevel: number): boolean {
	return zoomLevel >= 1
}

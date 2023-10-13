import { Vec2d, VecLike, toDomPrecision } from '@tldraw/editor'

function precise(A: VecLike) {
	return `${toDomPrecision(A.x)},${toDomPrecision(A.y)} `
}

function rng(seed = '') {
	let x = 0
	let y = 0
	let z = 0
	let w = 0

	function next() {
		const t = x ^ (x << 11)
		x = y
		y = z
		z = w
		w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
		return (w / 0x100000000) * 2
	}

	for (let k = 0; k < seed.length + 64; k++) {
		x ^= seed.charCodeAt(k) | 0
		next()
	}

	return next
}

/** @public */
export function getRoundedInkyPolygonPath(points: VecLike[]) {
	let polylineA = `M`

	const len = points.length

	let p0: VecLike
	let p1: VecLike
	let p2: VecLike

	for (let i = 0, n = len; i < n; i += 3) {
		p0 = points[i]
		p1 = points[i + 1]
		p2 = points[i + 2]

		polylineA += `${precise(p0)}L${precise(p1)}Q${precise(p2)}`
	}

	polylineA += `${precise(points[0])}`

	return polylineA
}

/** @public */
export function getRoundedPolygonPoints(
	id: string,
	outline: VecLike[],
	offset: number,
	roundness: number,
	passes: number
) {
	const results: VecLike[] = []

	const random = rng(id)
	let p0 = outline[0]
	let p1: VecLike

	const len = outline.length

	for (let i = 0, n = len * passes; i < n; i++) {
		p1 = Vec2d.AddXY(outline[(i + 1) % len], random() * offset, random() * offset)

		const delta = Vec2d.Sub(p1, p0)
		const distance = Vec2d.Len(delta)
		const vector = Vec2d.Div(delta, distance).mul(Math.min(distance / 4, roundness))
		results.push(Vec2d.Add(p0, vector), Vec2d.Add(p1, vector.neg()), p1)

		p0 = p1
	}

	return results
}

/** @public */
export function getDrawLinePathData(id: string, outline: VecLike[], strokeWidth: number) {
	let innerPathData = `M ${precise(outline[0])}L`
	let outerPathData2 = `M ${precise(outline[0])}L`

	const offset = strokeWidth / 3
	const roundness = strokeWidth * 2

	const random = rng(id)
	let p0 = outline[0]
	let p1: VecLike

	let s0 = outline[0]
	let s1: VecLike

	const len = outline.length

	for (let i = 0, n = len - 1; i < n; i++) {
		p1 = outline[i + 1]
		s1 = Vec2d.AddXY(outline[i + 1], random() * offset, random() * offset)

		const delta = Vec2d.Sub(p1, p0)
		const distance = Vec2d.Len(delta)
		const vector = Vec2d.Div(delta, distance).mul(Math.min(distance / 4, roundness))

		const q0 = Vec2d.Add(p0, vector)
		const q1 = Vec2d.Add(p1, vector.neg())

		const sDelta = Vec2d.Sub(s1, s0)
		const sDistance = Vec2d.Len(sDelta)
		const sVector = Vec2d.Div(sDelta, sDistance).mul(Math.min(sDistance / 4, roundness))

		const sq0 = Vec2d.Add(s0, sVector)
		const sq1 = Vec2d.Add(s1, sVector.neg())

		if (i === n - 1) {
			innerPathData += `${precise(q0)}L ${precise(p1)}`
			outerPathData2 += `${precise(sq0)}L ${precise(s1)}`
		} else {
			innerPathData += `${precise(q0)}L ${precise(q1)}Q ${precise(p1)}`
			outerPathData2 += `${precise(sq0)}L ${precise(sq1)}Q ${precise(s1)}`

			p0 = p1
			s0 = s1
		}
	}

	return [innerPathData, innerPathData + outerPathData2]
}

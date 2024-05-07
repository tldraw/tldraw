import { Vec, VecLike, precise, rng } from '@tldraw/editor'

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
		p1 = Vec.AddXY(outline[(i + 1) % len], random() * offset, random() * offset)

		const delta = Vec.Sub(p1, p0)
		const distance = Vec.Len(delta)
		const vector = Vec.Div(delta, distance).mul(Math.min(distance / 4, roundness))
		results.push(Vec.Add(p0, vector), Vec.Add(p1, vector.neg()), p1)

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
		s1 = Vec.AddXY(outline[i + 1], random() * offset, random() * offset)

		const delta = Vec.Sub(p1, p0)
		const distance = Vec.Len(delta)
		const vector = Vec.Div(delta, distance).mul(Math.min(distance / 4, roundness))

		const q0 = Vec.Add(p0, vector)
		const q1 = Vec.Add(p1, vector.neg())

		const sDelta = Vec.Sub(s1, s0)
		const sDistance = Vec.Len(sDelta)
		const sVector = Vec.Div(sDelta, sDistance).mul(Math.min(sDistance / 4, roundness))

		const sq0 = Vec.Add(s0, sVector)
		const sq1 = Vec.Add(s1, sVector.neg())

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

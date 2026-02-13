import { Vec, VecLike, VecModel } from 'tldraw'

export const getOuterTangentPoints = (
	c0: VecLike,
	r0: number,
	c1: VecLike,
	r1: number,
	side?: 'edgeA' | 'edgeB'
): VecModel[] => {
	const offsetAngle = Vec.Angle(c0, c1)
	const d = Vec.Dist(c0, c1)

	const theta = Math.acos((r0 - r1) / d)

	const angle0 = offsetAngle + theta
	const angle1 = offsetAngle - theta

	const t00 = Vec.Add(c0, Vec.FromAngle(angle0).mul(r0))
	const t01 = Vec.Add(c1, Vec.FromAngle(angle0).mul(r1))

	const t10 = Vec.Add(c0, Vec.FromAngle(angle1).mul(r0))
	const t11 = Vec.Add(c1, Vec.FromAngle(angle1).mul(r1))

	if (side) {
		if (side === 'edgeA') {
			return [
				{ x: t00.x, y: t00.y },
				{ x: t01.x, y: t01.y },
			]
		}

		return [
			{ x: t10.x, y: t10.y },
			{ x: t11.x, y: t11.y },
		]
	}

	return [
		{ x: t00.x, y: t00.y },
		{ x: t01.x, y: t01.y },
		{ x: t10.x, y: t10.y },
		{ x: t11.x, y: t11.y },
	]
}

export const getGlobEndPoint = (c: VecModel, d: VecModel, r: number, side: number = 0) => {
	const angle = Vec.Angle(c, d)

	const displacement = Vec.Sub(c, d)
	const dist = Vec.Len(displacement)

	// we are inside the circle no solutions, so return null
	if (dist <= r) {
		return
	}

	const theta = Math.acos(r / dist)

	const sideTheta = side === 0 ? theta : -theta
	const p = Vec.Add(c, Vec.FromAngle(angle + sideTheta).mul(r))

	return p
}

export const getArcFlag = (c: VecModel, e0: VecModel, e1: VecModel) => {
	const d0 = Vec.Angle(c, e0)
	const d1 = Vec.Angle(c, e1)

	const diff = d1 - d0

	const theta = Math.atan2(Math.sin(diff), Math.cos(diff))

	return theta > 0 ? false : true
}

export const projectTensionPoint = (lineStart: VecModel, lineEnd: VecModel, handle: VecModel) => {
	const lineDir = Vec.Sub(lineEnd, lineStart)
	const lineLength = lineDir.len()

	const toHandle = Vec.Sub(handle, lineStart)
	const projection = Vec.Dpr(toHandle, Vec.Uni(lineDir))
	const clampedProjection = Math.max(0, Math.min(lineLength, projection))

	return clampedProjection / lineLength
}

export const circleCentresOverlap = (c0: VecModel, r0: number, c1: VecModel) => {
	const d = Vec.Dist(c0, c1)
	return d <= r0
}

export const getClosestPointOnCircle = (c: VecModel, r: number, p: VecModel) => {
	const pDirection = Vec.Sub(p, c).uni()

	return Vec.Add(c, Vec.Mul(pDirection, r + 1)).toJson()
}

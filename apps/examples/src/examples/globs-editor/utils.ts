import { Vec, VecLike, VecModel } from 'tldraw'

export const getOuterTangentPoints = (
	c0: VecLike,
	r0: number,
	c1: VecLike,
	r1: number
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

	return [
		{ x: t00.x, y: t00.y },
		{ x: t01.x, y: t01.y },
		{ x: t10.x, y: t10.y },
		{ x: t11.x, y: t11.y },
	]
}

export const getGlobEndPoint = (c: VecModel, d: VecModel, r: number, level: number = 0) => {
	const angle = Vec.Angle(c, d)

	const displacement = Vec.Sub(c, d)
	const dist = Vec.Len(displacement)
	const theta = Math.acos(r / dist)

	const sideTheta = level === 0 ? theta : -theta
	const p = Vec.Add(c, Vec.FromAngle(angle + sideTheta).mul(r))

	return p
}

import {
	centerOfCircleFromThreePoints,
	clamp,
	exhaustiveSwitchError,
	getPointOnCircle,
	getPolygonVertices,
	HALF_PI,
	PI,
	PI2,
	rng,
	TLDefaultDashStyle,
	TLDefaultSizeStyle,
	TLGeoShape,
	Vec,
	VecModel,
	WeakCache,
} from '@tldraw/editor'
import { STROKE_SIZES } from '../arrow/shared'
import { PathBuilder } from '../shared/PathBuilder'

const pathCache = new WeakCache<TLGeoShape, PathBuilder>()
export function getGeoShapePath(shape: TLGeoShape) {
	return pathCache.get(shape, _getGeoPath)
}

function _getGeoPath(shape: TLGeoShape) {
	const w = Math.max(1, shape.props.w)
	const h = Math.max(1, shape.props.h + shape.props.growY)
	const cx = w / 2
	const cy = h / 2
	const sw = STROKE_SIZES[shape.props.size] * shape.props.scale

	const isFilled = shape.props.fill !== 'none'

	switch (shape.props.geo) {
		case 'arrow-down': {
			const ox = w * 0.16
			const oy = Math.min(w, h) * 0.38
			return new PathBuilder()
				.moveTo(ox, 0, { geometry: { isFilled } })
				.lineTo(w - ox, 0)
				.lineTo(w - ox, h - oy)
				.lineTo(w, h - oy)
				.lineTo(w / 2, h)
				.lineTo(0, h - oy)
				.lineTo(ox, h - oy)
				.close()
		}
		case 'arrow-left': {
			const ox = Math.min(w, h) * 0.38
			const oy = h * 0.16
			return new PathBuilder()
				.moveTo(ox, 0, { geometry: { isFilled } })
				.lineTo(ox, oy)
				.lineTo(w, oy)
				.lineTo(w, h - oy)
				.lineTo(ox, h - oy)
				.lineTo(ox, h)
				.lineTo(0, h / 2)
				.close()
		}
		case 'arrow-right': {
			const ox = Math.min(w, h) * 0.38
			const oy = h * 0.16
			return new PathBuilder()
				.moveTo(0, oy, { geometry: { isFilled } })
				.lineTo(w - ox, oy)
				.lineTo(w - ox, 0)
				.lineTo(w, h / 2)
				.lineTo(w - ox, h)
				.lineTo(w - ox, h - oy)
				.lineTo(0, h - oy)
				.close()
		}
		case 'arrow-up': {
			const ox = w * 0.16
			const oy = Math.min(w, h) * 0.38
			return new PathBuilder()
				.moveTo(w / 2, 0, { geometry: { isFilled } })
				.lineTo(w, oy)
				.lineTo(w - ox, oy)
				.lineTo(w - ox, h)
				.lineTo(ox, h)
				.lineTo(ox, oy)
				.lineTo(0, oy)
				.close()
		}
		case 'check-box': {
			const size = Math.min(w, h) * 0.82
			const ox = (w - size) / 2
			const oy = (h - size) / 2

			return new PathBuilder()
				.moveTo(0, 0, { geometry: { isFilled } })
				.lineTo(w, 0)
				.lineTo(w, h)
				.lineTo(0, h)
				.close()
				.moveTo(clamp(ox + size * 0.25, 0, w), clamp(oy + size * 0.52, 0, h), {
					geometry: { isInternal: true, isFilled: false },
					offset: 0,
				})
				.lineTo(clamp(ox + size * 0.45, 0, w), clamp(oy + size * 0.82, 0, h))
				.lineTo(clamp(ox + size * 0.82, 0, w), clamp(oy + size * 0.22, 0, h), { offset: 0 })
		}
		case 'diamond':
			return new PathBuilder()
				.moveTo(cx, 0, { geometry: { isFilled } })
				.lineTo(w, cy)
				.lineTo(cx, h)
				.lineTo(0, cy)
				.close()
		case 'ellipse':
			return new PathBuilder()
				.moveTo(0, cy, { geometry: { isFilled } })
				.arcTo(cx, cy, false, true, 0, w, cy)
				.arcTo(cx, cy, false, true, 0, 0, cy)
				.close()
		case 'heart': {
			const o = w / 4
			const k = h / 4
			return new PathBuilder()
				.moveTo(cx, h, { geometry: { isFilled } })
				.cubicBezierTo(0, k * 1.2, o * 1.5, k * 3, 0, k * 2.5)
				.cubicBezierTo(cx, k * 0.9, 0, -k * 0.32, o * 1.85, -k * 0.32)
				.cubicBezierTo(w, k * 1.2, o * 2.15, -k * 0.32, w, -k * 0.32)
				.cubicBezierTo(cx, h, w, k * 2.5, o * 2.5, k * 3)
				.close()
		}
		case 'hexagon':
			return PathBuilder.lineThroughPoints(getPolygonVertices(w, h, 6), {
				geometry: { isFilled },
			}).close()
		case 'octagon':
			return PathBuilder.lineThroughPoints(getPolygonVertices(w, h, 8), {
				geometry: { isFilled },
			}).close()
		case 'oval':
			return getStadiumPath(w, h, isFilled)
		case 'pentagon':
			return PathBuilder.lineThroughPoints(getPolygonVertices(w, h, 5), {
				geometry: { isFilled },
			}).close()
		case 'rectangle':
			return new PathBuilder()
				.moveTo(0, 0, { geometry: { isFilled } })
				.lineTo(w, 0)
				.lineTo(w, h)
				.lineTo(0, h)
				.close()
		case 'rhombus': {
			const offset = Math.min(w * 0.38, h * 0.38)
			return new PathBuilder()
				.moveTo(offset, 0, { geometry: { isFilled } })
				.lineTo(w, 0)
				.lineTo(w - offset, h)
				.lineTo(0, h)
				.close()
		}
		case 'rhombus-2': {
			const offset = Math.min(w * 0.38, h * 0.38)
			return new PathBuilder()
				.moveTo(0, 0, { geometry: { isFilled } })
				.lineTo(w - offset, 0)
				.lineTo(w, h)
				.lineTo(offset, h)
				.close()
		}
		case 'star':
			return getStarPath(w, h, isFilled)
		case 'trapezoid': {
			const offset = Math.min(w * 0.38, h * 0.38)
			return new PathBuilder()
				.moveTo(offset, 0, { geometry: { isFilled } })
				.lineTo(w - offset, 0)
				.lineTo(w, h)
				.lineTo(0, h)
				.close()
		}
		case 'triangle':
			return new PathBuilder()
				.moveTo(cx, 0, { geometry: { isFilled } })
				.lineTo(w, h)
				.lineTo(0, h)
				.close()
		case 'x-box':
			return getXBoxPath(w, h, sw, shape.props.dash, isFilled)

		case 'cloud':
			return getCloudPath(w, h, shape.id, shape.props.size, shape.props.scale, isFilled)
		default:
			exhaustiveSwitchError(shape.props.geo)
	}
}

function getXBoxPath(
	w: number,
	h: number,
	sw: number,
	dash: TLDefaultDashStyle,
	isFilled: boolean
) {
	const cx = w / 2
	const cy = h / 2

	const path = new PathBuilder()
		.moveTo(0, 0, { geometry: { isFilled } })
		.lineTo(w, 0)
		.lineTo(w, h)
		.lineTo(0, h)
		.close()

	if (dash === 'dashed' || dash === 'dotted') {
		return path
			.moveTo(0, 0, {
				geometry: { isInternal: true, isFilled: false },
				dashStart: 'skip',
				dashEnd: 'outset',
			})
			.lineTo(cx, cy)
			.moveTo(w, h, {
				geometry: { isInternal: true, isFilled: false },
				dashStart: 'skip',
				dashEnd: 'outset',
			})
			.lineTo(cx, cy)
			.moveTo(0, h, {
				geometry: { isInternal: true, isFilled: false },
				dashStart: 'skip',
				dashEnd: 'outset',
			})
			.lineTo(cx, cy)
			.moveTo(w, 0, {
				geometry: { isInternal: true, isFilled: false },
				dashStart: 'skip',
				dashEnd: 'outset',
			})
			.lineTo(cx, cy)
	}

	const inset = dash === 'draw' ? 0.62 : 0

	path
		.moveTo(clamp(sw * inset, 0, w), clamp(sw * inset, 0, h), {
			geometry: { isInternal: true, isFilled: false },
		})
		.lineTo(clamp(w - sw * inset, 0, w), clamp(h - sw * inset, 0, h))
		.moveTo(clamp(w - sw * inset, 0, w), clamp(sw * inset, 0, h))
		.lineTo(clamp(sw * inset, 0, w), clamp(h - sw * inset, 0, h))

	return path
}

function getStadiumPath(w: number, h: number, isFilled: boolean) {
	// stadium:
	if (h > w) {
		const r = w / 2
		return new PathBuilder()
			.moveTo(0, r, { geometry: { isFilled } })
			.arcTo(r, r, false, true, 0, w, r)
			.lineTo(w, h - r)
			.arcTo(r, r, false, true, 0, 0, h - r)
			.close()
	}

	const r = h / 2
	return new PathBuilder()
		.moveTo(r, h, { geometry: { isFilled } })
		.arcTo(r, r, false, true, 0, r, 0)
		.lineTo(w - r, 0)
		.arcTo(r, r, false, true, 0, w - r, h)
		.close()
}

function getStarPath(w: number, h: number, isFilled: boolean) {
	// Most of this code is to offset the center, a 5 point star
	// will need to be moved downward because from its center [0,0]
	// it will have a bigger minY than maxY. This is because it'll
	// have 2 points at the bottom.
	const sides = 5
	const step = PI2 / sides / 2
	const rightMostIndex = Math.floor(sides / 4) * 2
	const leftMostIndex = sides * 2 - rightMostIndex
	const topMostIndex = 0
	const bottomMostIndex = Math.floor(sides / 2) * 2
	const maxX = (Math.cos(-HALF_PI + rightMostIndex * step) * w) / 2
	const minX = (Math.cos(-HALF_PI + leftMostIndex * step) * w) / 2

	const minY = (Math.sin(-HALF_PI + topMostIndex * step) * h) / 2
	const maxY = (Math.sin(-HALF_PI + bottomMostIndex * step) * h) / 2
	const diffX = w - Math.abs(maxX - minX)
	const diffY = h - Math.abs(maxY - minY)
	const offsetX = w / 2 + minX - (w / 2 - maxX)
	const offsetY = h / 2 + minY - (h / 2 - maxY)

	const ratio = 1
	const cx = (w - offsetX) / 2
	const cy = (h - offsetY) / 2
	const ox = (w + diffX) / 2
	const oy = (h + diffY) / 2
	const ix = (ox * ratio) / 2
	const iy = (oy * ratio) / 2

	return PathBuilder.lineThroughPoints(
		Array.from(Array(sides * 2), (_, i) => {
			const theta = -HALF_PI + i * step
			return new Vec(
				cx + (i % 2 ? ix : ox) * Math.cos(theta),
				cy + (i % 2 ? iy : oy) * Math.sin(theta)
			)
		}),
		{ geometry: { isFilled } }
	).close()
}

/* ---------------------- Cloud --------------------- */

function getOvalPerimeter(h: number, w: number) {
	if (h > w) return (PI * (w / 2) + (h - w)) * 2
	else return (PI * (h / 2) + (w - h)) * 2
}

type PillSection =
	| {
			type: 'straight'
			start: VecModel
			delta: VecModel
	  }
	| {
			type: 'arc'
			center: VecModel
			startAngle: number
	  }

function getPillPoints(width: number, height: number, numPoints: number) {
	const radius = Math.min(width, height) / 2
	const longSide = Math.max(width, height) - radius * 2
	const circumference = Math.PI * (radius * 2) + 2 * longSide
	const spacing = circumference / numPoints

	const sections: PillSection[] =
		width > height
			? [
					{
						type: 'straight',
						start: new Vec(radius, 0),
						delta: new Vec(1, 0),
					},
					{
						type: 'arc',
						center: new Vec(width - radius, radius),
						startAngle: -PI / 2,
					},
					{
						type: 'straight',
						start: new Vec(width - radius, height),
						delta: new Vec(-1, 0),
					},
					{
						type: 'arc',
						center: new Vec(radius, radius),
						startAngle: PI / 2,
					},
				]
			: [
					{
						type: 'straight',
						start: new Vec(width, radius),
						delta: new Vec(0, 1),
					},
					{
						type: 'arc',
						center: new Vec(radius, height - radius),
						startAngle: 0,
					},
					{
						type: 'straight',
						start: new Vec(0, height - radius),
						delta: new Vec(0, -1),
					},
					{
						type: 'arc',
						center: new Vec(radius, radius),
						startAngle: PI,
					},
				]

	let sectionOffset = 0

	const points: Vec[] = []
	for (let i = 0; i < numPoints; i++) {
		const section = sections[0]
		if (section.type === 'straight') {
			points.push(Vec.Add(section.start, Vec.Mul(section.delta, sectionOffset)))
		} else {
			points.push(
				getPointOnCircle(section.center, radius, section.startAngle + sectionOffset / radius)
			)
		}
		sectionOffset += spacing
		let sectionLength = section.type === 'straight' ? longSide : PI * radius
		while (sectionOffset > sectionLength) {
			sectionOffset -= sectionLength
			sections.push(sections.shift()!)
			sectionLength = sections[0].type === 'straight' ? longSide : PI * radius
		}
	}

	return points
}

const SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 50,
	m: 70,
	l: 100,
	xl: 130,
}

const BUMP_PROTRUSION = 0.2

function getCloudPath(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle,
	scale: number,
	isFilled: boolean
) {
	const path = new PathBuilder()
	const getRandom = rng(seed)
	const pillCircumference = getOvalPerimeter(width, height)
	const numBumps = Math.max(
		Math.ceil(pillCircumference / SIZES[size]),
		6,
		Math.ceil(pillCircumference / Math.min(width, height))
	)
	const targetBumpProtrusion = (pillCircumference / numBumps) * BUMP_PROTRUSION

	// if the aspect ratio is high, innerWidth should be smaller
	const innerWidth = Math.max(width - targetBumpProtrusion * 2, 1)
	const innerHeight = Math.max(height - targetBumpProtrusion * 2, 1)
	const innerCircumference = getOvalPerimeter(innerWidth, innerHeight)

	const distanceBetweenPointsOnPerimeter = innerCircumference / numBumps

	const paddingX = (width - innerWidth) / 2
	const paddingY = (height - innerHeight) / 2
	const bumpPoints = getPillPoints(innerWidth, innerHeight, numBumps).map((p) => {
		return p.addXY(paddingX, paddingY)
	})
	const maxWiggleX = width < 20 ? 0 : targetBumpProtrusion * 0.3
	const maxWiggleY = height < 20 ? 0 : targetBumpProtrusion * 0.3

	// wiggle the points from either end so that the bumps 'pop'
	// in at the bottom-right and the top-left looks relatively stable
	// note: it's important that we don't mutate here! these points are also the bump points
	const wiggledPoints = bumpPoints.slice(0)
	for (let i = 0; i < Math.floor(numBumps / 2); i++) {
		wiggledPoints[i] = Vec.AddXY(
			wiggledPoints[i],
			getRandom() * maxWiggleX * scale,
			getRandom() * maxWiggleY * scale
		)
		wiggledPoints[numBumps - i - 1] = Vec.AddXY(
			wiggledPoints[numBumps - i - 1],
			getRandom() * maxWiggleX * scale,
			getRandom() * maxWiggleY * scale
		)
	}

	for (let i = 0; i < wiggledPoints.length; i++) {
		const j = i === wiggledPoints.length - 1 ? 0 : i + 1
		const leftWigglePoint = wiggledPoints[i]
		const rightWigglePoint = wiggledPoints[j]
		const leftPoint = bumpPoints[i]
		const rightPoint = bumpPoints[j]

		// when the points are on the curvy part of a pill, there is a natural arc that we need to extends past
		// otherwise it looks like the bumps get less bumpy on the curvy parts
		const distanceBetweenOriginalPoints = Vec.Dist(leftPoint, rightPoint)
		const curvatureOffset = distanceBetweenPointsOnPerimeter - distanceBetweenOriginalPoints
		const distanceBetweenWigglePoints = Vec.Dist(leftWigglePoint, rightWigglePoint)
		const relativeSize = distanceBetweenWigglePoints / distanceBetweenOriginalPoints
		const finalDistance = (Math.max(paddingX, paddingY) + curvatureOffset) * relativeSize

		const arcPoint = Vec.Lrp(leftPoint, rightPoint, 0.5).add(
			Vec.Sub(rightPoint, leftPoint).uni().per().mul(finalDistance)
		)
		if (arcPoint.x < 0) {
			arcPoint.x = 0
		} else if (arcPoint.x > width) {
			arcPoint.x = width
		}
		if (arcPoint.y < 0) {
			arcPoint.y = 0
		} else if (arcPoint.y > height) {
			arcPoint.y = height
		}

		const center = centerOfCircleFromThreePoints(leftWigglePoint, rightWigglePoint, arcPoint)

		const radius = Vec.Dist(
			center ? center : Vec.Average([leftWigglePoint, rightWigglePoint]),
			leftWigglePoint
		)

		if (i === 0) {
			path.moveTo(leftWigglePoint.x, leftWigglePoint.y, { geometry: { isFilled } })
		}

		path.circularArcTo(radius, false, true, rightWigglePoint.x, rightWigglePoint.y)
	}

	return path.close()
}

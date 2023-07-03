import {
	Box2d,
	Vec2d,
	getPointOnCircle,
	intersectCircleCircle,
	shortAngleDist,
} from '@tldraw/primitives'
import { Vec2dModel } from '@tldraw/tlschema'

function getNudge(
	side: 'top' | 'bottom' | 'left' | 'right',
	maxNudgeDistance: number,
	normalizedPosition: number
) {
	const nudgeApplicationFactor =
		normalizedPosition > 0.5
			? Math.sqrt(1 / 4 - Math.pow(normalizedPosition - 1, 2))
			: Math.sqrt(1 / 4 - Math.pow(normalizedPosition, 2))
	let xSign = 1
	let ySign = 1
	switch (side) {
		case 'top':
			if (normalizedPosition > 0.5) {
				xSign = -1
			}
			break
		case 'bottom':
			ySign = -1
			if (normalizedPosition > 0.5) {
				xSign = -1
			}
			break
		case 'left':
			if (normalizedPosition > 0.5) {
				ySign = -1
			}
			break
		case 'right':
			xSign = -1
			if (normalizedPosition > 0.5) {
				ySign = -1
			}
			break
	}

	return {
		x: xSign * maxNudgeDistance * nudgeApplicationFactor,
		y: ySign * maxNudgeDistance * nudgeApplicationFactor,
	}
}

export function cloudOutline(width: number, height: number) {
	const radius = Math.min(width, height) / 5
	const goalSpacing = radius * 1.6
	const numHBalls = Math.ceil((width - 2 * radius) / goalSpacing) + 1
	const numVBalls = Math.ceil((height - 2 * radius) / goalSpacing) + 1
	const hBallSpacing = (width - 2 * radius) / (numHBalls - 1)
	const vBallSpacing = (height - 2 * radius) / (numVBalls - 1)

	const circleCenters: Vec2dModel[] = []
	// let's get the outer circles going clockwise from the top left
	const nudgeFactor = 0.5
	const maxNudgeDistance = radius * nudgeFactor
	// top edge
	for (let col = 0; col < numHBalls; col++) {
		const nudge = getNudge('top', maxNudgeDistance, col / (numHBalls - 1))
		circleCenters.push({
			x: nudge.x + radius + col * hBallSpacing,
			y: nudge.y + radius,
		})
	}
	// right edge
	for (let row = 1; row < numVBalls; row++) {
		const nudge = getNudge('right', maxNudgeDistance, row / (numVBalls - 1))
		circleCenters.push({
			x: nudge.x + width - radius,
			y: nudge.y + radius + row * vBallSpacing,
		})
	}
	// bottom edge
	for (let col = numHBalls - 2; col >= 0; col--) {
		const nudge = getNudge('bottom', maxNudgeDistance, col / (numHBalls - 1))
		circleCenters.push({
			x: nudge.x + radius + col * hBallSpacing,
			y: nudge.y + height - radius,
		})
	}

	// left edge
	for (let row = numVBalls - 2; row >= 1; row--) {
		const nudge = getNudge('left', maxNudgeDistance, row / (numVBalls - 1))
		circleCenters.push({
			x: nudge.x + radius,
			y: nudge.y + radius + row * vBallSpacing,
		})
	}

	const center = Box2d.FromPoints(circleCenters).center

	const path: Vec2d[] = []

	// now draw arcs for each circle, starting where it intersects the previous circle, and ending where it intersects the next circle
	for (let i = 0; i < circleCenters.length; i++) {
		const prevCenter = circleCenters[i === 0 ? circleCenters.length - 1 : i - 1]
		const thisCenter = circleCenters[i]
		const nextCenter = circleCenters[i === circleCenters.length - 1 ? 0 : i + 1]

		const leftPoint = intersectCircleCircle(prevCenter, radius, thisCenter, radius)
			.sort((a, b) => Vec2d.Dist(a, center) - Vec2d.Dist(b, center))
			.pop()!
		const rightPoint = intersectCircleCircle(thisCenter, radius, nextCenter, radius)
			.sort((a, b) => Vec2d.Dist(a, center) - Vec2d.Dist(b, center))
			.pop()!

		path.push(...pointsOnArc(leftPoint, rightPoint, thisCenter, radius))
	}

	return path
}

export function pointsOnArc(
	startPoint: Vec2dModel,
	endPoint: Vec2dModel,
	center: Vec2dModel,
	radius: number
): Vec2d[] {
	const results: Vec2d[] = []

	const startAngle = Vec2d.Angle(center, startPoint)
	const endAngle = Vec2d.Angle(center, endPoint)

	const l = shortAngleDist(startAngle, endAngle)

	// const pointsToPush = Math.max(5, Math.ceil(Math.abs(Vec2d.Dist(startPoint, endPoint)) / 16))
	const pointsToPush = 15

	for (let i = 0; i < pointsToPush; i++) {
		const t = i / (pointsToPush - 1)
		const angle = startAngle + l * t
		const point = getPointOnCircle(center.x, center.y, radius, angle)
		results.push(point)
	}

	return results
}

import { TLDefaultColorTheme, TLGeoShape, VecLike } from '@tldraw/editor'
import * as React from 'react'
import {
	ShapeFill,
	getShapeFillSvg,
	getSvgWithShapeFill,
	useDefaultColorTheme,
} from '../../shared/ShapeFill'
import { getRoundedInkyPolygonPath, getRoundedPolygonPoints } from '../../shared/polygon-helpers'

export const DrawStylePolygon = React.memo(function DrawStylePolygon({
	id,
	outline,
	lines,
	fill,
	color,
	strokeWidth,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	id: TLGeoShape['id']
	outline: VecLike[]
	strokeWidth: number
	lines?: VecLike[][]
}) {
	const theme = useDefaultColorTheme()
	const polygonPoints = getRoundedPolygonPoints(id, outline, strokeWidth / 3, strokeWidth * 2, 2)
	let strokePathData = getRoundedInkyPolygonPath(polygonPoints)

	if (lines) {
		for (const [A, B] of lines) {
			strokePathData += `M${A.x},${A.y}L${B.x},${B.y}`
		}
	}

	const innerPolygonPoints = getRoundedPolygonPoints(id, outline, 0, strokeWidth * 2, 1)
	const innerPathData = getRoundedInkyPolygonPath(innerPolygonPoints)

	return (
		<>
			<ShapeFill d={innerPathData} fill={fill} color={color} theme={theme} />
			<path d={strokePathData} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
		</>
	)
})

export function DrawStylePolygonSvg({
	id,
	outline,
	lines,
	fill,
	color,
	theme,
	strokeWidth,
}: Pick<TLGeoShape['props'], 'fill' | 'color'> & {
	id: TLGeoShape['id']
	outline: VecLike[]
	lines?: VecLike[][]
	strokeWidth: number
	theme: TLDefaultColorTheme
}) {
	const polygonPoints = getRoundedPolygonPoints(id, outline, strokeWidth / 3, strokeWidth * 2, 2)

	let strokePathData = getRoundedInkyPolygonPath(polygonPoints)

	if (lines) {
		for (const [A, B] of lines) {
			strokePathData += `M${A.x},${A.y}L${B.x},${B.y}`
		}
	}

	const innerPolygonPoints = getRoundedPolygonPoints(id, outline, 0, strokeWidth * 2, 1)
	const innerPathData = getRoundedInkyPolygonPath(innerPolygonPoints)

	const strokeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	strokeElement.setAttribute('d', strokePathData)
	strokeElement.setAttribute('fill', 'none')
	strokeElement.setAttribute('stroke', theme[color].solid)
	strokeElement.setAttribute('stroke-width', strokeWidth.toString())

	// Get the fill element, if any
	const fillElement = getShapeFillSvg({
		d: innerPathData,
		fill,
		color,
		theme,
	})

	return getSvgWithShapeFill(strokeElement, fillElement)
}

// function getPolygonDrawPoints(id: string, outline: VecLike[], strokeWidth: number) {
// 	const points: Vec2d[] = []

// 	const getRandom = rng(id)

// 	const start = Math.round(Math.abs(getRandom()) * outline.length)

// 	const corners = outline.map((p) =>
// 		Vec2d.AddXY(p, (getRandom() * strokeWidth) / 4, (getRandom() * strokeWidth) / 4)
// 	)

// 	const len = corners.length

// 	for (let i = 0, n = len + 1; i < n; i++) {
// 		const At = corners[(start + i) % len]
// 		const Bt = corners[(start + i + 1) % len]

// 		const dist = Math.min(Vec2d.Dist(At, Bt) / 2, strokeWidth / 2)
// 		const A = Vec2d.Nudge(At, Bt, dist)

// 		const D = Vec2d.Med(At, Bt)

// 		if (i === 0) {
// 			Bt.z = 0.7
// 			points.push(new Vec2d(D.x, D.y, 0.7), Bt)
// 		} else if (i === outline.length) {
// 			const lastSegPoints = Vec2d.PointsBetween(A, D, 4)
// 			lastSegPoints.forEach((p) => (p.z = 0.7))
// 			points.push(...lastSegPoints)
// 		} else {
// 			points.push(...Vec2d.PointsBetween(A, Bt, 6))
// 		}
// 	}

// 	return points
// }

// export function getPolygonIndicatorPath(id: string, outline: VecLike[], strokeWidth: number) {
// 	const points = getPolygonDrawPoints(id, outline, strokeWidth)
// 	const options = getPolygonStrokeOptions(strokeWidth)
// 	const strokePoints = getStrokePoints(points, options)

// 	return getSvgPathFromStrokePoints(strokePoints, true)
// }

// function getPolygonStrokeOptions(strokeWidth: number) {
// 	return {
// 		size: 1 + strokeWidth * 0.618,
// 		last: true,
// 		simulatePressure: false,
// 		streamline: 0.25,
// 		thinning: 0.9,
// 	}
// }

// function getPolygonstrokePathData(id: string, outline: VecLike[], strokeWidth: number) {
// 	// draw a line between all of the points
// 	let d = `M${outline[0].x},${outline[0].y}`
// 	d += 'Z'

// 	for (const { x, y } of outline) {
// 		d += `${x},${y}`
// 	}

// 	return d
// }

// function SimpleInkyPolygon(id: string, outline: VecLike[], offset: number) {
// 	const random = rng(id)
// 	let p = outline[0]

// 	let ox = random() * offset
// 	let oy = random() * offset

// 	let polylineA = `M${p.x - ox},${p.y - oy}L`
// 	let polylineB = `${p.x + ox},${p.y + oy} `

// 	for (let i = 1, n = outline.length; i < n; i++) {
// 		p = outline[i]
// 		ox = random() * offset
// 		oy = random() * offset

// 		polylineA += `${p.x - ox},${p.y - oy} `
// 		polylineB += `${p.x + ox},${p.y + oy} `
// 	}

// 	polylineB += 'Z'

// 	polylineA += polylineB

// 	return polylineA
// }

// function CubicInkyPolygon(id: string, outline: VecLike[], offset: number) {
// 	const random = rng(id)
// 	let p0 = outline[0]
// 	let p1 = p0

// 	let ox: number
// 	let oy: number

// 	let polylineA = `M${p0.x},${p0.y} L`
// 	let polylineB = `M${p0.x},${p0.y}`

// 	for (let i = 0, n = outline.length; i < n; i++) {
// 		p0 = outline[i]
// 		p1 = outline[(i + 1) % n]

// 		polylineA += `${p1.x},${p1.y} `

// 		ox = random() * offset
// 		oy = random() * offset
// 		const c1 = Vec2d.Lrp(p0, p1, 0.25)
// 		const c2 = Vec2d.Lrp(p0, p1, 0.75)

// 		polylineB += `C${c1.x + ox},${c1.y + oy} ${c2.x - ox},${c2.y - oy} ${p1.x},${p1.y}`
// 	}

// 	polylineB += 'Z'

// 	polylineA += polylineB

// 	return polylineA
// }

// function QuadraticInkyPolygon(id: string, outline: VecLike[], offset: number) {
// 	const random = rng(id)
// 	let p0 = outline[0]
// 	let p1 = p0

// 	let polylineA = `M${p0.x},${p0.y} Q`

// 	const len = outline.length

// 	for (let i = 0, n = len * 2; i < n; i++) {
// 		p0 = outline[i % len]
// 		p1 = outline[(i + 1) % len]
// 		const dist = Vec2d.Dist(p0, p1)

// 		const c1 = Vec2d.Lrp(p0, p1, 0.5 + random() / 2)
// 		polylineA += `${c1.x + random() * Math.min(dist / 10, offset)},${
// 			c1.y + random() * Math.min(dist / 10, offset)
// 		} ${p1.x + (random() * offset) / 2},${p1.y + (random() * offset) / 2} `
// 	}

// 	polylineA += 'Z'

// 	return polylineA
// }

// function GlobyInkyPolygon(id: string, outline: VecLike[], offset: number) {
// 	const random = rng(id)
// 	let p0 = outline[0]
// 	let p1 = p0

// 	let polylineA = `M${p0.x},${p0.y} Q`

// 	const len = outline.length

// 	for (let i = 0, n = len * 2; i < n; i++) {
// 		p0 = outline[i % len]
// 		p1 = outline[(i + 1) % len]
// 		const dist = Vec2d.Dist(p0, p1)

// 		const c1 = Vec2d.Lrp(p0, p1, 0.5 + random() / 2)
// 		polylineA += `${c1.x + random() * Math.min(dist / 10, offset)},${
// 			c1.y + random() * Math.min(dist / 10, offset)
// 		} ${p1.x + (random() * offset) / 2},${p1.y + (random() * offset) / 2} `
// 	}

// 	polylineA += 'Z'

// 	return polylineA
// }

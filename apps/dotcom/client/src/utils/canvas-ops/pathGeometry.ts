import { b64Vecs, getIndices, type TLDrawShape, type TLLineShape } from 'tldraw'

interface Point {
	x: number
	y: number
}

/** Native editable geometry for a line (open) or draw (closed) shape; callers handle ids, attribution, and styling. */
export function pathGeometry(input: Point[], closed = false, smooth = false) {
	const points = input.map((p) => ({ ...p }))
	if (
		closed &&
		points.length > 1 &&
		points[0].x === points.at(-1)!.x &&
		points[0].y === points.at(-1)!.y
	)
		points.pop()
	if (new Set(points.map((p) => `${p.x},${p.y}`)).size < (closed ? 3 : 2)) {
		throw new Error(
			`A ${closed ? 'closed' : 'open'} path needs at least ${closed ? 3 : 2} distinct points`
		)
	}
	const x = Math.min(...points.map((p) => p.x))
	const y = Math.min(...points.map((p) => p.y))
	const local = points.map((p) => ({ x: p.x - x, y: p.y - y }))
	if (!closed) {
		const indices = getIndices(local.length)
		const props: Pick<TLLineShape['props'], 'points' | 'spline'> = {
			spline: smooth ? 'cubic' : 'line',
			points: Object.fromEntries(
				local.map((p, i) => [indices[i], { ...p, id: indices[i], index: indices[i] }])
			),
		}
		return { type: 'line' as const, x, y, props }
	}
	const segments: TLDrawShape['props']['segments'] = []
	if (smooth) {
		// Periodic Catmull–Rom interpolation makes a smooth closed outline through the supplied
		// vertices. Retain a native draw shape, so it can be filled, resized, and edited normally.
		const samples: Point[] = []
		for (let i = 0; i < local.length; i++) {
			const p0 = local[(i - 1 + local.length) % local.length]
			const p1 = local[i],
				p2 = local[(i + 1) % local.length],
				p3 = local[(i + 2) % local.length]
			for (let j = 0; j < 12; j++) {
				const t = j / 12,
					t2 = t * t,
					t3 = t2 * t
				const axis = (key: 'x' | 'y') =>
					0.5 *
					(2 * p1[key] +
						(-p0[key] + p2[key]) * t +
						(2 * p0[key] - 5 * p1[key] + 4 * p2[key] - p3[key]) * t2 +
						(-p0[key] + 3 * p1[key] - 3 * p2[key] + p3[key]) * t3)
				samples.push({ x: axis('x'), y: axis('y') })
			}
		}
		samples.push(local[0])
		segments.push({
			type: 'free',
			path: b64Vecs.encodePoints(samples.map((p) => ({ ...p, z: 0.5 }))),
		})
	} else {
		for (let i = 0; i < local.length; i++) {
			segments.push({
				type: 'straight',
				path: b64Vecs.encodePoints(
					[local[i], local[(i + 1) % local.length]].map((p) => ({ ...p, z: 0.5 }))
				),
			})
		}
	}
	return {
		type: 'draw' as const,
		x,
		y,
		props: { segments, isClosed: true, isComplete: true, isPen: false },
	}
}

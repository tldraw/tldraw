import {
	ArrowShapeUtil,
	Box,
	ComputedCache,
	Editor,
	Group2d,
	HALF_PI,
	IndexKey,
	PathBuilder,
	TLArrowShape,
	TLBinding,
	TLDefaultColorStyle,
	TLShape,
	TLShapeId,
	Vec,
	clamp,
	createShapeId,
	getArrowBindings,
	getArrowTerminalsInArrowSpace,
	getDisplayValues,
	getIndexAbove,
	getIndexBetween,
	getIndicesBetween,
	intersectLineSegmentLineSegment,
} from 'tldraw'

export const ZIP_TIE = 'zip-tie'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[ZIP_TIE]: { color: TLDefaultColorStyle }
	}
	export interface TLGlobalBindingPropsMap {
		// [1]
		[ZIP_TIE]: { lane: IndexKey; order: IndexKey }
	}
}

export type ZipTieShape = TLShape<typeof ZIP_TIE>
export type ZipTieBinding = TLBinding<typeof ZIP_TIE>

// Distance between neighbouring arrows inside a tie, as a multiple of the thickest arrow's stroke.
const LANE_SPACING = 2
// Matches the gap tldraw leaves between a bound arrowhead and its target.
const BOUND_ARROW_OFFSET = 10
const STROKE_SIZES = { s: 1, m: 1.75, l: 2.5, xl: 5 } as Record<string, number>

const byKey = (a: IndexKey, b: IndexKey) => (a < b ? -1 : a > b ? 1 : 0)

// Two people tying the same arrow at the same moment can give two ties the same order key.
function getOrderBetween(below: IndexKey | undefined, above: IndexKey | undefined) {
	if (below && above && below >= above) return getIndexAbove(below)
	return getIndexBetween(below, above)
}

export function getArrowStrokeWidth(editor: Editor, arrow: TLArrowShape) {
	const util = editor.getShapeUtil(arrow) as ArrowShapeUtil
	return getDisplayValues(util, arrow).strokeWidth * arrow.props.scale
}

// [2]
export function getZipTieLayout(editor: Editor, tieId: TLShapeId) {
	const bindings = editor
		.getBindingsToShape<ZipTieBinding>(tieId, ZIP_TIE)
		.sort((a, b) => byKey(a.props.lane, b.props.lane))

	let strokeWidth = 0
	for (const binding of bindings) {
		const arrow = editor.getShape<TLArrowShape>(binding.fromId)
		if (arrow) strokeWidth = Math.max(strokeWidth, getArrowStrokeWidth(editor, arrow))
	}

	const spacing = strokeWidth * LANE_SPACING
	const offsets = new Map<string, number>()
	bindings.forEach((b, i) => offsets.set(b.id, (i - (bindings.length - 1) / 2) * spacing))

	return {
		strokeWidth,
		offsets,
		length: Math.max(0, bindings.length - 1) * spacing + strokeWidth,
	}
}

// A cubic bezier from a to d with control points b and c.
export interface Cubic {
	a: Vec
	b: Vec
	c: Vec
	d: Vec
}

function cubicPoint({ a, b, c, d }: Cubic, t: number) {
	const mt = 1 - t
	return new Vec(
		mt * mt * mt * a.x + 3 * mt * mt * t * b.x + 3 * mt * t * t * c.x + t * t * t * d.x,
		mt * mt * mt * a.y + 3 * mt * mt * t * b.y + 3 * mt * t * t * c.y + t * t * t * d.y
	)
}

function sampleCubic(cubic: Cubic, count = 24) {
	const points: Vec[] = []
	for (let i = 0; i <= count; i++) points.push(cubicPoint(cubic, i / count))
	return points
}

function cubicLength(cubic: Cubic) {
	const points = sampleCubic(cubic)
	let length = 0
	for (let i = 1; i < points.length; i++) length += Vec.Dist(points[i - 1], points[i])
	return length
}

// Signed curvature at the start of a cubic, positive when it bends towards Vec.Per(tangent).
function startCurvature({ a, b, c }: Cubic) {
	const d1 = Vec.Sub(b, a).mul(3)
	const d2 = Vec.Sub(c, b).sub(Vec.Sub(b, a)).mul(6)
	const len = Vec.Len(d1)
	return len === 0 ? 0 : -Vec.Cpr(d1, d2) / (len * len * len)
}

function reverseCubic({ a, b, c, d }: Cubic): Cubic {
	return { a: d, b: c, c: b, d: a }
}

// Where an arrow passes through a tie, in page space. `tangent` points the way the arrow travels.
interface Stop {
	center: Vec
	point: Vec
	tangent: Vec
}

// [3]
function getBundleSegment(from: Stop, to: Stop): Cubic {
	const arm = Vec.Dist(from.center, to.center) * 0.4
	const spine: Cubic = {
		a: from.center,
		b: Vec.Add(from.center, Vec.Mul(from.tangent, arm)),
		c: Vec.Sub(to.center, Vec.Mul(to.tangent, arm)),
		d: to.center,
	}
	const fromOffset = Vec.Dpr(Vec.Sub(from.point, from.center), Vec.Per(from.tangent))
	const toOffset = Vec.Dpr(Vec.Sub(to.point, to.center), Vec.Per(to.tangent))
	const fromArm = arm * clamp(1 - startCurvature(spine) * fromOffset, 0.1, 2)
	// Reversing a curve flips the sign of its curvature, hence the + here.
	const toArm = arm * clamp(1 + startCurvature(reverseCubic(spine)) * toOffset, 0.1, 2)

	return {
		a: from.point,
		b: Vec.Add(from.point, Vec.Mul(from.tangent, fromArm)),
		c: Vec.Sub(to.point, Vec.Mul(to.tangent, toArm)),
		d: to.point,
	}
}

// [4]
function getCurveIntoStop(start: Vec, stop: Stop): Cubic {
	const control = Vec.Sub(stop.point, Vec.Mul(stop.tangent, Vec.Dist(start, stop.point) * 0.5))
	return {
		a: start,
		b: Vec.Lrp(start, control, 2 / 3),
		c: Vec.Lrp(stop.point, control, 2 / 3),
		d: stop.point,
	}
}

// [5]
function getTerminalSegment(
	editor: Editor,
	arrow: TLArrowShape,
	terminal: 'start' | 'end',
	anchor: Vec,
	stop: Stop
): Cubic {
	const curve = getCurveIntoStop(anchor, stop)
	const binding = getArrowBindings(editor, arrow)[terminal]
	if (!binding || binding.props.isExact) return curve

	const target = editor.getShape(binding.toId)
	if (!target) return curve

	const targetTransform = editor.getShapePageTransform(target)
	const toTarget = targetTransform.clone().invert()
	const geometry = editor.getShapeGeometry(target)
	const points = sampleCubic(curve, 32).map((p) => toTarget.applyToPoint(p))

	let edge: Vec | undefined
	for (let i = points.length - 1; i > 0 && !edge; i--) {
		const hits = geometry.intersectLineSegment(points[i], points[i - 1], {
			includeLabels: false,
			includeInternal: false,
		})
		if (!hits.length) continue
		const nearest = hits.sort((p, q) => Vec.Dist2(p, points[i]) - Vec.Dist2(q, points[i]))[0]
		edge = targetTransform.applyToPoint(nearest)
	}
	if (!edge) return curve

	const arrowhead = terminal === 'start' ? arrow.props.arrowheadStart : arrow.props.arrowheadEnd
	if (arrowhead === 'none') return getCurveIntoStop(edge, stop)

	const theme = editor.getCurrentTheme()
	const targetStrokeWidth =
		'size' in target.props
			? theme.strokeWidth * (STROKE_SIZES[target.props.size as string] ?? 0)
			: 0
	const gap =
		(BOUND_ARROW_OFFSET + targetStrokeWidth / 2) * arrow.props.scale +
		getArrowStrokeWidth(editor, arrow) / 2
	const direction = Vec.Sub(getCurveIntoStop(edge, stop).b, edge).uni()
	const start = Vec.Add(edge, direction.mul(Math.min(gap, Vec.Dist(edge, stop.point) / 2)))
	return getCurveIntoStop(start, stop)
}

export interface ZipArrowRoute {
	// The arrow's zip ties, in order from its start to its end.
	ties: ZipTieBinding[]
	// In arrow space. Segment i runs from tie i - 1 (or the start) to tie i (or the end).
	segments: Cubic[]
	length: number
}

function computeZipArrowRoute(editor: Editor, arrow: TLArrowShape): ZipArrowRoute | undefined {
	const ties = editor
		.getBindingsFromShape<ZipTieBinding>(arrow, ZIP_TIE)
		.sort((a, b) => byKey(a.props.order, b.props.order) || (a.id < b.id ? -1 : 1))
	if (!ties.length) return undefined

	const arrowTransform = editor.getShapePageTransform(arrow)
	const terminals = getArrowTerminalsInArrowSpace(editor, arrow, getArrowBindings(editor, arrow))
	const start = arrowTransform.applyToPoint(terminals.start)
	const end = arrowTransform.applyToPoint(terminals.end)

	const stops: Stop[] = ties.map((binding) => {
		const tieTransform = editor.getShapePageTransform(binding.toId)
		const center = tieTransform.applyToPoint({ x: 0, y: 0 })
		const tangent = Vec.Sub(tieTransform.applyToPoint({ x: 1, y: 0 }), center).uni()
		const normal = Vec.Sub(tieTransform.applyToPoint({ x: 0, y: 1 }), center).uni()
		const offset = getZipTieLayout(editor, binding.toId).offsets.get(binding.id) ?? 0
		return { center, tangent, point: Vec.Add(center, normal.mul(offset)) }
	})

	// [6]
	stops.forEach((stop, i) => {
		const prev = stops[i - 1]?.center
		const next = stops[i + 1]?.center
		const direction =
			prev && next
				? Vec.Sub(next, prev)
				: prev
					? Vec.Sub(stop.center, prev)
					: next
						? Vec.Sub(next, stop.center)
						: Vec.Sub(end, start)
		if (Vec.Dpr(stop.tangent, direction) < 0) stop.tangent = stop.tangent.neg()
	})

	const last = stops[stops.length - 1]
	const pageSegments = [
		getTerminalSegment(editor, arrow, 'start', start, stops[0]),
		...stops.slice(1).map((stop, i) => getBundleSegment(stops[i], stop)),
		reverseCubic(
			getTerminalSegment(editor, arrow, 'end', end, {
				...last,
				tangent: last.tangent.clone().neg(),
			})
		),
	]

	const toArrow = arrowTransform.clone().invert()
	const segments = pageSegments.map(({ a, b, c, d }) => ({
		a: toArrow.applyToPoint(a),
		b: toArrow.applyToPoint(b),
		c: toArrow.applyToPoint(c),
		d: toArrow.applyToPoint(d),
	}))

	return { ties, segments, length: segments.reduce((sum, s) => sum + cubicLength(s), 0) }
}

// [7]
const routeCaches = new WeakMap<Editor, ComputedCache<ZipArrowRoute, TLArrowShape>>()

export function getZipArrowRoute(editor: Editor, arrow: TLArrowShape | TLShapeId) {
	let cache = routeCaches.get(editor)
	if (!cache) {
		cache = editor.store.createComputedCache<ZipArrowRoute, TLArrowShape>(
			'zip arrow route',
			(shape) => computeZipArrowRoute(editor, shape)
		)
		routeCaches.set(editor, cache)
	}
	return cache.get(typeof arrow === 'string' ? arrow : arrow.id)
}

export function getZipArrowPath(route: ZipArrowRoute) {
	// Zero draw-style offset keeps the jitter of the "draw" dash style from breaking the bundle apart.
	const opts = { offset: 0, roundness: 0, mergeWithPrevious: true }
	const { a } = route.segments[0]
	const path = new PathBuilder().moveTo(a.x, a.y, opts)
	for (const { b, c, d } of route.segments) path.cubicBezierTo(d.x, d.y, b.x, b.y, c.x, c.y, opts)
	return path
}

// [8]
export function getZipArrowheadPath(
	route: ZipArrowRoute,
	side: 'start' | 'end',
	type: TLArrowShape['props']['arrowheadEnd'],
	strokeWidth: number
) {
	if (type === 'none') return undefined

	const segment =
		side === 'start' ? route.segments[0] : reverseCubic(route.segments[route.segments.length - 1])
	const point = segment.a
	const size = clamp(route.length / 5, strokeWidth, strokeWidth * 3)
	const samples = sampleCubic(segment, 48)
	const int = samples.find((p) => Vec.Dist(p, point) >= size) ?? samples[samples.length - 1]

	switch (type) {
		case 'arrow': {
			const l = Vec.RotWith(int, point, Math.PI / 6)
			const r = Vec.RotWith(int, point, -Math.PI / 6)
			return `M ${l.x} ${l.y} L ${point.x} ${point.y} L ${r.x} ${r.y}`
		}
		case 'triangle': {
			const l = Vec.RotWith(int, point, Math.PI / 6)
			const r = Vec.RotWith(int, point, -Math.PI / 6)
			return `M ${l.x} ${l.y} L ${r.x} ${r.y} L ${point.x} ${point.y} Z`
		}
		case 'inverted': {
			const half = Vec.Sub(int, point).div(2).rot(HALF_PI)
			const l = Vec.Add(point, half)
			const r = Vec.Sub(point, half)
			return `M ${l.x} ${l.y} L ${int.x} ${int.y} L ${r.x} ${r.y} Z`
		}
		case 'bar': {
			const half = Vec.Sub(int, point).div(2).rot(HALF_PI)
			const l = Vec.Add(point, half)
			const r = Vec.Sub(point, half)
			return `M ${l.x} ${l.y} L ${r.x} ${r.y}`
		}
		case 'dot': {
			const c = Vec.Lrp(point, int, 0.45)
			const radius = Vec.Dist(c, point)
			return `M ${c.x - radius},${c.y} a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
		}
		case 'diamond': {
			const base = Vec.Lrp(point, int, 0.75)
			const l = Vec.RotWith(base, point, Math.PI / 4)
			const r = Vec.RotWith(base, point, -Math.PI / 4)
			const far = Vec.Lrp(l, r, 0.5)
			far.add(Vec.Sub(far, point))
			return `M ${far.x} ${far.y} L ${r.x} ${r.y} ${point.x} ${point.y} L ${l.x} ${l.y} Z`
		}
		case 'square': {
			const base = Vec.Lrp(point, int, 0.85)
			const half = Vec.Sub(base, point).div(2).rot(HALF_PI)
			const l1 = Vec.Add(point, half)
			const r1 = Vec.Sub(point, half)
			const l2 = Vec.Add(base, half)
			const r2 = Vec.Sub(base, half)
			return `M ${l1.x} ${l1.y} L ${l2.x} ${l2.y} L ${r2.x} ${r2.y} L ${r1.x} ${r1.y} Z`
		}
		default:
			return undefined
	}
}

export interface ZipTieHit {
	arrowId: TLShapeId
	point: Vec
	tangent: Vec
	// Which segment of a zip-tied arrow's route was cut; always 0 for an untied arrow.
	segment: number
	distance: number
}

// The arrow's body in page space, as a polyline tagged with the route segment of each point.
function getArrowPolyline(editor: Editor, arrow: TLArrowShape) {
	const transform = editor.getShapePageTransform(arrow)
	const route = getZipArrowRoute(editor, arrow)
	if (route) {
		const points: Vec[] = []
		const segments: number[] = []
		route.segments.forEach((segment, i) => {
			for (const p of sampleCubic(segment)) {
				points.push(transform.applyToPoint(p))
				segments.push(i)
			}
		})
		return { points, segments }
	}

	const geometry = editor.getShapeGeometry(arrow)
	const body = geometry instanceof Group2d ? geometry.children[0] : geometry
	const points = body.vertices.map((p) => transform.applyToPoint(p))
	return { points, segments: points.map(() => 0) }
}

// [9]
export function getZipTieHits(editor: Editor, a: Vec, b: Vec): ZipTieHit[] {
	const cutBounds = Box.FromPoints([a, b]).expandBy(1)
	const hits: ZipTieHit[] = []

	for (const shape of editor.getCurrentPageShapes()) {
		if (!editor.isShapeOfType(shape, 'arrow') || shape.isLocked) continue
		if (!editor.getShapePageBounds(shape)?.collides(cutBounds)) continue

		const { points, segments } = getArrowPolyline(editor, shape)
		let best: ZipTieHit | undefined
		for (let i = 0; i < points.length - 1; i++) {
			const point = intersectLineSegmentLineSegment(a, b, points[i], points[i + 1])
			if (!point) continue
			const distance = Vec.Dist(a, point)
			if (best && best.distance <= distance) continue
			best = {
				arrowId: shape.id,
				point,
				tangent: Vec.Sub(points[i + 1], points[i]).uni(),
				segment: segments[i],
				distance,
			}
		}
		if (best) hits.push(best)
	}

	return hits.sort((p, q) => p.distance - q.distance)
}

// [10]
export function zipTieArrows(editor: Editor, hits: ZipTieHit[]) {
	const reference = hits[0].tangent
	const sum = new Vec()
	for (const { tangent } of hits) {
		sum.add(Vec.Dpr(tangent, reference) < 0 ? Vec.Neg(tangent) : tangent)
	}
	const tangent = Vec.Len(sum) > 0.001 ? sum.uni() : reference
	const normal = Vec.Per(tangent).neg()
	const center = Vec.Average(hits.map((h) => h.point))

	const sorted = [...hits].sort(
		(p, q) => Vec.Dpr(Vec.Sub(p.point, center), normal) - Vec.Dpr(Vec.Sub(q.point, center), normal)
	)

	// [11]
	const neighbours = new Map<TLShapeId, ZipTieBinding[]>()
	for (const { arrowId, segment } of sorted) {
		const ties = getZipArrowRoute(editor, arrowId)?.ties
		for (const binding of [ties?.[segment - 1], ties?.[segment]]) {
			if (!binding) continue
			neighbours.set(binding.toId, [...(neighbours.get(binding.toId) ?? []), binding])
		}
	}
	const shared = [...neighbours.values()].sort((p, q) => q.length - p.length)[0] ?? []
	if (shared.length > 1) {
		const tieId = shared[0].toId
		const tieTransform = editor.getShapePageTransform(tieId)
		const tieCenter = tieTransform.applyToPoint({ x: 0, y: 0 })
		const tieTangent = Vec.Sub(tieTransform.applyToPoint({ x: 1, y: 0 }), tieCenter)
		const towardsNewTie = Vec.Sub(center, tieCenter)
		const flip =
			(Math.sign(Vec.Dpr(tieTangent, towardsNewTie)) || 1) *
			(Math.sign(Vec.Dpr(tangent, towardsNewTie)) || 1)
		const offsets = getZipTieLayout(editor, tieId).offsets
		const keys = new Map(shared.map((b) => [b.fromId, (offsets.get(b.id) ?? 0) * flip]))

		const slots = sorted.flatMap((hit, i) => (keys.has(hit.arrowId) ? [i] : []))
		const reordered = slots
			.map((i) => sorted[i])
			.sort((p, q) => keys.get(p.arrowId)! - keys.get(q.arrowId)!)
		slots.forEach((slot, i) => (sorted[slot] = reordered[i]))
	}

	const lanes = getIndicesBetween(null, null, sorted.length)
	const orders = sorted.map(({ arrowId, segment }) => {
		const ties = getZipArrowRoute(editor, arrowId)?.ties
		return getOrderBetween(ties?.[segment - 1]?.props.order, ties?.[segment]?.props.order)
	})

	const tieId = createShapeId()
	editor.run(() => {
		editor.createShape<ZipTieShape>({
			id: tieId,
			type: ZIP_TIE,
			x: center.x,
			y: center.y,
			rotation: Math.atan2(tangent.y, tangent.x),
			// Otherwise the tie would pick up whichever color was last used for drawing.
			props: { color: 'blue' },
		})
		editor.createBindings<ZipTieBinding>(
			sorted.map(({ arrowId }, i) => ({
				type: ZIP_TIE,
				fromId: arrowId,
				toId: tieId,
				props: { lane: lanes[i], order: orders[i] },
			}))
		)
	})
}

/*
[1]
A zip tie binding goes from an arrow to a tie shape. An arrow can have any number of these and a
tie can have any number of arrows. `lane` orders the arrows side by side within the tie, and
`order` orders the ties along the arrow. Both are fractional index keys, so a new tie can be
slotted between two existing ones without renumbering anything.

[2]
Arrows sit side by side in a tie, centered on its middle and spaced along its local y axis. Every tie holding the same arrows in the same order gets the same
offsets, which is what lets the bundle between two ties run parallel.

[3]
Between two ties, every arrow is an offset copy of one shared "spine" curve through the tie
centers. Offsetting a cubic's end points sideways isn't enough on its own: on a bend, the inside
lane has to be shorter than the outside lane. Scaling each control arm by (1 - curvature * offset)
does that, and gives exactly concentric curves for circular bends, so the lanes stay evenly spaced
through the whole bend instead of pinching together or splaying apart.

[4]
From a terminal into the first tie (and out of the last one), the arrow is a quadratic curve
(written as a cubic) that arrives along the tie's direction. It leaves its bound shape pointing
at the curve's control point, so the bend happens in open space rather than at the tie.

[5]
Like tldraw's own arrows, a bound terminal starts at the anchor inside the target shape and is
clipped where the curve crosses the shape's outline. We walk backwards from the tie so the
crossing nearest the tie wins. If there's an arrowhead, we then pull back from the outline by the
same gap tldraw's arrows use.

[6]
A tie has no "forwards", so each arrow decides which way it travels through each tie. It looks at
the neighbouring ties rather than its own start and end, so every arrow in a bundle agrees, even
where some of them leave the bundle. Two arrows going opposite ways through the same pair of ties
end up on the same spine curve, just traversed in opposite directions.

[7]
The route depends on the arrow, its bindings, its bound shapes, and every tie it passes through.
A store computed cache tracks all of those reads, so the route is only recomputed when one of
them changes, and the geometry, component, and indicator all share it.

[8]
These match tldraw's arrowheads. They measure back along the curve rather than along a straight
line, so the arrowhead follows the bend into the tip.

[9]
To find what the cut crosses, we flatten each arrow's body into a polyline and intersect it with
the cut segment. For an arrow that's already tied we also note which route segment was cut, so we
know which two existing ties the new one goes between.

[10]
The tie's direction is the average direction of the arrows it crosses, flipping any that travel
the other way. Arrows are given lanes in the order they cross the tie, so nothing gets twisted.

[11]
Arrows can cross each other between two ties, so the order they cross the cut isn't always the
order they're already in. If several of the arrows pass through a neighbouring tie, the new tie
keeps that tie's order for them. Lanes are compared by which side of the direction of travel
they're on, so it still works if the ties face opposite ways or the bundle bends back on itself.
Otherwise the lanes would swap over between the ties and the bundle wouldn't be parallel.
*/

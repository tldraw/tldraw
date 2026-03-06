import {
	Editor,
	Mat,
	TLArrowShape,
	TLShape,
	TLShapeId,
	Vec,
	centerOfCircleFromThreePoints,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	isPageId,
} from '@tldraw/editor'
import { getArrowInfo } from '../../shapes/arrow/getArrowInfo'
import { getArrowBindings } from '../../shapes/arrow/shared'

/** @public */
export interface RerouteArrowsOptions {
	/**
	 * The shape IDs to process. Defaults to all direct children of the current page (not inside
	 * frames or groups). Only straight and arc arrows (`kind !== 'elbow'`) are rerouted — elbow
	 * arrows have their own automatic routing and are always skipped.
	 *
	 * Non-arrow shapes in the set are used as obstacles. The two endpoint shapes of each arrow
	 * are always excluded from that arrow's obstacle list.
	 */
	shapeIds?: TLShapeId[]
	/**
	 * Minimum clearance (in page units) to maintain between an arrow path and obstacle shapes.
	 * The obstacle AABB is expanded by this amount on all sides before checking for intersections.
	 * Default is 4.
	 */
	clearance?: number
	/**
	 * Bend values (in page units) to evaluate when searching for a collision-free route.
	 * The candidate with the lowest total penetration score is selected. Ties are broken by
	 * preferring the smallest absolute bend value (least visual distortion).
	 *
	 * Default tries straight (0) and symmetric positive/negative curves up to ±200.
	 */
	bendCandidates?: number[]
}

const DEFAULT_BEND_CANDIDATES = [0, 25, -25, 50, -50, 75, -75, 100, -100, 150, -150, 200, -200]
const ARC_SAMPLE_COUNT = 30
// matches MIN_ARROW_BEND in shapes/arrow/shared.ts
const MIN_ARROW_BEND = 8

type ObstacleBox = { id: TLShapeId; minX: number; maxX: number; minY: number; maxY: number }

/**
 * Adjusts the curvature (`bend`) of straight and arc arrows so their paths avoid non-endpoint
 * shapes. For each arrow that passes through a bystander shape, a set of candidate bend values is
 * evaluated and the one with the lowest total penetration into obstacles is applied.
 *
 * Deeper penetration scores worse than a shallow corner clip. Elbow arrows are always skipped.
 *
 * Should be called after {@link resolveShapeOverlaps}. Use {@link cleanupCanvas} to run all three
 * passes in order as a single undo step.
 *
 * @public
 */
export function rerouteArrows(editor: Editor, opts: RerouteArrowsOptions = {}) {
	const { clearance = 4 } = opts
	const bendCandidates = opts.bendCandidates ?? DEFAULT_BEND_CANDIDATES

	const sourceShapes = opts.shapeIds
		? opts.shapeIds.map((id) => editor.getShape(id)).filter((s): s is TLShape => !!s)
		: editor.getCurrentPageShapes().filter((s) => isPageId(s.parentId))

	const arrows = sourceShapes.filter(
		(s): s is TLArrowShape => s.type === 'arrow' && s.props.kind !== 'elbow'
	)

	if (arrows.length === 0) return

	const obstacles: ObstacleBox[] = sourceShapes.flatMap((s) => {
		if (s.type === 'arrow') return []
		const b = editor.getShapePageBounds(s)
		if (!b) return []
		return [
			{
				id: s.id,
				minX: b.minX - clearance,
				maxX: b.maxX + clearance,
				minY: b.minY - clearance,
				maxY: b.maxY + clearance,
			},
		]
	})

	if (obstacles.length === 0) return

	const updates: TLShape[] = []

	for (const arrow of arrows) {
		const info = getArrowInfo(editor, arrow)
		if (!info || !info.isValid) continue

		const bindings = getArrowBindings(editor, arrow)
		const endpointIds = new Set<TLShapeId>(
			[bindings.start?.toId, bindings.end?.toId].filter((id): id is TLShapeId => id != null)
		)

		const relevantObstacles = obstacles.filter((o) => !endpointIds.has(o.id))
		if (relevantObstacles.length === 0) continue

		const arrowPageTransform = editor.getShapePageTransform(arrow)
		if (!arrowPageTransform) continue

		const startLocal = Vec.From(info.start.handle)
		const endLocal = Vec.From(info.end.handle)

		const currentScore = computeBendScore(
			startLocal,
			endLocal,
			arrow.props.bend,
			arrowPageTransform,
			relevantObstacles
		)

		if (currentScore === 0) continue

		let bestBend = arrow.props.bend
		let bestScore = currentScore

		for (const candidate of bendCandidates) {
			const score = computeBendScore(
				startLocal,
				endLocal,
				candidate,
				arrowPageTransform,
				relevantObstacles
			)
			if (score < bestScore) {
				bestBend = candidate
				bestScore = score
			} else if (
				score === bestScore &&
				bestScore < currentScore &&
				Math.abs(candidate) < Math.abs(bestBend)
			) {
				bestBend = candidate
			}
		}

		if (bestBend !== arrow.props.bend) {
			updates.push({ ...arrow, props: { ...arrow.props, bend: bestBend } })
		}
	}

	if (updates.length === 0) return
	editor.run(() => editor.updateShapes(updates))
}

function sampleArcInArrowSpace(startLocal: Vec, endLocal: Vec, bend: number): Vec[] {
	const points: Vec[] = []

	if (Math.abs(bend) < MIN_ARROW_BEND) {
		for (let i = 0; i <= ARC_SAMPLE_COUNT; i++) {
			const t = i / ARC_SAMPLE_COUNT
			points.push(
				new Vec(
					startLocal.x + (endLocal.x - startLocal.x) * t,
					startLocal.y + (endLocal.y - startLocal.y) * t
				)
			)
		}
		return points
	}

	// matches curved-arrow.ts middle-point formula
	const med = Vec.Med(startLocal, endLocal)
	const dist = Vec.Sub(endLocal, startLocal)
	const u = Vec.Len(dist) ? dist.uni() : new Vec(1, 0)
	const middle = Vec.Add(med, u.per().mul(-bend))

	const center = centerOfCircleFromThreePoints(startLocal, endLocal, middle)
	if (!center || !isFinite(center.x) || !isFinite(center.y)) {
		for (let i = 0; i <= ARC_SAMPLE_COUNT; i++) {
			const t = i / ARC_SAMPLE_COUNT
			points.push(
				new Vec(
					startLocal.x + (endLocal.x - startLocal.x) * t,
					startLocal.y + (endLocal.y - startLocal.y) * t
				)
			)
		}
		return points
	}

	const radius = Vec.Dist(center, startLocal)
	const isClockwise = bend < 0
	const startAngle = Vec.Angle(center, startLocal)
	const endAngle = Vec.Angle(center, endLocal)
	const arcSpan = isClockwise
		? clockwiseAngleDist(startAngle, endAngle)
		: counterClockwiseAngleDist(startAngle, endAngle)
	const dirSign = isClockwise ? 1 : -1

	for (let i = 0; i <= ARC_SAMPLE_COUNT; i++) {
		const t = i / ARC_SAMPLE_COUNT
		const angle = startAngle + arcSpan * t * dirSign
		points.push(Vec.Add(center, Vec.FromAngle(angle).mul(radius)))
	}

	return points
}

function computeBendScore(
	startLocal: Vec,
	endLocal: Vec,
	bend: number,
	pageTransform: Mat,
	obstacles: ObstacleBox[]
): number {
	const localPoints = sampleArcInArrowSpace(startLocal, endLocal, bend)
	let score = 0
	for (const localPt of localPoints) {
		const pt = Mat.applyToPoint(pageTransform, localPt)
		for (const obs of obstacles) {
			if (pt.x < obs.minX || pt.x > obs.maxX || pt.y < obs.minY || pt.y > obs.maxY) continue
			const dx = Math.min(pt.x - obs.minX, obs.maxX - pt.x)
			const dy = Math.min(pt.y - obs.minY, obs.maxY - pt.y)
			score += Math.min(dx, dy)
		}
	}
	return score
}

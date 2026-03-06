import {
	Editor,
	Mat,
	TLArrowShape,
	TLGeoShape,
	TLShape,
	TLShapeId,
	TLTextShape,
	Vec,
	centerOfCircleFromThreePoints,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	isPageId,
} from '@tldraw/editor'
import { getArrowInfo } from '../../shapes/arrow/getArrowInfo'
import { getArrowBindings } from '../../shapes/arrow/shared'
import {
	ARROW_LABEL_FONT_SIZES,
	FONT_FAMILIES,
	FONT_SIZES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	TEXT_PROPS,
} from '../../shapes/shared/default-shape-constants'
import { isEmptyRichText, renderHtmlFromRichTextForMeasurement } from '../text/richText'

// Matches the fixed margin used in arrowLabel.ts for straight/arc arrows (literal 64 in the
// non-elbow branch). For elbow arrows the margin is computed dynamically from arrowhead offsets
// and can exceed 64; we use 64 as a conservative lower bound for both arrow types.
// See: packages/tldraw/src/lib/shapes/arrow/arrowLabel.ts
const ARROW_LABEL_BODY_MARGIN = 64

// ---- resolveTextWordWrap ----

/** @public */
export interface ResolveTextWordWrapOptions {
	/**
	 * The shape IDs to process. Defaults to all direct children of the current page (not inside
	 * frames or groups), matching the default behaviour of {@link resolveShapeOverlaps}.
	 *
	 * When provided, arrow label fixes will only move endpoint shapes that are also in this list —
	 * arrows whose endpoints are outside the list are skipped entirely. Shapes inside containers
	 * will be moved independently of their parent; pass the container ID instead if you want the
	 * container to move with its children.
	 */
	shapeIds?: TLShapeId[]
}

/**
 * Resizes or repositions shapes so that no single word is split across multiple lines by the
 * browser's overflow-wrap algorithm. This is useful for programmatically generated canvases
 * (e.g. mermaid diagrams) where shapes may have been created with insufficient width.
 *
 * Handles three cases:
 * - **Geo shapes** (rectangle, ellipse, etc.): expands `w` until all words fit on their own line.
 * - **Fixed-width text shapes** (`autoSize: false`): expands `w` similarly.
 * - **Bound arrow labels**: moves the two connected shapes apart along the arrow direction until
 *   the arrow body is long enough to display the label without mid-word breaks. Arrows with only
 *   one terminal bound to a shape are skipped.
 *
 * Auto-sizing text shapes and note shapes manage their own sizing and are skipped.
 *
 * Should be called **before** {@link resolveShapeOverlaps} so that any size changes are already
 * applied when the overlap pass computes bounds. Use {@link cleanupCanvas} to run all three
 * cleanup passes in the correct order as a single undo step.
 *
 * @param editor - The editor instance.
 * @param opts - Options.
 * @public
 */
export function resolveTextWordWrap(editor: Editor, opts: ResolveTextWordWrapOptions = {}) {
	const shapes = opts.shapeIds
		? opts.shapeIds.map((id) => editor.getShape(id)).filter((s): s is TLShape => !!s)
		: editor.getCurrentPageShapes().filter((s) => isPageId(s.parentId))

	// When shapeIds is explicitly provided, arrow endpoint shapes are only moved if they are also
	// in the list. This prevents arrows from silently displacing shapes the caller didn't intend
	// to modify. When shapeIds is not provided (null), all endpoint shapes are in scope.
	const scopeIds = opts.shapeIds ? new Set(opts.shapeIds) : null

	// First pass: collect geo and text shape resize updates. These can be computed without
	// touching the store, so we do it before editor.run() to avoid creating a history entry
	// when there is nothing to fix.
	const shapeUpdates: TLShape[] = []
	for (const shape of shapes) {
		if (shape.type === 'geo') {
			const result = getGeoShapeWordWrapFix(editor, shape as TLGeoShape)
			if (result) shapeUpdates.push(result)
		} else if (shape.type === 'text') {
			const result = getTextShapeWordWrapFix(editor, shape as TLTextShape)
			if (result) shapeUpdates.push(result)
		}
	}

	// Pre-filter to labeled arrows only, so we can skip editor.run() entirely when there is
	// nothing to do. The arrow pass itself runs inside editor.run() because it needs fresh
	// bounds after the geo/text resizes have been applied.
	const labeledArrows = shapes.filter(
		(s): s is TLArrowShape =>
			s.type === 'arrow' && !isEmptyRichText((s as TLArrowShape).props.richText)
	)

	if (shapeUpdates.length === 0 && labeledArrows.length === 0) return

	editor.run(() => {
		// Apply geo/text resizes first so that arrow body-length calculations use up-to-date bounds.
		if (shapeUpdates.length > 0) {
			editor.updateShapes(shapeUpdates)
		}

		// Second pass: move bound shapes apart for arrows whose labels need more space.
		// We collect all deltas first to handle the case where a shape is an endpoint for multiple
		// arrows — each arrow's contribution is added together.
		const positionDeltas = new Map<TLShapeId, { x: number; y: number }>()
		for (const arrow of labeledArrows) {
			collectArrowLabelFix(editor, arrow, positionDeltas, scopeIds)
		}

		if (positionDeltas.size > 0) {
			const positionUpdates: TLShape[] = []
			for (const [id, delta] of positionDeltas) {
				if (Math.abs(delta.x) < 0.01 && Math.abs(delta.y) < 0.01) continue
				const shape = editor.getShape(id)
				if (!shape) continue
				const pageTransform = editor.getShapePageTransform(shape)
				if (!pageTransform) continue
				const pageOrigin = pageTransform.point()
				const newPageOrigin = { x: pageOrigin.x + delta.x, y: pageOrigin.y + delta.y }
				const parentTransform = editor.getShapeParentTransform(shape)
				const newLocalOrigin = Mat.applyToPoint(Mat.Inverse(parentTransform), newPageOrigin)
				positionUpdates.push({ ...shape, x: newLocalOrigin.x, y: newLocalOrigin.y })
			}
			if (positionUpdates.length > 0) {
				editor.updateShapes(positionUpdates)
			}
		}
	})
}

function getGeoShapeWordWrapFix(editor: Editor, shape: TLGeoShape): TLGeoShape | null {
	if (isEmptyRichText(shape.props.richText)) return null

	const { w, font, size, scale } = shape.props
	// Measure in unscaled space (consistent with measureUnscaledLabelSize in GeoShapeUtil)
	const textAreaWidth = Math.max(1, Math.floor(w / scale - LABEL_PADDING * 2))
	const html = renderHtmlFromRichTextForMeasurement(editor, shape.props.richText)

	const measured = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: LABEL_FONT_SIZES[size],
		maxWidth: textAreaWidth,
		disableOverflowWrapBreaking: true,
		measureScrollWidth: true,
	})

	// scrollWidth > textAreaWidth means at least one word overflows (i.e. would be broken by
	// overflow-wrap: break-word). The +1 guards against sub-pixel rounding.
	if (measured.scrollWidth <= textAreaWidth + 1) return null

	// Re-scale when writing back to the shape prop, which is in scaled units.
	// +1 guards against sub-pixel rounding causing the word to wrap again immediately.
	const newW = (measured.scrollWidth + 1 + LABEL_PADDING * 2) * scale
	// Expand symmetrically around the shape's current center so that connected arrows
	// don't need to reroute as aggressively and the overall layout is better preserved.
	const deltaW = newW - w
	return {
		...shape,
		x: shape.x - deltaW / 2,
		props: { ...shape.props, w: newW },
	}
}

function getTextShapeWordWrapFix(editor: Editor, shape: TLTextShape): TLTextShape | null {
	// Auto-sizing shapes already compute their own width to fit content
	if (shape.props.autoSize) return null

	const { font, size, w } = shape.props
	// Math.max(16, ...) matches the minWidth constant in TextShapeUtil.getTextSize
	const currentWidth = Math.max(16, Math.floor(w))
	const html = renderHtmlFromRichTextForMeasurement(editor, shape.props.richText)

	const measured = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: FONT_SIZES[size],
		maxWidth: currentWidth,
		disableOverflowWrapBreaking: true,
		measureScrollWidth: true,
	})

	if (measured.scrollWidth <= currentWidth + 1) return null

	// +1 matches the auto-size logic in TextShapeUtil to prevent immediate re-wrap at the boundary.
	// Expand symmetrically around the center, consistent with getGeoShapeWordWrapFix.
	// Use the original `w` (not `currentWidth`) as the base so the x offset correctly preserves
	// the shape's center even when Math.floor(w) != w.
	const newW = measured.scrollWidth + 1
	const deltaW = newW - w
	return {
		...shape,
		x: shape.x - deltaW / 2,
		props: { ...shape.props, w: newW },
	}
}

function collectArrowLabelFix(
	editor: Editor,
	arrow: TLArrowShape,
	positionDeltas: Map<TLShapeId, { x: number; y: number }>,
	scopeIds: Set<TLShapeId> | null
) {
	const bindings = getArrowBindings(editor, arrow)
	// Only handle arrows with both terminals bound to distinct shapes
	if (!bindings.start || !bindings.end) return
	if (bindings.start.toId === bindings.end.toId) return // self-loop

	// If a scope is set, only adjust arrows whose endpoint shapes are both explicitly in scope.
	// This prevents arrows from silently displacing shapes the caller didn't intend to modify.
	if (scopeIds && (!scopeIds.has(bindings.start.toId) || !scopeIds.has(bindings.end.toId))) return

	const shapeA = editor.getShape(bindings.start.toId)
	const shapeB = editor.getShape(bindings.end.toId)
	if (!shapeA || !shapeB) return

	const boundsA = editor.getShapePageBounds(shapeA)
	const boundsB = editor.getShapePageBounds(shapeB)
	if (!boundsA || !boundsB) return

	// Measure the widest single word by forcing all words to separate lines (maxWidth: 1).
	// With overflow-wrap: normal, each word goes to its own line and scrollWidth is the widest.
	// fontSize is already scaled (ARROW_LABEL_FONT_SIZES * scale, matching ArrowShapeUtil rendering)
	const fontSize = ARROW_LABEL_FONT_SIZES[arrow.props.size] * arrow.props.scale
	const html = renderHtmlFromRichTextForMeasurement(editor, arrow.props.richText)
	const { scrollWidth: widestWordWidth } = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[arrow.props.font],
		fontSize,
		maxWidth: 1,
		disableOverflowWrapBreaking: true,
		measureScrollWidth: true,
	})

	// The minimum arrow body length to accommodate the label without breaking any word.
	// ARROW_LABEL_BODY_MARGIN matches the margin constant from arrowLabel.ts (exact for
	// straight/arc arrows; approximate for elbow arrows).
	const requiredBodyLength = widestWordWidth + ARROW_LABEL_BODY_MARGIN

	// Approximate the current arrow body length by projecting the two shapes' page-bounds corners
	// onto the arrow direction. This gives the edge-to-edge gap in that direction.
	const cAx = boundsA.x + boundsA.w / 2
	const cAy = boundsA.y + boundsA.h / 2
	const cBx = boundsB.x + boundsB.w / 2
	const cBy = boundsB.y + boundsB.h / 2
	const ddx = cBx - cAx
	const ddy = cBy - cAy
	const dist = Math.sqrt(ddx * ddx + ddy * ddy)
	if (dist < 1) return // coincident shapes — cannot determine direction

	const dirX = ddx / dist
	const dirY = ddy / dist

	const aMaxProj = Math.max(...boundsA.corners.map((c) => c.x * dirX + c.y * dirY))
	const bMinProj = Math.min(...boundsB.corners.map((c) => c.x * dirX + c.y * dirY))
	const currentBodyLength = Math.max(0, bMinProj - aMaxProj)

	if (currentBodyLength >= requiredBodyLength) return

	// Move A and B apart along the arrow direction so the body reaches the required length.
	// Deltas are accumulated as vectors: if a shape is shared between multiple arrows, each
	// arrow's contribution is added together.
	const halfExtra = (requiredBodyLength - currentBodyLength) / 2
	const da = positionDeltas.get(shapeA.id) ?? { x: 0, y: 0 }
	const db = positionDeltas.get(shapeB.id) ?? { x: 0, y: 0 }
	da.x -= dirX * halfExtra
	da.y -= dirY * halfExtra
	db.x += dirX * halfExtra
	db.y += dirY * halfExtra
	positionDeltas.set(shapeA.id, da)
	positionDeltas.set(shapeB.id, db)
}

// ---- resolveShapeOverlaps ----

/** @public */
export interface ResolveShapeOverlapsOptions {
	/**
	 * The shape IDs to process. Arrow shapes are always excluded regardless of this option.
	 * Defaults to all direct children of the current page (not inside frames or groups), so that
	 * containers move as a unit carrying their contents with them.
	 *
	 * When provided, the top-level-only restriction is bypassed — the caller takes responsibility
	 * for parent/child relationships. Passing child shapes without their container will move those
	 * shapes independently of the container.
	 */
	shapeIds?: TLShapeId[]
	/**
	 * Minimum gap (in page units) to maintain between every pair of shapes. Default is 20.
	 */
	padding?: number
	/**
	 * Maximum number of separation iterations to run. Default is 50.
	 *
	 * Each iteration makes one pass over all pairs. The algorithm stops early once all pairs are
	 * separated by at least `padding` pixels (convergence threshold: 0.5px). For most
	 * mermaid-style layouts this converges in under 20 iterations. The limit guards against
	 * degenerate arrangements (e.g. many shapes perfectly stacked on top of each other) where
	 * convergence is slow.
	 */
	maxIterations?: number
}

/**
 * Separates overlapping shapes by translating them apart, maintaining at least `padding` units of
 * space between each pair. Useful for cleaning up programmatically generated canvases.
 *
 * Arrow shapes are always excluded — they reroute automatically as their bound shapes move.
 *
 * **Default behaviour (no `shapeIds`):** only direct children of the current page are processed,
 * so frames and groups move as a unit and carry their contents with them.
 *
 * **Rotation caveat:** overlap detection uses axis-aligned bounding boxes (AABBs). For rotated
 * shapes the AABB is larger than the actual shape, which can cause unnecessary separation. This is
 * acceptable for typical mermaid diagrams where shapes are unrotated.
 *
 * **Performance:** O(n² × maxIterations). Suitable for diagrams up to a few hundred nodes.
 *
 * @param editor - The editor instance.
 * @param opts - Options.
 * @public
 */
export function resolveShapeOverlaps(editor: Editor, opts: ResolveShapeOverlapsOptions = {}) {
	const { padding = 20, maxIterations = 50 } = opts

	// Arrows are excluded in both paths — they reroute automatically.
	const shapes: TLShape[] = opts.shapeIds
		? opts.shapeIds
				.map((id) => editor.getShape(id))
				.filter((s): s is TLShape => s != null && s.type !== 'arrow')
		: editor.getCurrentPageShapes().filter((s) => isPageId(s.parentId) && s.type !== 'arrow')

	if (shapes.length < 2) return

	const entries = shapes
		.map((shape) => {
			const pageBounds = editor.getShapePageBounds(shape)
			const pageTransform = editor.getShapePageTransform(shape)
			if (!pageBounds || !pageTransform) return null
			const area = pageBounds.w * pageBounds.h
			return {
				shape,
				pageBounds: pageBounds.clone(),
				// The shape's origin point in page space. May differ from pageBounds.x/y for rotated
				// shapes: pageBounds is the AABB while pageOrigin is the shape's transform origin.
				pageOrigin: pageTransform.point(),
				area,
			}
		})
		.filter((e): e is NonNullable<typeof e> => e != null)

	if (entries.length < 2) return

	// Sort by ID for deterministic pair ordering, regardless of creation order.
	entries.sort((a, b) => (a.shape.id < b.shape.id ? -1 : 1))

	// Track cumulative page-space translation deltas for each shape.
	const deltas = new Map(entries.map((e) => [e.shape.id, { x: 0, y: 0 }]))

	for (let iter = 0; iter < maxIterations; iter++) {
		let maxSep = 0

		for (let i = 0; i < entries.length; i++) {
			for (let j = i + 1; j < entries.length; j++) {
				const a = entries[i]
				const b = entries[j]
				const da = deltas.get(a.shape.id)!
				const db = deltas.get(b.shape.id)!

				// Current center positions (accounting for accumulated deltas)
				const cAx = a.pageBounds.x + da.x + a.pageBounds.w / 2
				const cAy = a.pageBounds.y + da.y + a.pageBounds.h / 2
				const cBx = b.pageBounds.x + db.x + b.pageBounds.w / 2
				const cBy = b.pageBounds.y + db.y + b.pageBounds.h / 2

				const ddx = cBx - cAx
				const ddy = cBy - cAy
				const dist = Math.sqrt(ddx * ddx + ddy * ddy)

				// Separation direction: from center A toward center B.
				// If centers coincide, push horizontally (arbitrary but deterministic).
				const dirX = dist < 1 ? 1 : ddx / dist
				const dirY = dist < 1 ? 0 : ddy / dist

				// Project each AABB's half-extents onto the separation direction.
				// The sum of the two support values gives the minimum center-to-center distance
				// required to avoid overlap, plus the required padding gap.
				const supportA =
					Math.abs((a.pageBounds.w / 2) * dirX) + Math.abs((a.pageBounds.h / 2) * dirY)
				const supportB =
					Math.abs((b.pageBounds.w / 2) * dirX) + Math.abs((b.pageBounds.h / 2) * dirY)
				const sep = supportA + supportB + padding - dist

				if (sep <= 0) continue

				// Area-weighted displacement: larger shapes move less.
				// A shape with twice the area of its partner moves half as far.
				const totalArea = a.area + b.area
				const wA = totalArea > 0 ? b.area / totalArea : 0.5
				const wB = totalArea > 0 ? a.area / totalArea : 0.5

				da.x -= dirX * sep * wA
				da.y -= dirY * sep * wA
				db.x += dirX * sep * wB
				db.y += dirY * sep * wB

				if (sep > maxSep) maxSep = sep
			}
		}

		// Converged: no pair needed more than half a pixel of separation.
		if (maxSep < 0.5) break
	}

	// Convert page-space deltas back to parent-local coordinates and apply in one batch.
	const updates: TLShape[] = []
	for (const entry of entries) {
		const d = deltas.get(entry.shape.id)!
		// Skip shapes that moved less than a pixel — floating-point accumulation in the iterative
		// loop means the delta is rarely exactly zero even for shapes that barely moved.
		if (Math.abs(d.x) < 0.01 && Math.abs(d.y) < 0.01) continue

		const newPageOrigin = { x: entry.pageOrigin.x + d.x, y: entry.pageOrigin.y + d.y }
		const parentTransform = editor.getShapeParentTransform(entry.shape)
		const newLocalOrigin = Mat.applyToPoint(Mat.Inverse(parentTransform), newPageOrigin)

		updates.push({ ...entry.shape, x: newLocalOrigin.x, y: newLocalOrigin.y })
	}

	if (updates.length === 0) return
	editor.run(() => editor.updateShapes(updates))
}

// ---- rerouteArrows ----

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
	 * Candidates are tried in order; the one with the lowest total penetration score is selected.
	 * If none achieves zero penetration, the candidate with the smallest total penetration is used.
	 * Ties are broken by preferring the smallest absolute bend value (least visual distortion).
	 *
	 * Default tries straight (0) and symmetric positive/negative curves up to ±200.
	 */
	bendCandidates?: number[]
}

// Default bend candidates: try straight first, then progressively larger curves in both directions.
const DEFAULT_BEND_CANDIDATES = [0, 25, -25, 50, -50, 75, -75, 100, -100, 150, -150, 200, -200]

// Number of points sampled along each candidate arc for penetration scoring.
// 30 points gives sub-10px resolution for arcs spanning a few hundred pixels.
const ARC_SAMPLE_COUNT = 30

// Matches MIN_ARROW_BEND in packages/tldraw/src/lib/shapes/arrow/shared.ts.
// tldraw snaps |bend| below this threshold to a straight line, so we must use the same
// threshold when deciding whether to sample a segment or an arc.
const MIN_ARROW_BEND = 8

// An AABB expanded by clearance used to test arrow path intersections.
type ObstacleBox = { id: TLShapeId; minX: number; maxX: number; minY: number; maxY: number }

/**
 * Adjusts the curvature (`bend`) of straight and arc arrows so their paths avoid non-endpoint
 * shapes. For each arrow that currently passes through a bystander shape, a set of candidate bend
 * values is evaluated and the one with the lowest total penetration into obstacles is applied.
 *
 * The scoring penalises deeper penetration more heavily than a shallow corner clip — going through
 * the centre of one shape scores worse than clipping the corners of two shapes.
 *
 * Elbow arrows (`kind === 'elbow'`) are always skipped: they have their own automatic routing.
 *
 * Should be called **after** {@link resolveShapeOverlaps} so that arrow paths are evaluated
 * against final shape positions. Use {@link cleanupCanvas} to run all three passes in order as
 * a single undo step.
 *
 * @param editor - The editor instance.
 * @param opts - Options.
 * @public
 */
export function rerouteArrows(editor: Editor, opts: RerouteArrowsOptions = {}) {
	const { clearance = 4 } = opts
	const bendCandidates = opts.bendCandidates ?? DEFAULT_BEND_CANDIDATES

	const sourceShapes = opts.shapeIds
		? opts.shapeIds.map((id) => editor.getShape(id)).filter((s): s is TLShape => !!s)
		: editor.getCurrentPageShapes().filter((s) => isPageId(s.parentId))

	// Only straight/arc arrows — elbow arrows route automatically.
	const arrows = sourceShapes.filter(
		(s): s is TLArrowShape => s.type === 'arrow' && s.props.kind !== 'elbow'
	)

	if (arrows.length === 0) return

	// Non-arrow shapes in scope are obstacles.
	// Expand each AABB by clearance so the arrow path stays visually clear of the shape edge.
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

		// The two endpoint shapes are not obstacles for this arrow.
		const endpointIds = new Set<TLShapeId>(
			[bindings.start?.toId, bindings.end?.toId].filter((id): id is TLShapeId => id != null)
		)

		const relevantObstacles = obstacles.filter((o) => !endpointIds.has(o.id))
		if (relevantObstacles.length === 0) continue

		const arrowPageTransform = editor.getShapePageTransform(arrow)
		if (!arrowPageTransform) continue

		// Terminal handle positions in arrow-local space. These are fixed regardless of bend —
		// they're the normalised anchor points on the bound shapes, not the rendered endpoints.
		const startLocal = Vec.From(info.start.handle)
		const endLocal = Vec.From(info.end.handle)

		const currentScore = computeBendScore(
			startLocal,
			endLocal,
			arrow.props.bend,
			arrowPageTransform,
			relevantObstacles
		)

		if (currentScore === 0) continue // already clear

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
				// Among equally-good candidates that beat the current, prefer the smallest bend.
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

/**
 * Sample points along an arc in arrow-local space for a given bend value.
 * Uses the same middle-point formula as curved-arrow.ts so the sampled path matches
 * what tldraw will actually render.
 */
function sampleArcInArrowSpace(startLocal: Vec, endLocal: Vec, bend: number): Vec[] {
	const points: Vec[] = []

	if (Math.abs(bend) < MIN_ARROW_BEND) {
		// tldraw snaps |bend| below MIN_ARROW_BEND to a straight line; match that behaviour here.
		// Treat as straight: sample uniformly along the segment.
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

	// Compute the middle control point (matches curved-arrow.ts:49).
	const med = Vec.Med(startLocal, endLocal)
	const dist = Vec.Sub(endLocal, startLocal)
	const u = Vec.Len(dist) ? dist.uni() : new Vec(1, 0)
	const middle = Vec.Add(med, u.per().mul(-bend))

	// Fit a circle through start, middle, end.
	const center = centerOfCircleFromThreePoints(startLocal, endLocal, middle)
	if (!center || !isFinite(center.x) || !isFinite(center.y)) {
		// Degenerate geometry: fall back to straight line.
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
	// Arc span is always positive; direction is controlled by dirSign.
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

/**
 * Score a candidate bend value by total penetration depth into obstacles.
 *
 * For each sample point on the arc that falls inside an obstacle's expanded AABB, the penetration
 * depth is `min(distance to nearest horizontal edge, distance to nearest vertical edge)`. Summing
 * across all samples and all obstacles means deeper passes score worse than shallow corner clips.
 */
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
			// Penetration depth: distance from the point to the nearest obstacle edge.
			const dx = Math.min(pt.x - obs.minX, obs.maxX - pt.x)
			const dy = Math.min(pt.y - obs.minY, obs.maxY - pt.y)
			score += Math.min(dx, dy)
		}
	}
	return score
}

// ---- cleanupCanvas ----

/** @public */
export interface CleanupCanvasOptions {
	/**
	 * The shape IDs to process. All three sub-functions default to direct children of the current
	 * page (not inside frames or groups), so the same set of shapes is covered by each pass.
	 * See {@link resolveTextWordWrap} and {@link resolveShapeOverlaps} for details on how an
	 * explicit list is interpreted by each function.
	 */
	shapeIds?: TLShapeId[]
	/**
	 * Minimum gap (in page units) to maintain between shapes during overlap resolution.
	 * Default is 20. See {@link resolveShapeOverlaps}.
	 */
	padding?: number
	/**
	 * Maximum number of overlap-separation iterations. Default is 50.
	 * See {@link resolveShapeOverlaps}.
	 */
	maxIterations?: number
	/**
	 * Minimum clearance (in page units) between arrow paths and obstacle shapes during arrow
	 * rerouting. Default is 4. See {@link rerouteArrows}.
	 */
	arrowClearance?: number
	/**
	 * Bend candidates to evaluate during arrow rerouting. See {@link rerouteArrows}.
	 */
	arrowBendCandidates?: number[]
}

/**
 * Runs {@link resolveTextWordWrap}, {@link resolveShapeOverlaps}, and {@link rerouteArrows} as a
 * single undoable operation. This is the recommended entry point for programmatic canvas cleanup
 * (e.g. after rendering a mermaid diagram).
 *
 * The passes run in order: word wrap first (so overlap resolution uses final shape sizes), then
 * overlap resolution (so arrow rerouting evaluates paths against final shape positions), then
 * arrow rerouting.
 *
 * @param editor - The editor instance.
 * @param opts - Options passed through to the sub-functions.
 * @public
 */
export function cleanupCanvas(editor: Editor, opts: CleanupCanvasOptions = {}) {
	// The outer editor.run() groups all three passes into a single undo step. We cannot guard
	// before calling it (to skip the batch when nothing needs doing) because we don't know what
	// the sub-functions will find until they run. This is safe: tldraw's history.batch only
	// records a history entry when store atoms are actually mutated, so an empty batch is a no-op.
	editor.run(() => {
		resolveTextWordWrap(editor, { shapeIds: opts.shapeIds })
		resolveShapeOverlaps(editor, {
			shapeIds: opts.shapeIds,
			padding: opts.padding,
			maxIterations: opts.maxIterations,
		})
		rerouteArrows(editor, {
			shapeIds: opts.shapeIds,
			clearance: opts.arrowClearance,
			bendCandidates: opts.arrowBendCandidates,
		})
	})
}

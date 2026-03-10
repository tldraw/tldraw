/**
 * Post-creation cleanup for programmatically generated diagrams.
 * Adapted from tldraw's experimental cleanup utilities (PR #8177).
 *
 * Resolves shape overlaps and basic text overflow after code→diagram conversion.
 */

import { Editor, Mat, TLShape, TLShapeId } from 'tldraw'

interface OverlapEntry {
	shape: TLShape
	pageBounds: { x: number; y: number; w: number; h: number }
	pageOrigin: { x: number; y: number }
	area: number
}

/**
 * Separate overlapping shapes by translating them apart, maintaining at least `padding` units
 * between each pair. Arrow shapes are excluded — they reroute automatically via bindings.
 *
 * Uses an iterative force-based approach: each overlapping pair is pushed apart proportional
 * to their relative sizes (smaller shapes move more).
 */
export function resolveShapeOverlaps(
	editor: Editor,
	shapeIds: TLShapeId[],
	opts: { padding?: number; maxIterations?: number } = {}
) {
	const { padding = 20, maxIterations = 50 } = opts

	const shapes = shapeIds
		.map((id) => editor.getShape(id))
		.filter((s): s is TLShape => s != null && s.type !== 'arrow')

	if (shapes.length < 2) return

	const entries: OverlapEntry[] = []
	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)
		const pageTransform = editor.getShapePageTransform(shape)
		if (!pageBounds || !pageTransform) continue
		const pt = pageTransform.point()
		entries.push({
			shape,
			pageBounds: { x: pageBounds.x, y: pageBounds.y, w: pageBounds.w, h: pageBounds.h },
			pageOrigin: { x: pt.x, y: pt.y },
			area: pageBounds.w * pageBounds.h,
		})
	}

	if (entries.length < 2) return

	// Stable sort order for deterministic results
	entries.sort((a, b) => (a.shape.id < b.shape.id ? -1 : 1))

	const deltas = new Map(entries.map((e) => [e.shape.id, { x: 0, y: 0 }]))

	for (let iter = 0; iter < maxIterations; iter++) {
		let maxSep = 0

		for (let i = 0; i < entries.length; i++) {
			for (let j = i + 1; j < entries.length; j++) {
				const a = entries[i]
				const b = entries[j]
				const da = deltas.get(a.shape.id)!
				const db = deltas.get(b.shape.id)!

				// Center positions including accumulated deltas
				const cAx = a.pageBounds.x + da.x + a.pageBounds.w / 2
				const cAy = a.pageBounds.y + da.y + a.pageBounds.h / 2
				const cBx = b.pageBounds.x + db.x + b.pageBounds.w / 2
				const cBy = b.pageBounds.y + db.y + b.pageBounds.h / 2

				const ddx = cBx - cAx
				const ddy = cBy - cAy
				const dist = Math.sqrt(ddx * ddx + ddy * ddy)

				// Direction from A to B (default to right if coincident)
				const dirX = dist < 1 ? 1 : ddx / dist
				const dirY = dist < 1 ? 0 : ddy / dist

				// Support distance: half-extent projected onto direction
				const supportA =
					Math.abs((a.pageBounds.w / 2) * dirX) + Math.abs((a.pageBounds.h / 2) * dirY)
				const supportB =
					Math.abs((b.pageBounds.w / 2) * dirX) + Math.abs((b.pageBounds.h / 2) * dirY)
				const sep = supportA + supportB + padding - dist

				if (sep <= 0) continue

				// Weight: larger shapes move less
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

		if (maxSep < 0.5) break
	}

	const updates: TLShape[] = []
	for (const entry of entries) {
		const d = deltas.get(entry.shape.id)!
		if (Math.abs(d.x) < 0.01 && Math.abs(d.y) < 0.01) continue

		const newPageOrigin = { x: entry.pageOrigin.x + d.x, y: entry.pageOrigin.y + d.y }
		const parentTransform = editor.getShapeParentTransform(entry.shape)
		const newLocalOrigin = Mat.applyToPoint(Mat.Inverse(parentTransform), newPageOrigin)

		updates.push({ ...entry.shape, x: newLocalOrigin.x, y: newLocalOrigin.y })
	}

	if (updates.length === 0) return
	editor.run(() => editor.updateShapes(updates))
}

/**
 * Check if any shapes in the given set overlap each other (ignoring arrows).
 * Returns true if at least one pair of non-arrow shapes has overlapping bounding boxes.
 */
export function hasOverlaps(editor: Editor, shapeIds: TLShapeId[]): boolean {
	const bounds: { x: number; y: number; w: number; h: number }[] = []

	for (const id of shapeIds) {
		const shape = editor.getShape(id)
		if (!shape || shape.type === 'arrow') continue
		const b = editor.getShapePageBounds(shape)
		if (!b) continue
		bounds.push({ x: b.x, y: b.y, w: b.w, h: b.h })
	}

	for (let i = 0; i < bounds.length; i++) {
		for (let j = i + 1; j < bounds.length; j++) {
			const a = bounds[i]
			const b = bounds[j]
			if (
				a.x < b.x + b.w &&
				a.x + a.w > b.x &&
				a.y < b.y + b.h &&
				a.y + a.h > b.y
			) {
				return true
			}
		}
	}

	return false
}

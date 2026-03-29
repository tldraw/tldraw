import { Editor, Mat, TLShape, TLShapeId, isPageId } from '@tldraw/editor'

/** @public */
export interface ResolveShapeOverlapsOptions {
	/** The shape IDs to process. Arrows are always excluded. Defaults to direct children of the current page. */
	shapeIds?: TLShapeId[]
	/** Minimum gap (in page units) between shapes. Default is 20. */
	padding?: number
	/** Maximum number of separation iterations. Default is 50. */
	maxIterations?: number
}

/**
 * Separates overlapping shapes by translating them apart, maintaining at least `padding` units of
 * space between each pair.
 *
 * @public
 */
export function resolveShapeOverlaps(editor: Editor, opts: ResolveShapeOverlapsOptions = {}) {
	const { padding = 20, maxIterations = 50 } = opts

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
			return {
				shape,
				pageBounds: pageBounds.clone(),
				pageOrigin: pageTransform.point(),
				area: pageBounds.w * pageBounds.h,
			}
		})
		.filter((e): e is NonNullable<typeof e> => e != null)

	if (entries.length < 2) return

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

				const cAx = a.pageBounds.x + da.x + a.pageBounds.w / 2
				const cAy = a.pageBounds.y + da.y + a.pageBounds.h / 2
				const cBx = b.pageBounds.x + db.x + b.pageBounds.w / 2
				const cBy = b.pageBounds.y + db.y + b.pageBounds.h / 2

				const ddx = cBx - cAx
				const ddy = cBy - cAy
				const dist = Math.sqrt(ddx * ddx + ddy * ddy)

				const dirX = dist < 1 ? 1 : ddx / dist
				const dirY = dist < 1 ? 0 : ddy / dist

				const supportA =
					Math.abs((a.pageBounds.w / 2) * dirX) + Math.abs((a.pageBounds.h / 2) * dirY)
				const supportB =
					Math.abs((b.pageBounds.w / 2) * dirX) + Math.abs((b.pageBounds.h / 2) * dirY)
				const sep = supportA + supportB + padding - dist

				if (sep <= 0) continue

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

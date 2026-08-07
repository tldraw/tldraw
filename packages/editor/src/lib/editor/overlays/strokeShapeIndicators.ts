import { createComputedCache } from '@tldraw/store'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import type { Editor } from '../Editor'

const indicatorPathCache = createComputedCache(
	'shapeIndicatorPath',
	(editor: Editor, shape: TLShape) => {
		const util = editor.getShapeUtil(shape)
		return util.getIndicatorPath(shape)
	},
	{
		areRecordsEqual(a, b) {
			return a.props === b.props
		},
	}
)

/**
 * Combine every batchable shape indicator into a single page-space `Path2D` and
 * emit one stroke call. Shapes whose indicator needs an evenodd clip (e.g.
 * arrows with labels or complex arrowheads) can't be batched — they still
 * stroke individually inside a save/restore with `ctx.clip` applied.
 *
 * Shared by any overlay util that paints shape indicators (e.g. collaborator
 * selections).
 *
 * @public
 */
export function strokeShapeIndicators(
	editor: Editor,
	ctx: CanvasRenderingContext2D,
	shapeIds: TLShapeId[]
): void {
	if (shapeIds.length === 0) return

	const batched = new Path2D()

	for (const shapeId of shapeIds) {
		const shape = editor.getShape(shapeId)
		if (!shape || shape.isLocked) continue

		const pageTransform = editor.getShapePageTransform(shape)
		if (!pageTransform) continue

		const indicatorPath = indicatorPathCache.get(editor, shape.id)
		if (!indicatorPath) continue

		if (indicatorPath instanceof Path2D) {
			batched.addPath(indicatorPath, pageTransform)
			continue
		}

		const { path, clipPath, additionalPaths } = indicatorPath

		if (!clipPath) {
			batched.addPath(path, pageTransform)
			if (additionalPaths) {
				for (const p of additionalPaths) batched.addPath(p, pageTransform)
			}
			continue
		}

		// Clipped case: fall back to an individual stroke. Rare (arrows with
		// labels / complex arrowheads), so the extra save/restore/stroke
		// pair per such shape isn't worth batching away.
		ctx.save()
		ctx.transform(
			pageTransform.a,
			pageTransform.b,
			pageTransform.c,
			pageTransform.d,
			pageTransform.e,
			pageTransform.f
		)
		ctx.save()
		ctx.clip(clipPath, 'evenodd')
		ctx.stroke(path)
		ctx.restore()
		if (additionalPaths) {
			for (const p of additionalPaths) ctx.stroke(p)
		}
		ctx.restore()
	}

	ctx.stroke(batched)
}

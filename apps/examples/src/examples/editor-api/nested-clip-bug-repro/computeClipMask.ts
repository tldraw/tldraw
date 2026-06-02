/** Example copy — keep in sync with `packages/tldraw/src/test/helpers/nestedClipMask.ts`. */
import { Editor, Mat, TLShapeId, Vec, VecLike } from 'tldraw'

export type PolygonIntersectFn = (a: VecLike[], b: VecLike[]) => VecLike[] | null

/** Same steps as `Editor._getShapeMaskCache`, with a custom intersect implementation. */
export function computePageMask(
	editor: Editor,
	shapeId: TLShapeId,
	intersect: PolygonIntersectFn
): Vec[] | undefined {
	const shape = editor.getShape(shapeId)
	if (!shape || shape.parentId === editor.getCurrentPageId()) return undefined

	const clipPathsInPageSpace: Vec[][] = []
	for (const ancestor of editor.getShapeAncestors(shapeId)) {
		const util = editor.getShapeUtil(ancestor)
		const localClip = util.getClipPath?.(ancestor)
		if (!localClip) continue
		if (util.shouldClipChild?.(shape) === false) continue
		clipPathsInPageSpace.push(editor.getShapePageTransform(ancestor.id).applyToPoints(localClip))
	}

	if (clipPathsInPageSpace.length === 0) return undefined

	const pageMask = clipPathsInPageSpace.reduce<Vec[]>((acc, next) => {
		const intersection = intersect(acc, next)
		return intersection ? intersection.map((p) => Vec.Cast(p)) : []
	}, clipPathsInPageSpace[0])

	return pageMask.length > 0 ? pageMask : undefined
}

/** Convert a page-space mask to the CSS `clip-path` string for a shape. */
export function toClipPathCss(
	editor: Editor,
	shapeId: TLShapeId,
	pageMask: VecLike[]
): string | undefined {
	const pageTransform = editor.getShapePageTransform(shapeId)
	if (!pageTransform) return undefined

	const localMask = Mat.applyToPoints(Mat.Inverse(pageTransform), pageMask)
	return `polygon(${localMask.map((p) => `${p.x}px ${p.y}px`).join(',')})`
}

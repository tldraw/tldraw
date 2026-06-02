import {
	Editor,
	intersectLineSegmentLineSegment,
	Mat,
	TLShapeId,
	Vec,
	VecLike,
} from '@tldraw/editor'

type PolygonIntersectFn = (a: VecLike[], b: VecLike[]) => VecLike[] | null

const EPSILON = 1e-10

/** Pre-fix intersect: Sutherland–Hodgman with finite clip edges (segment–segment). */
export function legacySegmentShIntersect(a: VecLike[], b: VecLike[]): VecLike[] | null {
	if (a.length < 3 || b.length < 3) return null

	const clip = (subject: VecLike[], window: VecLike[]) => {
		let output = subject
		for (let i = 0; i < window.length; i++) {
			const edgeStart = window[i]
			const edgeEnd = window[(i + 1) % window.length]
			const next: VecLike[] = []
			const n = output.length
			if (n === 0) return next

			for (let j = 0; j < n; j++) {
				const current = output[j]
				const previous = output[(j + n - 1) % n]
				const currentInside = isInsideClipHalfPlane(current, edgeStart, edgeEnd)
				const previousInside = isInsideClipHalfPlane(previous, edgeStart, edgeEnd)

				if (currentInside) {
					if (!previousInside) {
						const hit = intersectLineSegmentLineSegment(previous, current, edgeStart, edgeEnd)
						if (hit) next.push(hit)
					}
					next.push(current)
				} else if (previousInside) {
					const hit = intersectLineSegmentLineSegment(previous, current, edgeStart, edgeEnd)
					if (hit) next.push(hit)
				}
			}
			output = next
			if (output.length === 0) return []
		}
		return output
	}

	const clipped = clip(a, b)
	if (clipped.length >= 3) return clipped

	const flipped = clip(b, a)
	return flipped.length >= 3 ? flipped : null
}

function isInsideClipHalfPlane(
	point: VecLike,
	edgeStart: VecLike,
	edgeEnd: VecLike,
	precision = EPSILON
): boolean {
	const cross =
		(edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
		(edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x)
	return cross >= -precision
}

/** Same steps as `Editor._getShapeMaskCache`, with a custom intersect fn. */
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

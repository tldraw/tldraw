import {
	Box,
	type Editor,
	Mat,
	type TLContent,
	type TLShape,
	type TLShapeId,
	type TLShapePartial,
	type VecLike,
} from 'tldraw'

/** Below this many screen pixels on either side, a drag with the stamp tool counts as a click. */
export const MIN_STAMP_BOX_SIZE = 8

/**
 * The page bounds of content's root shapes, from their geometry, before it's on the page. Groups
 * are measured by their children. A shape whose geometry can't be worked out alone, such as one that
 * depends on others in the store, is left out.
 */
export function getContentBounds(editor: Editor, content: TLContent): Box | undefined {
	const children = new Map<string, TLShape[]>()
	for (const shape of content.shapes) {
		const siblings = children.get(shape.parentId) ?? []
		siblings.push(shape)
		children.set(shape.parentId, siblings)
	}
	const points: VecLike[] = []
	const visit = (shape: TLShape, parentTransform: Mat) => {
		const transform = Mat.Compose(
			parentTransform,
			Mat.Translate(shape.x, shape.y),
			Mat.Rotate(shape.rotation)
		)
		if (shape.type === 'group') {
			for (const child of children.get(shape.id) ?? []) visit(child, transform)
			return
		}
		try {
			const { bounds } = editor.getShapeUtil(shape).getGeometry(shape)
			points.push(...Mat.applyToPoints(transform, bounds.corners))
		} catch {
			// Measured without it.
		}
	}
	const roots = content.shapes.filter((shape) => content.rootShapeIds.includes(shape.id))
	for (const root of roots) visit(root, Mat.Identity())
	return points.length > 0 ? Box.FromPoints(points) : undefined
}

/** The size that fits `size` inside `box`, keeping its aspect ratio, and the scale that gives it. */
export function fitSize(size: { w: number; h: number }, box: { w: number; h: number }) {
	if (size.w <= 0 || size.h <= 0) return { w: box.w, h: box.h, scale: 1 }
	const scale = Math.min(box.w / size.w, box.h / size.h)
	return { w: size.w * scale, h: size.h * scale, scale }
}

function getScaleProp(editor: Editor, id: TLShapeId) {
	const value = (editor.getShape(id)?.props as { scale?: unknown } | undefined)?.scale
	return typeof value === 'number' ? value : undefined
}

/**
 * Scales shapes and their descendants uniformly about `origin`, the way the select tool resizes a
 * selection. Resizing changes a text or note shape's `scale` but leaves other shapes' strokes as
 * they were; those get their `scale` multiplied too, so the result looks like the original, only
 * bigger or smaller.
 */
function scaleShapes(editor: Editor, ids: TLShapeId[], scale: number, origin: VecLike) {
	const snapshots = new Map<TLShapeId, { shape: TLShape; bounds: Box; pageTransform: Mat }>()
	const snapshot = (id: TLShapeId): false | undefined => {
		const shape = editor.getShape(id)
		if (!shape) return false
		snapshots.set(id, {
			shape,
			bounds: editor.getShapeGeometry(shape).bounds,
			pageTransform: editor.getShapePageTransform(shape),
		})
		if (!editor.getShapeUtil(shape).canResizeChildren(shape)) return false
		return undefined
	}
	for (const id of ids) {
		if (snapshot(id) === false) continue
		editor.visitDescendants(id, snapshot)
	}

	// Parents come before their children, which are positioned against the resized parent.
	for (const [id, { shape, bounds, pageTransform }] of snapshots) {
		editor.resizeShape(
			id,
			{ x: scale, y: scale },
			{
				initialShape: shape,
				initialBounds: bounds,
				initialPageTransform: pageTransform,
				scaleOrigin: origin,
				scaleAxisRotation: 0,
				isAspectRatioLocked: true,
				mode: 'scale_shape',
			}
		)
	}

	editor.updateShapes(
		[...snapshots].flatMap(([id, { shape }]): TLShapePartial[] => {
			const before = (shape.props as { scale?: unknown }).scale
			if (typeof before !== 'number' || getScaleProp(editor, id) !== before) return []
			return [{ id, type: shape.type, props: { scale: before * scale } } as TLShapePartial]
		})
	)
}

/**
 * Places a copy of `content` centred on `center` and selects it: at its own size, or, given a page
 * box, scaled uniformly to fit inside it, strokes and text scaling with it. One undo step.
 */
export function stampContent(editor: Editor, content: TLContent, center: VecLike, box?: Box) {
	editor.markHistoryStoppingPoint('stamp library item')
	editor.run(() => {
		editor.putContentOntoCurrentPage(content, { point: center, select: true })
		if (!box) return
		const bounds = editor.getSelectionPageBounds()
		if (!bounds || bounds.w === 0 || bounds.h === 0) return
		const { scale } = fitSize(bounds, box)
		const ids = editor.getSelectedShapeIds()
		scaleShapes(editor, ids, scale, bounds.center)
		const placed = editor.getSelectionPageBounds()
		if (!placed) return
		editor.nudgeShapes(ids, {
			x: box.center.x - placed.center.x,
			y: box.center.y - placed.center.y,
		})
	})
}

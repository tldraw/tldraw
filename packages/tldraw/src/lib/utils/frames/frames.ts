import {
	Box,
	Editor,
	TLFrameShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	compact,
	kickoutOccludedShapes,
} from '@tldraw/editor'

/**
 * Remove a frame.
 *
 * @param editor - tldraw editor instance.
 * @param ids - Ids of the frames you wish to remove.
 *
 * @public
 */
export function removeFrame(editor: Editor, ids: TLShapeId[]) {
	const frames = compact(
		ids
			.map((id) => editor.getShape<TLFrameShape>(id))
			.filter((f) => f && editor.isShapeOfType<TLFrameShape>(f, 'frame'))
	)
	if (!frames.length) return

	const allChildren: TLShapeId[] = []
	editor.run(() => {
		frames.map((frame) => {
			const children = editor.getSortedChildIdsForParent(frame.id)
			if (children.length) {
				kickoutOccludedShapes(editor, children, {
					filter: (s) => !frames.find((f) => f.id === s.id),
				})
				allChildren.push(...children)
			}
		})
		editor.setSelectedShapes(allChildren)
		editor.deleteShapes(ids)
	})
}

/** @internal */
export const DEFAULT_FRAME_PADDING = 50

export function getFrameChildrenBounds(
	children: (TLShape | undefined)[],
	editor: Editor,
	opts: { padding: number } = { padding: DEFAULT_FRAME_PADDING }
) {
	const bounds = Box.FromPoints(
		children.flatMap((shape) => {
			if (!shape) return []
			const geometry = editor.getShapeGeometry(shape.id)
			const transform = editor.getShapeLocalTransform(shape)
			return transform?.applyToPoints(geometry.vertices) ?? []
		})
	)

	const padding = opts.padding ?? DEFAULT_FRAME_PADDING
	const w = bounds.w + 2 * padding
	const h = bounds.h + 2 * padding
	const dx = padding - bounds.minX
	const dy = padding - bounds.minY

	return { w, h, dx, dy }
}

/**
 * Fit a frame to its content.
 *
 * @param id - Id of the frame you wish to fit to content.
 * @param editor - tlraw editor instance.
 * @param opts - Options for fitting the frame.
 *
 * @public
 */
export function fitFrameToContent(editor: Editor, id: TLShapeId, opts = {} as { padding: number }) {
	const frame = editor.getShape<TLFrameShape>(id)
	if (!frame) return

	const childIds = editor.getSortedChildIdsForParent(frame.id)
	const children = compact(childIds.map((id) => editor.getShape(id)))
	if (!children.length) return

	const { w, h, dx, dy } = getFrameChildrenBounds(children, editor, opts)

	// The shapes already perfectly fit the frame.
	if (dx === 0 && dy === 0 && frame.props.w === w && frame.props.h === h) return

	const diff = new Vec(dx, dy).rot(frame.rotation)
	editor.run(() => {
		const changes: TLShapePartial[] = childIds.map((child) => {
			const shape = editor.getShape(child)!
			return {
				id: shape.id,
				type: shape.type,
				x: shape.x + dx,
				y: shape.y + dy,
			}
		})

		changes.push({
			id: frame.id,
			type: frame.type,
			x: frame.x - diff.x,
			y: frame.y - diff.y,
			props: {
				w,
				h,
			},
		})

		editor.updateShapes(changes)
	})
}

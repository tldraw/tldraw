import {
	Box2d,
	Editor,
	TLFrameShape,
	TLShapeId,
	TLShapePartial,
	Vec2d,
	compact,
} from '@tldraw/editor'

/**
 * Remove a frame.
 *
 * @param editor - tlraw editor instance.
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
	editor.batch(() => {
		frames.map((frame) => {
			const children = editor.getSortedChildIdsForParent(frame.id)
			if (children.length) {
				editor.reparentShapes(children, frame.parentId, frame.index)
				allChildren.push(...children)
			}
		})
		editor.setSelectedShapes(allChildren)
		editor.deleteShapes(ids)
	})
}

/** @internal */
export const DEFAULT_FRAME_PADDING = 50

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

	const bounds = Box2d.FromPoints(
		children.flatMap((shape) => {
			const geometry = editor.getShapeGeometry(shape.id)
			return editor.getShapeLocalTransform(shape)!.applyToPoints(geometry.vertices)
		})
	)

	const { padding = DEFAULT_FRAME_PADDING } = opts
	const w = bounds.w + 2 * padding
	const h = bounds.h + 2 * padding
	const dx = padding - bounds.minX
	const dy = padding - bounds.minY
	// The shapes already perfectly fit the frame.
	if (dx === 0 && dy === 0 && frame.props.w === w && frame.props.h === h) return

	const diff = new Vec2d(dx, dy).rot(frame.rotation)
	editor.batch(() => {
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

import { Editor, TLFrameShape, TLShapeId, TLShapePartial, Vec2d, compact } from '@tldraw/editor'

/**
 * Remove a frame.
 *
 * @param ids - Ids of the frames you wish to remove.
 * @param editor - tlraw editor instance.
 *
 * @public
 */
export function removeFrame(ids: TLShapeId[], editor: Editor) {
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

export const FRAME_PADDING = 50

/**
 * Fit a frame to its content.
 *
 * @param id - Id of the frame you wish to fit to content.
 * @param editor - tlraw editor instance.
 *
 * @public
 */
export function fitFrameToContent(id: TLShapeId, editor: Editor) {
	const frame = editor.getShape<TLFrameShape>(id)
	if (!frame) return

	const childIds = editor.getSortedChildIdsForParent(frame.id)
	const children = compact(childIds.map((id) => editor.getShape(id)))
	if (!children.length) return

	const bounds = {
		minX: Number.MAX_VALUE,
		minY: Number.MAX_VALUE,
		maxX: Number.MIN_VALUE,
		maxY: Number.MIN_VALUE,
	}
	children.forEach((shape) => {
		const geometry = editor.getShapeGeometry(shape.id)
		const points = editor.getShapeLocalTransform(shape)!.applyToPoints(geometry.vertices)
		points.forEach((point) => {
			bounds.minX = Math.min(bounds.minX, point.x)
			bounds.minY = Math.min(bounds.minY, point.y)
			bounds.maxX = Math.max(bounds.maxX, point.x)
			bounds.maxY = Math.max(bounds.maxY, point.y)
		})
	})
	if (
		bounds.minX === Number.MAX_VALUE ||
		bounds.minY === Number.MAX_VALUE ||
		bounds.maxX === Number.MIN_VALUE ||
		bounds.maxY === Number.MAX_VALUE
	)
		return

	const w = bounds.maxX - bounds.minX + 2 * FRAME_PADDING
	const h = bounds.maxY - bounds.minY + 2 * FRAME_PADDING
	const dx = FRAME_PADDING - bounds.minX
	const dy = FRAME_PADDING - bounds.minY
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

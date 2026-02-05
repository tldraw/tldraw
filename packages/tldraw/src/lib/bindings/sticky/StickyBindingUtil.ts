import {
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	TLShapeId,
	TLStickyBinding,
	TLStickyBindingProps,
	Vec,
	stickyBindingMigrations,
	stickyBindingProps,
} from '@tldraw/editor'

/**
 * A binding that allows shapes marked as "sticky" to attach to and follow
 * other shapes. When a sticky shape is dragged over another shape and dropped,
 * a sticky binding is created between them.
 *
 * @public
 */
export class StickyBindingUtil extends BindingUtil<TLStickyBinding> {
	static override type = 'sticky' as const

	static override props = stickyBindingProps
	static override migrations = stickyBindingMigrations

	override getDefaultProps(): Partial<TLStickyBindingProps> {
		return {
			anchor: { x: 0.5, y: 0.5 },
			offset: { x: 0, y: 0 },
		}
	}

	// When the target shape (toId) changes position, update the sticky shape position
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<TLStickyBinding>): void {
		const stickyShape = this.editor.getShape(binding.fromId)
		if (!stickyShape) return

		// Get the target shape's bounds
		const targetBounds = this.editor.getShapePageBounds(shapeAfter)
		if (!targetBounds) return

		// Calculate the position based on anchor and offset
		const { anchor, offset } = binding.props
		const targetPoint = new Vec(
			targetBounds.x + targetBounds.width * anchor.x,
			targetBounds.y + targetBounds.height * anchor.y
		)

		// Get sticky shape's bounds to center it on the anchor
		const stickyBounds = this.editor.getShapePageBounds(stickyShape)
		if (!stickyBounds) return

		// Calculate new position
		const newX = targetPoint.x + offset.x - stickyBounds.width / 2
		const newY = targetPoint.y + offset.y - stickyBounds.height / 2

		// Convert to shape's parent space if needed
		const parentTransform = this.editor.getShapeParentTransform(stickyShape)
		const newPoint = parentTransform
			? parentTransform.clone().invert().applyToPoint({ x: newX, y: newY })
			: { x: newX, y: newY }

		// Update the sticky shape's position
		this.editor.updateShape({
			id: stickyShape.id,
			type: stickyShape.type,
			x: newPoint.x,
			y: newPoint.y,
		})
	}

	// When the sticky shape (fromId) is deleted, also delete the binding
	override onBeforeDeleteFromShape({
		binding,
	}: BindingOnShapeDeleteOptions<TLStickyBinding>): void {
		// Binding will be automatically cleaned up when the shape is deleted
		// but we can do any cleanup here if needed
	}

	// When the target shape is deleted, remove the binding
	override onBeforeDeleteToShape({
		binding,
	}: BindingOnShapeDeleteOptions<TLStickyBinding>): void {
		// Just let the binding be deleted - the sticky shape stays but is no longer bound
	}
}

/**
 * Creates a sticky binding between a sticky shape and a target shape.
 *
 * @param editor - The editor instance
 * @param stickyShapeId - The ID of the shape that is sticky
 * @param targetShapeId - The ID of the shape to stick to
 * @param pagePoint - The point in page coordinates where the sticky shape was dropped
 *
 * @public
 */
export function createStickyBinding(
	editor: InstanceType<typeof import('@tldraw/editor').Editor>,
	stickyShapeId: TLShapeId,
	targetShapeId: TLShapeId,
	pagePoint: Vec
): void {
	const targetBounds = editor.getShapePageBounds(targetShapeId)
	if (!targetBounds) return

	// Calculate normalized anchor based on where on the target shape the sticky was dropped
	const anchor = {
		x: (pagePoint.x - targetBounds.x) / targetBounds.width,
		y: (pagePoint.y - targetBounds.y) / targetBounds.height,
	}

	// Calculate offset from anchor point to sticky shape center
	const stickyBounds = editor.getShapePageBounds(stickyShapeId)
	if (!stickyBounds) return

	const stickyCenter = stickyBounds.center
	const anchorPoint = new Vec(
		targetBounds.x + targetBounds.width * anchor.x,
		targetBounds.y + targetBounds.height * anchor.y
	)
	const offset = Vec.Sub(stickyCenter, anchorPoint)

	editor.createBinding({
		type: 'sticky',
		fromId: stickyShapeId,
		toId: targetShapeId,
		props: {
			anchor,
			offset: { x: offset.x, y: offset.y },
		},
	})
}

/**
 * Removes all sticky bindings from a shape.
 *
 * @param editor - The editor instance
 * @param shapeId - The ID of the sticky shape
 *
 * @public
 */
export function removeStickyBindings(
	editor: InstanceType<typeof import('@tldraw/editor').Editor>,
	shapeId: TLShapeId
): void {
	const bindings = editor.getBindingsFromShape(shapeId, 'sticky')
	if (bindings.length > 0) {
		editor.deleteBindings(bindings)
	}
}

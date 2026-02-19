import {
	BindingOnShapeChangeOptions,
	BindingOnShapeIsolateOptions,
	BindingUtil,
	TLStickerBinding,
	Vec,
	stickerBindingMigrations,
	stickerBindingProps,
} from '@tldraw/editor'

/** @public */
export class StickerBindingUtil extends BindingUtil<TLStickerBinding> {
	static override type = 'sticker' as const
	static override props = stickerBindingProps
	static override migrations = stickerBindingMigrations

	override getDefaultProps(): Partial<TLStickerBinding['props']> {
		return {
			anchor: { x: 0.5, y: 0.5 },
			offset: { x: 0, y: 0 },
		}
	}

	// When the target shape changes, update the sticker's position to follow it
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<TLStickerBinding>) {
		const sticker = this.editor.getShape(binding.fromId)
		if (!sticker) return

		const targetBounds = this.editor.getShapePageBounds(shapeAfter.id)
		if (!targetBounds) return

		// Calculate the world position from anchor + offset
		const worldX = targetBounds.x + binding.props.anchor.x * targetBounds.w + binding.props.offset.x
		const worldY = targetBounds.y + binding.props.anchor.y * targetBounds.h + binding.props.offset.y

		const stickerBounds = this.editor.getShapeGeometry(sticker).bounds
		const stickerPagePoint = new Vec(
			worldX - stickerBounds.w / 2,
			worldY - stickerBounds.h / 2
		)

		// Convert page point to parent space
		const stickerParentTransform = this.editor.getShapeParentTransform(sticker.id)
		const localPoint = stickerParentTransform
			? stickerParentTransform.clone().invert().applyToPoint(stickerPagePoint)
			: stickerPagePoint

		this.editor.updateShapes([
			{
				id: sticker.id,
				type: sticker.type,
				x: localPoint.x,
				y: localPoint.y,
			},
		])
	}

	// When the sticker is isolated from the target (e.g., copy without target), keep its current position
	override onBeforeIsolateFromShape(_options: BindingOnShapeIsolateOptions<TLStickerBinding>) {
		// The sticker keeps its current position — no action needed
	}

	// When the target is isolated (e.g., deleted), keep the sticker in place
	override onBeforeIsolateToShape(_options: BindingOnShapeIsolateOptions<TLStickerBinding>) {
		// The sticker keeps its current position — no action needed
	}
}

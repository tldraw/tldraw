import { ShapeHandleOverlayUtil } from 'tldraw'

export class BezierShapeHandleOverlayUtil extends ShapeHandleOverlayUtil {
	static override type = 'shape_handle'

	override isActive(): boolean {
		const editor = this.editor
		const onlySelectedShape = editor.getOnlySelectedShape()

		if (!onlySelectedShape || !editor.isShapeOfType(onlySelectedShape, 'bezier-curve')) {
			return super.isActive()
		}

		const { isReadonly, isChangingStyle } = editor.getInstanceState()
		if (isReadonly || isChangingStyle) return false
		if (!editor.getShapeHandles(onlySelectedShape)) return false

		if (editor.isInAny('select.pointing_handle', 'select.dragging_handle')) return true

		return (
			editor.getEditingShapeId() === onlySelectedShape.id && editor.isIn('select.editing_shape')
		)
	}
}

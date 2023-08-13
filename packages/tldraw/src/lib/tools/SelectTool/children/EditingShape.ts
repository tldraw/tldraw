import { StateNode, TLArrowShape, TLEventHandlers, TLGeoShape } from '@tldraw/editor'
import { getHitShapeOnCanvasPointerDown } from '../../selection-logic/getHitShapeOnCanvasPointerDown'
import { updateHoveredId } from '../../selection-logic/updateHoveredId'

export class EditingShape extends StateNode {
	static override id = 'editing_shape'

	override onExit = () => {
		const { editingShapeId } = this.editor.currentPageState
		if (!editingShapeId) return

		// Clear the editing shape
		this.editor.setEditingShape(null)

		const shape = this.editor.getShape(editingShapeId)!
		const util = this.editor.getShapeUtil(shape)

		// Check for changes on editing end
		util.onEditEnd?.(shape)
	}

	override onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredId(this.editor)
				return
			}
		}
	}
	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		// This is pretty tricky.

		// Most of the time, we wouldn't want pointer events inside of an editing
		// shape to de-select the shape or change the editing state. We would just
		// ignore those pointer events.

		// The exception to this is shapes that have only parts of themselves that are
		// editable, such as the label on a geo shape. In this case, we would want clicks
		// that are outside of the label but inside of the shape to end the editing session
		// and select the shape instead.

		// What we'll do here (for now at least) is have the text label / input element
		// have a pointer event handler (in useEditableText) that dispatches its own
		// "shape" type event, which lets us know to ignore the event. If we instead get
		// a "canvas" type event, then we'll check to see if the hovered shape is a geo
		// shape and if so, we'll end the editing session and select the shape.

		switch (info.target) {
			case 'shape': {
				if (info.shape.id === this.editor.editingShapeId) {
					return
				}
				break
			}
			case 'canvas': {
				const hitShape = getHitShapeOnCanvasPointerDown(this.editor)

				if (
					hitShape &&
					!(
						this.editor.isShapeOfType<TLGeoShape>(hitShape, 'geo') ||
						this.editor.isShapeOfType<TLArrowShape>(hitShape, 'arrow')
					)
				) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
			}
		}

		this.parent.transition('idle', info)
		this.parent.current.value?.onPointerDown?.(info)
	}

	override onComplete: TLEventHandlers['onComplete'] = (info) => {
		this.parent.transition('idle', info)
	}

	override onCancel: TLEventHandlers['onCancel'] = (info) => {
		this.parent.transition('idle', info)
	}
}

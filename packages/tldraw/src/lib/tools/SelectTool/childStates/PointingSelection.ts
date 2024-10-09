import { StateNode, TLClickEventInfo, TLGroupShape, TLPointerEventInfo } from '@tldraw/editor'
import { selectOnCanvasPointerUp } from '../../selection-logic/selectOnCanvasPointerUp'

export class PointingSelection extends StateNode {
	static override id = 'pointing_selection'

	info = {} as TLPointerEventInfo & {
		target: 'selection'
	}

	override onEnter(info: TLPointerEventInfo & { target: 'selection' }) {
		this.info = info
	}

	override onPointerUp(info: TLPointerEventInfo) {
		selectOnCanvasPointerUp(this.editor, info)
		this.parent.transition('idle', info)
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.isDragging) {
			this.startTranslating(info)
		}
	}

	override onLongPress(info: TLPointerEventInfo) {
		this.startTranslating(info)
	}

	private startTranslating(info: TLPointerEventInfo) {
		if (this.editor.getIsReadonly()) return
		this.parent.transition('translating', info)
	}

	override onDoubleClick?(info: TLClickEventInfo) {
		const hoveredShape = this.editor.getHoveredShape()
		const hitShape =
			hoveredShape && !this.editor.isShapeOfType<TLGroupShape>(hoveredShape, 'group')
				? hoveredShape
				: this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
						hitInside: true,
						margin: 0,
						renderingOnly: true,
					})

		if (hitShape) {
			// todo: extract the double click shape logic from idle so that we can share it here
			this.parent.transition('idle')
			this.parent.onDoubleClick?.({
				...info,
				target: 'shape',
				shape: this.editor.getShape(hitShape)!,
			})
			return
		}
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private cancel() {
		this.parent.transition('idle')
	}
}

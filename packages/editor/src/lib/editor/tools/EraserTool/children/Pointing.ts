import { TLShapeId } from '@tldraw/tlschema'
import { FrameShapeUtil } from '../../../shapes/frame/FrameShapeUtil'
import { GroupShapeUtil } from '../../../shapes/group/GroupShapeUtil'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'

export class Pointing extends StateNode {
	static override id = 'pointing'

	onEnter = () => {
		const { inputs } = this.editor

		const erasing = new Set<TLShapeId>()

		const initialSize = erasing.size

		for (const shape of [...this.editor.sortedShapesArray].reverse()) {
			if (this.editor.isPointInShape(inputs.currentPagePoint, shape)) {
				// Skip groups
				if (this.editor.isShapeOfType(shape, GroupShapeUtil)) continue

				const hitShape = this.editor.getOutermostSelectableShape(shape)

				// If we've hit a frame after hitting any other shape, stop here
				if (this.editor.isShapeOfType(hitShape, FrameShapeUtil) && erasing.size > initialSize) break

				erasing.add(hitShape.id)
			}
		}

		this.editor.setErasingIds([...erasing])
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = (info) => {
		if (this.editor.inputs.isDragging) {
			this.parent.transition('erasing', info)
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	complete() {
		const { erasingIds } = this.editor

		if (erasingIds.length) {
			this.editor.mark('erase end')
			this.editor.deleteShapes(erasingIds)
		}

		this.editor.setErasingIds([])
		this.parent.transition('idle', {})
	}

	cancel() {
		this.editor.setErasingIds([])
		this.parent.transition('idle', {})
	}
}

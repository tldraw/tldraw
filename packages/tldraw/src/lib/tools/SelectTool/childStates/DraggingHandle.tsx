import { StateNode, TLPointerEventInfo } from '@tldraw/editor'
import {
	ShapeHandleDragInfo,
	ShapeHandleDragSession,
} from '../../../overlays/shapeHandleInteractions'

export type DraggingHandleInfo = ShapeHandleDragInfo

export class DraggingHandle extends StateNode {
	static override id = 'dragging_handle'
	static override trackPerformance = true

	info!: DraggingHandleInfo
	private session!: ShapeHandleDragSession

	override onEnter(info: DraggingHandleInfo) {
		this.info = info
		if (typeof info.onInteractionEnd === 'string') {
			this.parent.setCurrentToolIdMask(info.onInteractionEnd)
		}

		this.session = new ShapeHandleDragSession(this.editor, info)
		this.session.start()
	}

	override onPointerMove(_info: TLPointerEventInfo) {
		this.session.update()
	}

	override onKeyDown() {
		this.session.update()
	}

	override onKeyUp() {
		this.session.update()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.session.update()
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onExit() {
		this.parent.setCurrentToolIdMask(undefined)
		this.session?.exit()
	}

	private complete() {
		if (this.session.complete()) return
		this.parent.transition('idle')
	}

	private cancel() {
		if (this.session.cancel()) return
		this.parent.transition('idle')
	}
}

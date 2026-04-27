import { StateNode, TLPointerEventInfo } from '@tldraw/editor'
import {
	ShapeHandlePointingInfo,
	ShapeHandlePointingSession,
} from '../../../overlays/shapeHandleInteractions'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	info = {} as ShapeHandlePointingInfo
	private session: ShapeHandlePointingSession | null = null

	override onEnter(info: ShapeHandlePointingInfo) {
		this.info = info
		this.session = new ShapeHandlePointingSession(this.editor, info)
		this.session.start()
	}

	override onExit() {
		this.session?.cleanup()
		this.session = null
	}

	override onPointerUp() {
		if (this.session?.click()) return
		this.parent.transition('idle', this.info)
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.startDraggingHandle(info)
		}
	}

	override onLongPress(info: TLPointerEventInfo) {
		this.startDraggingHandle(info)
	}

	private startDraggingHandle(info: TLPointerEventInfo) {
		const redirect = this.session?.getDragStartRedirect(info)
		if (redirect) {
			this.editor.setCurrentTool(redirect.id, redirect.info ?? info)
			return
		}

		this.parent.transition('dragging_handle', this.info)
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

import { StateNode, TLClickEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import {
	ShapeHandlePointingInfo,
	ShapeHandlePointingSession,
} from '../../../overlays/shapeHandleInteractions'

export class PointingHandle extends StateNode {
	static override id = 'pointing_handle'

	info = {} as ShapeHandlePointingInfo
	private session: ShapeHandlePointingSession | null = null
	private isDoubleClick = false

	override onEnter(info: ShapeHandlePointingInfo) {
		this.info = info
		this.isDoubleClick = false
		this.session = new ShapeHandlePointingSession(this.editor, info)
		this.session.start()
	}

	override onExit() {
		this.session?.cleanup()
		this.session = null
	}

	override onPointerUp() {
		if (this.isDoubleClick) {
			this.parent.transition('idle')
			this.parent.getCurrent()?.handleEvent({
				...this.info,
				type: 'click',
				name: 'double_click',
				phase: 'down',
			})
			return
		}

		if (this.session?.click()) return
		this.parent.transition('idle', this.info)
	}

	override onDoubleClick(info: TLClickEventInfo) {
		if (
			this.editor.inputs.getShiftKey() ||
			info.phase !== 'down' ||
			info.ctrlKey ||
			info.shiftKey
		) {
			return
		}

		this.isDoubleClick = true
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

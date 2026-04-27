import { OverlayUtil, StateNode, TLOverlayDragInfo, TLPointerEventInfo } from '@tldraw/editor'
import { DraggingOverlayInfo, PointingOverlayInfo } from './PointingOverlay'

export class DraggingOverlay extends StateNode {
	static override id = 'dragging_overlay'
	static override trackPerformance = true

	private info = {} as DraggingOverlayInfo
	private initialInfo = {} as PointingOverlayInfo
	private currentInfo = {} as TLPointerEventInfo
	private util = null as OverlayUtil | null

	override onEnter(info: DraggingOverlayInfo) {
		this.info = info
		this.initialInfo = info.initialInfo
		this.currentInfo = info.currentInfo
		this.util = this.editor.overlays.getOverlayUtil(info.overlay)

		const dragInfo = this.getDragInfo(this.currentInfo)
		this.util.onDragStart?.(this.info.overlay, dragInfo)
		this.util.onDrag?.(this.info.overlay, dragInfo)
	}

	override onPointerMove(info: TLPointerEventInfo) {
		this.update(info)
	}

	override onKeyDown() {
		this.update(this.currentInfo)
	}

	override onKeyUp() {
		this.update(this.currentInfo)
	}

	override onPointerUp(info: TLPointerEventInfo) {
		this.update(info)
		this.util?.onDragEnd?.(this.info.overlay, this.getDragInfo(info))
		this.complete()
	}

	override onComplete() {
		this.util?.onDragEnd?.(this.info.overlay, this.getDragInfo(this.currentInfo))
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private update(info: TLPointerEventInfo) {
		this.currentInfo = info
		this.util?.onDrag?.(this.info.overlay, this.getDragInfo(info))
	}

	private getDragInfo(current: TLPointerEventInfo): TLOverlayDragInfo {
		return {
			overlay: this.info.overlay,
			initial: this.initialInfo,
			current,
		}
	}

	private complete() {
		const { onInteractionEnd } = this.info
		if (onInteractionEnd) {
			if (typeof onInteractionEnd === 'string') {
				this.editor.setCurrentTool(onInteractionEnd, this.info)
			} else {
				onInteractionEnd()
			}
			return
		}

		this.parent.transition('idle')
	}

	private cancel() {
		this.util?.onDragCancel?.(this.info.overlay, this.getDragInfo(this.currentInfo))
		this.complete()
	}
}

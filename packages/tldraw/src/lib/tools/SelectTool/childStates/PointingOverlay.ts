import {
	OverlayUtil,
	StateNode,
	TLOverlay,
	TLOverlayPointerEventInfo,
	TLPointerEventInfo,
} from '@tldraw/editor'

export type PointingOverlayInfo<T extends TLOverlay = TLOverlay> = TLOverlayPointerEventInfo<T> & {
	onInteractionEnd?: string | (() => void)
}

export type DraggingOverlayInfo<T extends TLOverlay = TLOverlay> = PointingOverlayInfo<T> & {
	initialInfo: PointingOverlayInfo<T>
	currentInfo: TLPointerEventInfo
}

export class PointingOverlay extends StateNode {
	static override id = 'pointing_overlay'

	private info = {} as PointingOverlayInfo
	private util = null as OverlayUtil | null

	override onEnter(info: PointingOverlayInfo) {
		this.info = info
		this.util = this.editor.overlays.getOverlayUtil(info.overlay)

		const redirect = this.util.getPointerDownRedirect?.(info.overlay, info)
		if (redirect) {
			this.editor.setCurrentTool(redirect.id, redirect.info ?? info)
			return
		}

		if (!hasGenericOverlayInteraction(this.util)) {
			this.fallbackToSelection()
			return
		}

		const result = this.util.onPointerDown?.(info.overlay, info)
		if (result === false) {
			this.fallbackToSelection()
			return
		}

		const cursor = this.util.getCursor(info.overlay)
		if (cursor) {
			this.editor.setCursor({ type: cursor, rotation: this.editor.getSelectionRotation() })
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.startDragging(info)
		}
	}

	override onLongPress(info: TLPointerEventInfo) {
		this.startDragging(info)
	}

	override onPointerUp(info: TLPointerEventInfo) {
		const overlayInfo = this.asOverlayInfo(info)
		const result = this.util?.onPointerUp?.(this.info.overlay, overlayInfo)
		if (result !== false) {
			const clickResult = this.util?.onClick?.(this.info.overlay, overlayInfo)
			if (clickResult === false) return
		}
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onInterrupt() {
		this.cancel()
	}

	private startDragging(info: TLPointerEventInfo) {
		const redirect = this.util?.getDragStartRedirect?.(this.info.overlay, this.info, info)
		if (redirect) {
			this.editor.setCurrentTool(redirect.id, redirect.info ?? info)
			return
		}

		this.parent.transition('dragging_overlay', {
			...this.info,
			initialInfo: this.info,
			currentInfo: info,
		} satisfies DraggingOverlayInfo)
	}

	private asOverlayInfo(info: TLPointerEventInfo): TLOverlayPointerEventInfo {
		return {
			type: info.type,
			name: info.name,
			point: info.point,
			pointerId: info.pointerId,
			button: info.button,
			isPen: info.isPen,
			shiftKey: info.shiftKey,
			altKey: info.altKey,
			ctrlKey: info.ctrlKey,
			metaKey: info.metaKey,
			accelKey: info.accelKey,
			target: 'overlay',
			overlay: this.info.overlay,
		}
	}

	private fallbackToSelection() {
		const { overlay: _overlay, ...rest } = this.info
		this.parent.transition('idle')
		this.editor.root.handleEvent({
			...rest,
			target: 'selection',
		} as TLPointerEventInfo)
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
		this.complete()
	}
}

function hasGenericOverlayInteraction(util: OverlayUtil) {
	return !!(
		util.onPointerDown ||
		util.onPointerUp ||
		util.onClick ||
		util.getDragStartRedirect ||
		util.onDragStart ||
		util.onDrag ||
		util.onDragEnd ||
		util.onDragCancel
	)
}

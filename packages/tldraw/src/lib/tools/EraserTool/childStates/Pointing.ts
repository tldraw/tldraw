import { StateNode, TLPointerEventInfo, TLShapeId } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	override onEnter(info: TLPointerEventInfo) {
		const onlyEraseTopShape = info.accelKey
		const zoomLevel = this.editor.getZoomLevel()
		const currentPageShapesSorted = this.editor.getCurrentPageRenderingShapesSorted()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()

		const erasing = new Set<TLShapeId>()

		const initialSize = erasing.size

		for (let n = currentPageShapesSorted.length, i = n - 1; i >= 0; i--) {
			const shape = currentPageShapesSorted[i]
			if (this.editor.isShapeOrAncestorLocked(shape) || this.editor.isShapeOfType(shape, 'group')) {
				continue
			}

			if (
				this.editor.isPointInShape(shape, currentPagePoint, {
					hitInside: false,
					margin: this.editor.options.hitTestMargin / zoomLevel,
				})
			) {
				const hitShape = this.editor.getOutermostSelectableShape(shape)
				// If we've hit a frame-like shape after hitting any other shape, stop here
				if (this.editor.isShapeFrameLike(hitShape) && erasing.size > initialSize) {
					break
				}

				erasing.add(hitShape.id)

				if (onlyEraseTopShape) break
			}
		}

		this.editor.setErasingShapes([...erasing])
	}

	override onLongPress(info: TLPointerEventInfo) {
		if (info.accelKey) return
		this.startErasing(info)
	}

	override onExit(_info: any, to: string) {
		if (to !== 'erasing') {
			this.editor.setErasingShapes([])
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.startErasing(info)
		}
	}

	override onPointerUp(info: TLPointerEventInfo) {
		this.complete(info)
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

	private startErasing(info: TLPointerEventInfo) {
		this.parent.transition('erasing', info)
	}

	complete(info?: TLPointerEventInfo) {
		const erasingShapeIds = this.editor.getErasingShapeIds()

		if (erasingShapeIds.length) {
			this.editor.markHistoryStoppingPoint('erase end')
			this.editor.deleteShapes(erasingShapeIds)
		}

		this.parent.transition('idle', info)
	}

	cancel() {
		this.parent.transition('idle')
	}
}

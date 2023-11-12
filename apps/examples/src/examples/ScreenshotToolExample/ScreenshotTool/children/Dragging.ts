import {
	Box2d,
	Box2dModel,
	StateNode,
	TLEventHandlers,
	TLPointerEventInfo,
	atom,
	copyAs,
	exportAs,
} from '@tldraw/tldraw'

export class ScreenshotDragging extends StateNode {
	static override id = 'dragging'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	box = new Box2d()

	screenshotBox = atom<Box2dModel>('screenshot brush', { x: 0, y: 0, w: 1, h: 1 })

	override onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
		this.update()
	}

	override onPointerMove = () => {
		this.update()
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = () => {
		this.update()
	}

	override onKeyUp: TLEventHandlers['onKeyUp'] = () => {
		this.update()
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	private update() {
		const {
			inputs: { shiftKey, altKey, originPagePoint, currentPagePoint },
		} = this.editor

		this.box = Box2d.FromPoints([originPagePoint, currentPagePoint])

		const { box } = this
		if (shiftKey) {
			if (box.w > box.h * (16 / 9)) {
				box.h = box.w * (9 / 16)
			} else {
				box.w = box.h * (16 / 9)
			}

			if (currentPagePoint.x < originPagePoint.x) {
				box.x = originPagePoint.x - box.w
			}

			if (currentPagePoint.y < originPagePoint.y) {
				box.y = originPagePoint.y - box.h
			}
		}

		if (altKey) {
			box.w *= 2
			box.h *= 2
			box.x = originPagePoint.x - box.w / 2
			box.y = originPagePoint.y - box.h / 2
		}

		this.screenshotBox.set(box.toJson())
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}

	private complete() {
		const { box, editor } = this

		// get all shapes contained by or intersecting the box
		const shapes = editor.currentPageShapes.filter((s) => {
			const pageBounds = editor.getShapeMaskedPageBounds(s)
			return pageBounds && box.includes(pageBounds)
		})

		if (shapes.length) {
			if (editor.inputs.ctrlKey) {
				// Copy the shapes to the clipboard
				copyAs(
					editor,
					shapes.map((s) => s.id),
					'png',
					{ bounds: box, background: editor.instanceState.exportBackground }
				)
			} else {
				// Export the shapes as a png
				exportAs(
					editor,
					shapes.map((s) => s.id),
					'png',
					{ bounds: box, background: editor.instanceState.exportBackground }
				)
			}
		}

		this.parent.transition('idle', this.info)
	}
}

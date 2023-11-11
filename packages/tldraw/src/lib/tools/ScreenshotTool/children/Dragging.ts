import { Box2d, StateNode, TLEventHandlers, TLPointerEventInfo } from '@tldraw/editor'
import { copyAs } from '../../../ui/hooks/useCopyAs'
import { exportAs } from '../../../ui/hooks/useExportAs'

export class Dragging extends StateNode {
	static override id = 'dragging'

	info = {} as TLPointerEventInfo & { onInteractionEnd?: string }

	box = new Box2d()

	override onEnter = (info: TLPointerEventInfo & { onInteractionEnd: string }) => {
		this.info = info
		this.update()
	}

	override onExit = () => {
		this.editor.updateInstanceState({ screenshotBrush: null })
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
			inputs: { shiftKey, originPagePoint, currentPagePoint },
		} = this.editor

		const box = Box2d.FromPoints([originPagePoint, currentPagePoint])

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

			this.box.setTo(box)
		} else {
			this.box.setTo(box)
		}

		this.editor.updateInstanceState({ screenshotBrush: this.box.toJson() })
	}

	private cancel() {
		this.parent.transition('idle', this.info)
	}

	private complete() {
		const { box, editor } = this

		// get all shapes under box
		const shapes = editor.currentPageShapes.filter((s) => {
			const pageBounds = editor.getShapeMaskedPageBounds(s)
			return pageBounds && box.includes(pageBounds)
		})

		if (shapes.length) {
			if (editor.inputs.ctrlKey) {
				copyAs(
					editor,
					shapes.map((s) => s.id),
					'png',
					{ bounds: box, background: true }
				)
			} else {
				exportAs(
					editor,
					shapes.map((s) => s.id),
					'png',
					{ bounds: box, background: true }
				)
			}
		}

		this.parent.transition('idle', this.info)
	}
}

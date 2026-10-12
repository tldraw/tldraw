import { Box, StateNode, atom, copyAs, exportAs } from 'tldraw'

// There's a guide at the bottom of this file!

export class ScreenshotDragging extends StateNode {
	static override id = 'dragging'

	// [1]
	screenshotBox = atom('screenshot brush', new Box())

	// [2]
	override onEnter() {
		this.update()
	}

	override onPointerMove() {
		this.update()
	}

	override onKeyDown() {
		this.update()
	}

	override onKeyUp() {
		this.update()
	}

	private update() {
		const inputs = this.editor.inputs
		const shiftKey = inputs.getShiftKey()
		const altKey = inputs.getAltKey()
		const originPagePoint = inputs.getOriginPagePoint()
		const currentPagePoint = inputs.getCurrentPagePoint()

		const box = Box.FromPoints([originPagePoint, currentPagePoint])

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

		this.screenshotBox.set(box)
	}

	// [3]
	override onPointerUp() {
		const { editor } = this
		const box = this.screenshotBox.get()

		const shapes = editor.getCurrentPageShapes().filter((s) => {
			const pageBounds = editor.getShapeMaskedPageBounds(s)
			if (!pageBounds) return false
			return box.includes(pageBounds)
		})

		if (shapes.length) {
			if (editor.inputs.getCtrlKey()) {
				copyAs(
					editor,
					shapes.map((s) => s.id),
					{ format: 'png', bounds: box }
				)
			} else {
				exportAs(
					editor,
					shapes.map((s) => s.id),
					{
						format: 'png',
						name: 'Screenshot',
						bounds: box,
					}
				)
			}
		}

		this.editor.setCurrentTool('select')
	}

	// [4]
	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

/*
[1]
The box the user is dragging out is stored in an atom so the UI can subscribe to it with
`useValue` (see the ScreenshotBox component in ScreenshotToolExample.tsx). A plain field
wouldn't trigger a re-render.

[2]
Recompute the box between the pointer-down origin and the current pointer on enter, on pointer
move, and on key down/up so the modifiers apply immediately: shift locks the box to 16:9 and
alt centers it on the origin at double size.

[3]
On pointer up, export every shape whose (masked) page bounds overlap the box as a PNG
cropped to the box, or copy it to the clipboard when ctrl is held. `exportAs` and `copyAs` are
the same helpers the export menu uses.

[4]
Cancel (escape) abandons the box and returns to the select tool.
*/

import { Box2d, StateNode, atom, copyAs, exportAs } from '@tldraw/tldraw'

// There's a guide at the bottom of this file!

export class ScreenshotDragging extends StateNode {
	static override id = 'dragging'

	// [1]
	screenshotBox = atom('screenshot brush', new Box2d())

	// [2]
	override onEnter = () => {
		this.update()
	}

	override onPointerMove = () => {
		this.update()
	}

	override onKeyDown = () => {
		this.update()
	}

	override onKeyUp = () => {
		this.update()
	}

	private update() {
		const {
			inputs: { shiftKey, altKey, originPagePoint, currentPagePoint },
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
	override onPointerUp = () => {
		const { editor } = this
		const box = this.screenshotBox.get()

		// get all shapes contained by or intersecting the box
		const shapes = editor.getCurrentPageShapes().filter((s) => {
			const pageBounds = editor.getShapeMaskedPageBounds(s)
			if (!pageBounds) return false
			return box.includes(pageBounds)
		})

		if (shapes.length) {
			if (editor.inputs.ctrlKey) {
				// Copy the shapes to the clipboard
				copyAs(
					editor,
					shapes.map((s) => s.id),
					'png',
					{ bounds: box, background: editor.getInstanceState().exportBackground }
				)
			} else {
				// Export the shapes as a png
				exportAs(
					editor,
					shapes.map((s) => s.id),
					'png',
					{ bounds: box, background: editor.getInstanceState().exportBackground }
				)
			}
		}

		this.editor.setCurrentTool('select')
	}

	// [4]
	override onCancel = () => {
		this.editor.setCurrentTool('select')
	}
}

/*
[1] 
This state has a reactive property (an Atom) called "screenshotBox". This is the box
that the user is drawing on the screen as they drag their pointer. We use an Atom here
so that our UI can subscribe to this property using `useValue` (see the ScreenshotBox
component in ScreenshotToolExample).

[2]
When the user enters this state, or when they move their pointer, we update the 
screenshotBox property to be drawn between the place where the user started pointing
and the place where their pointer is now. If the user is holding Shift, then we modify
the dimensions of this box so that it is in a 16:9 aspect ratio.

[3]
When the user makes a pointer up and stops dragging, we export the shapes contained by
the screenshot box as a png. If the user is holding the ctrl key, we copy the shapes
to the clipboard instead.

[4]
When the user cancels (esc key) or makes a pointer up event, we transition back to the
select tool.
*/

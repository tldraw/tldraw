import { Editor, TLShape, compact } from '@tldraw/editor'

const LAG_DURATION = 20

/** @public */
export class StickingManager {
	constructor(public editor: Editor) {
		editor.disposables.add(this.dispose)
	}

	stickingNodeTimer: ReturnType<typeof setTimeout> | null = null

	updateStickingNode(movingShapes: TLShape[], cb: () => void) {
		if (this.stickingNodeTimer === null) {
			this.setDragTimer(movingShapes, LAG_DURATION * 10, cb)
		}
	}

	private setDragTimer(movingShapes: TLShape[], duration: number, cb: () => void) {
		this.stickingNodeTimer = setTimeout(() => {
			this.editor.batch(() => {
				this.handleStick(movingShapes, false, cb)
			})
			this.stickingNodeTimer = null
		}, duration)
	}

	private handleStick(shapes: TLShape[], adhesive: boolean, cb?: () => void) {
		shapes = compact(shapes.map((shape) => this.editor.getShape(shape.id)))

		// TODO: fix this competing with dropping shapes and stuff
		this.editor.setHintingShapes([])

		for (const shape of shapes) {
			const stickingOverShape = this.editor.getStickingOverShape(shape)
			const prevParent = this.editor.getShape(shape.parentId)

			// if (stickingOverShape === prevParent) {
			// 	continue
			// }

			if (prevParent) {
				this.editor.getShapeUtil(prevParent).onStickShapeOut?.(prevParent, shape)
			}

			if (stickingOverShape) {
				const res = this.editor
					.getShapeUtil(stickingOverShape)
					.onStickShapeOver?.(stickingOverShape, shape)

				if (!adhesive && res && res.shouldHint) {
					const hintingShapeIds = this.editor.getHintingShapeIds()
					this.editor.setHintingShapes([...hintingShapeIds, stickingOverShape.id])
				}

				if (adhesive) {
					this.editor.getShapeUtil(stickingOverShape).onStickShape?.(stickingOverShape, shape)
				}
			} else {
				if (adhesive && this.editor.getShape(shape.parentId)) {
					const page = this.editor.getCurrentPage()
					if (page) {
						this.editor.reparentShapes([shape], page.id)
					}
				}
			}
		}

		cb?.()
	}

	stickShapes(shapes: TLShape[]) {
		this.handleStick(shapes, true)
	}

	clear() {
		if (this.stickingNodeTimer !== null) {
			clearTimeout(this.stickingNodeTimer)
		}

		this.stickingNodeTimer = null
		this.editor.setHintingShapes([])
	}

	dispose() {
		this.clear()
	}
}

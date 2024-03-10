import { Session, TLImageShape } from '@tldraw/editor'
import { getTranslateCroppedImageChange } from '../tools/SelectTool/childStates/Crop/children/crop_helpers'

export class TranslatingCropSession extends Session<{
	onExit: () => void
}> {
	readonly id = 'translating_crop'

	initialShape = {} as TLImageShape

	didTranslate = false

	onStart() {
		const { editor } = this

		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.initialShape = editor.getOnlySelectedShape() as TLImageShape
		return
	}

	onUpdate() {
		const { editor, initialShape } = this

		// If we're not dragging yet, don't do anything
		if (!editor.inputs.isDragging) return

		if (!this.didTranslate) {
			// mark when we start dragging
			editor.mark('translating crop')
			this.didTranslate = true
		}

		const { originPagePoint, currentPagePoint } = editor.inputs
		const delta = currentPagePoint.clone().sub(originPagePoint)
		const partial = getTranslateCroppedImageChange(editor, initialShape, delta)

		if (partial) {
			this.editor.updateShapes([partial], { squashing: true })
		}

		return
	}

	onInterrupt() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		return
	}

	onComplete() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.info.onExit()
		return
	}

	onCancel() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
		this.editor.bailToMark('translating crop')
		this.info.onExit()
		return
	}
}

import { ShapeWithCrop, StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { getTranslateCroppedImageChange } from './crop_helpers'

type Snapshot = ReturnType<TranslatingCrop['createSnapshot']>

type TranslatingCropInfo = TLPointerEventInfo & {
	target: 'shape'
	isCreating?: boolean
	onInteractionEnd?: string
}

export class TranslatingCrop extends StateNode {
	static override id = 'translating_crop'

	info = {} as TranslatingCropInfo

	markId = ''

	private snapshot = {} as any as Snapshot

	override onEnter(info: TranslatingCropInfo) {
		this.info = info
		this.snapshot = this.createSnapshot()

		this.markId = this.editor.markHistoryStoppingPoint('translating_crop')
		this.editor.setCursor({ type: 'move', rotation: 0 })
		this.updateShapes()
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	override onPointerMove() {
		this.updateShapes()
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onKeyDown(info: TLKeyboardEventInfo) {
		switch (info.key) {
			case 'Alt':
			case 'Shift': {
				this.updateShapes()
				return
			}
		}
	}

	override onKeyUp(info: TLKeyboardEventInfo) {
		switch (info.key) {
			case 'Enter': {
				this.complete()
				return
			}
			case 'Alt':
			case 'Shift': {
				this.updateShapes()
			}
		}
	}

	protected complete() {
		this.updateShapes()
		this.editor.setCurrentTool('select.crop.idle', this.info)
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.editor.setCurrentTool('select.crop.idle', this.info)
	}

	private createSnapshot() {
		const shape = this.editor.getOnlySelectedShape() as ShapeWithCrop
		return { shape }
	}

	protected updateShapes() {
		const { shape } = this.snapshot

		if (!shape) return

		const originPagePoint = this.editor.inputs.getOriginPagePoint()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const delta = currentPagePoint.clone().sub(originPagePoint)
		const partial = getTranslateCroppedImageChange(this.editor, shape, delta)

		if (partial) {
			this.editor.updateShapes([partial])
		}
	}
}

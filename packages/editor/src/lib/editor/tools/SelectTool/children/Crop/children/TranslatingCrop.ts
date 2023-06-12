import { TLEventHandlers, TLPointerEventInfo } from '../../../../../types/event-types'
import { StateNode } from '../../../../StateNode'
import { ShapeWithCrop, getTranslateCroppedImageChange } from './crop_helpers'

type Snapshot = ReturnType<TranslatingCrop['createSnapshot']>

export class TranslatingCrop extends StateNode {
	static override id = 'translating_crop'

	info = {} as TLPointerEventInfo & {
		target: 'shape'
		isCreating?: boolean
		onInteractionEnd?: string
	}

	markId = 'translating crop'

	private snapshot = {} as any as Snapshot

	onEnter = (
		info: TLPointerEventInfo & {
			target: 'shape'
			isCreating?: boolean
			onInteractionEnd?: string
		}
	) => {
		this.info = info
		this.snapshot = this.createSnapshot()

		this.editor.mark(this.markId)
		this.editor.setCursor({ type: 'move' })
		this.updateShapes()
	}

	onExit = () => {
		this.editor.setCursor({ type: 'default' })
	}

	onPointerMove = () => {
		this.updateShapes()
	}

	onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.complete()
	}

	onComplete: TLEventHandlers['onComplete'] = () => {
		this.complete()
	}

	onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.key) {
			case 'Alt':
			case 'Shift': {
				this.updateShapes()
				return
			}
		}
	}

	onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
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
		this.editor.setSelectedTool('select.crop.idle', this.info)
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.editor.setSelectedTool('select.crop.idle', this.info)
	}

	private createSnapshot() {
		const shape = this.editor.onlySelectedShape as ShapeWithCrop
		return { shape }
	}

	protected updateShapes() {
		const shape = this.snapshot.shape as ShapeWithCrop

		if (!shape) return

		const { originPagePoint, currentPagePoint } = this.editor.inputs
		const delta = currentPagePoint.clone().sub(originPagePoint)
		const partial = getTranslateCroppedImageChange(this.editor, shape, delta)

		if (partial) {
			this.editor.updateShapes([partial], true)
		}
	}
}

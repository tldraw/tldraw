import { ShapeWithCrop, StateNode, TLKeyboardEventInfo, TLPointerEventInfo } from '@tldraw/editor'
import { GestureShapeChangeTracker } from '../../../GestureShapeChangeTracker'
import { getTranslateCroppedImageChange } from './crop_helpers'

type Snapshot = ReturnType<TranslatingCrop['createSnapshot']>

export class TranslatingCrop extends StateNode {
	static override id = 'translating_crop'

	info = {} as TLPointerEventInfo & {
		target: 'shape'
		isCreating?: boolean
		onInteractionEnd?: string
	}

	markId = ''

	private snapshot = {} as any as Snapshot

	private changeTracker = new GestureShapeChangeTracker(
		this.editor,
		(id) => id === this.snapshot.shape?.id
	)

	override onEnter(
		info: TLPointerEventInfo & {
			target: 'shape'
			isCreating?: boolean
			onInteractionEnd?: string
		}
	) {
		this.info = info
		this.snapshot = this.createSnapshot()

		this.markId = this.editor.markHistoryStoppingPoint('translating_crop')
		this.editor.setCursor({ type: 'move', rotation: 0 })

		// Watch for changes made to the cropping shape from outside this interaction.
		this.changeTracker.start()

		this.updateShapes()
	}

	override onExit() {
		this.changeTracker.stop()
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
		this.changeTracker.clear()
		this.editor.setCurrentTool('select.crop.idle', this.info)
	}

	private createSnapshot(originPagePoint = this.editor.inputs.getOriginPagePoint()) {
		const shape = this.editor.getOnlySelectedShape() as ShapeWithCrop
		// The page point the gesture is measured from. Normally the drag origin,
		// but reset to the current pointer when the snapshot is re-anchored after
		// an external change, so the delta resolves to 0 there and doesn't jump.
		return { shape, originPagePoint }
	}

	protected updateShapes() {
		this.changeTracker.ignoreChanges(() => {
			// Crop translation recomputes from `snapshot + delta` every update, so a
			// change made to the shape from outside this interaction would otherwise
			// be stomped. When the tracker has noticed such a change, re-anchor the
			// snapshot (resetting the origin to the current pointer) before updating.
			if (this.changeTracker.getAndClearChanged()) {
				this.snapshot = this.createSnapshot(this.editor.inputs.getCurrentPagePoint())
			}

			const shape = this.snapshot.shape as ShapeWithCrop

			if (!shape) return

			const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
			const delta = currentPagePoint.clone().sub(this.snapshot.originPagePoint)
			const partial = getTranslateCroppedImageChange(this.editor, shape, delta)

			if (partial) {
				this.editor.updateShapes([partial])
			}
		})
	}
}

import {
	StateNode,
	TLPointerEventInfo,
	TLStickerShape,
	Vec,
	createShapeId,
	maybeSnapToGrid,
} from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	info = {} as TLPointerEventInfo

	markId = ''

	shape = {} as TLStickerShape

	override onEnter() {
		const { editor } = this

		const id = createShapeId()
		this.markId = editor.markHistoryStoppingPoint(`creating_sticker:${id}`)

		const center = editor.inputs.getOriginPagePoint().clone()

		editor.createShape<TLStickerShape>({
			id,
			type: 'sticker',
			x: center.x,
			y: center.y,
		})

		const shape = editor.getShape<TLStickerShape>(id)
		if (!shape) {
			this.cancel()
			return
		}

		// Center the shape around the click point
		const bounds = editor.getShapeGeometry(shape).bounds
		const newPoint = maybeSnapToGrid(
			new Vec(shape.x - bounds.width / 2, shape.y - bounds.height / 2),
			editor
		)

		editor.updateShapes([
			{
				id,
				type: 'sticker',
				x: newPoint.x,
				y: newPoint.y,
			},
		])

		editor.select(id)
		this.shape = editor.getShape<TLStickerShape>(id)!
	}

	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape: this.shape,
				onInteractionEnd: 'sticker',
				isCreating: true,
				creatingMarkId: this.markId,
			})
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onInterrupt() {
		this.cancel()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	private complete() {
		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			this.editor.setCurrentTool('select')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle', this.info)
	}
}

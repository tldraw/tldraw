import { Session, TLArrowShape, TLHandle, TLShapeId, TLShapePartial, Vec } from '@tldraw/editor'

export class TranslatingArrowTerminalBend extends Session<{
	shape: TLArrowShape
	handle: TLHandle
}> {
	id = 'translating_arrow_bend'
	markId = ''
	initialPageRotation = 0
	initialPagePoint = {} as Vec

	initialHandle = {} as TLHandle
	initialOppositeHandle = {} as TLHandle

	isPrecise = false
	isPreciseId: TLShapeId | null = null
	pointingId: TLShapeId | null = null

	override onStart() {
		const { editor } = this
		const { shape, handle } = this.info
		this.initialHandle = structuredClone(handle)
		this.initialPageRotation = editor.getShapePageTransform(shape)!.rotation()
		this.initialPagePoint = editor.inputs.originPagePoint.clone()
	}

	override onUpdate() {
		const {
			editor,
			info: { shape: initialShape },
			initialPagePoint,
		} = this
		const { initialHandle, initialPageRotation } = this
		const {
			inputs: { currentPagePoint },
		} = editor

		const shape = editor.getShape(initialShape)
		if (!shape) return
		const util = editor.getShapeUtil(shape)

		const point = currentPagePoint
			.clone()
			.sub(initialPagePoint)
			.rot(-initialPageRotation)
			.add(initialHandle)

		const changes = util.onHandleDrag?.(shape, {
			handle: { ...initialHandle, x: point.x, y: point.y },
			isPrecise: false,
			initial: initialShape,
		})

		if (changes) {
			const next: TLShapePartial<any> = { ...shape, ...changes }
			editor.updateShapes([next], { squashing: true })
		}
	}

	override onCancel() {
		this.editor.bailToMark(this.markId)
	}
}

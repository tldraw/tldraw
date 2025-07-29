import { TLAiChange, TldrawAiTransform } from '@tldraw/ai'
import { createBindingId, TLShapeId } from '@tldraw/tlschema'

export class SimplishIds extends TldrawAiTransform {
	override transformChange = (change: TLAiChange): TLAiChange => {
		switch (change.type) {
			case 'createShape': {
				const { shape } = change
				const id = this.getIncrementedId(shape.id)

				shape.id = id

				return {
					...change,
					shape,
				}
			}
			case 'createBinding': {
				const { binding } = change
				binding.id = createBindingId(binding.id)

				return {
					...change,
					binding,
				}
			}
			case 'updateBinding': {
				return change
			}
			case 'deleteBinding': {
				return change
			}
			default: {
				return change
			}
		}
	}

	private getIncrementedId(key: string) {
		let id = key.startsWith('shape:') ? key : `shape:${key}`

		let existingShape = this.editor.getShape(id as TLShapeId)
		while (existingShape) {
			id = /^.*(\d+)$/.exec(id)?.[1]
				? id.replace(/(\d+)(?=\D?)$/, (m) => {
						return (+m + 1).toString()
					})
				: `${id}-1`
			existingShape = this.editor.getShape(id as TLShapeId)
		}

		return id as TLShapeId
	}
}

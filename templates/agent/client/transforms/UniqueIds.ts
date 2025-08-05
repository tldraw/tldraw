import { createBindingId, TLShapeId } from '@tldraw/tlschema'
import { TLAgentChange } from '../types/TLAgentChange'
import { TldrawAgentTransform } from './TldrawAgentTransform'

export class UniqueIds extends TldrawAgentTransform {
	idMap = new Map<string, TLShapeId>()

	override transformChange = (change: TLAgentChange): TLAgentChange => {
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
			case 'updateShape': {
				const { shape } = change
				const id = this.idMap.get(shape.id) ?? shape.id
				shape.id = id

				return {
					...change,
					shape,
				}
			}
			case 'createBinding': {
				const { binding } = change
				binding.id = createBindingId(binding.id)

				if (binding.fromId) {
					binding.fromId = this.idMap.get(binding.fromId) ?? binding.fromId
				}
				if (binding.toId) {
					binding.toId = this.idMap.get(binding.toId) ?? binding.toId
				}

				return {
					...change,
					binding,
				}
			}
			case 'updateBinding': {
				const { binding } = change
				if (binding.fromId) {
					binding.fromId = this.idMap.get(binding.fromId) ?? binding.fromId
				}
				if (binding.toId) {
					binding.toId = this.idMap.get(binding.toId) ?? binding.toId
				}

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

		this.idMap.set(key, id as TLShapeId)

		return id as TLShapeId
	}
}

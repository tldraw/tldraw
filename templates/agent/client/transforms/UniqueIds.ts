import { TLShapeId } from '@tldraw/tlschema'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { TldrawAgentTransform } from './TldrawAgentTransform'

export class UniqueIds extends TldrawAgentTransform {
	idMap = new Map<string, TLShapeId>()

	override transformEvent = (change: Streaming<IAgentEvent>): Streaming<IAgentEvent> => {
		if (!change.complete) return change

		switch (change._type) {
			case 'create': {
				const { shape } = change
				const id = this.getIncrementedId(shape.shapeId)

				shape.shapeId = id

				return {
					...change,
					shape,
				}
			}
			case 'update': {
				const { update } = change
				const id = this.idMap.get(update.shapeId) ?? update.shapeId
				update.shapeId = id

				return {
					...change,
					update,
				}
			}
			// TODO: Restore this after the refactor
			// See https://linear.app/tldraw/issue/INT-2081/refactor-towards-an-event-definition-approach
			// case 'createBinding': {
			// 	const { binding } = change
			// 	binding.id = createBindingId(binding.id)

			// 	if (binding.fromId) {
			// 		binding.fromId = this.idMap.get(binding.fromId) ?? binding.fromId
			// 	}
			// 	if (binding.toId) {
			// 		binding.toId = this.idMap.get(binding.toId) ?? binding.toId
			// 	}

			// 	return {
			// 		...change,
			// 		binding,
			// 	}
			// }
			// case 'updateBinding': {
			// 	const { binding } = change
			// 	if (binding.fromId) {
			// 		binding.fromId = this.idMap.get(binding.fromId) ?? binding.fromId
			// 	}
			// 	if (binding.toId) {
			// 		binding.toId = this.idMap.get(binding.toId) ?? binding.toId
			// 	}

			// 	return change
			// }
			// case 'deleteBinding': {
			// 	return change
			// }
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

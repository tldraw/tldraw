import { createTldrawAiTransform } from '@tldraw/ai'
import { createBindingId, createShapeId } from '@tldraw/tlschema'

export const SimpleIdsTransform = createTldrawAiTransform((editor, prompt) => {
	const originalIdsToSimpleIds = new Map()
	const simpleIdsToOriginalIds = new Map()
	let nextSimpleId = 0

	// Collect all ids, write simple ids, and write the simple ids
	for (const shape of prompt.canvasContent.shapes ?? []) {
		collectAllIdsRecursively(shape, mapObjectWithIdAndWriteSimple)
	}

	for (const binding of prompt.canvasContent.bindings ?? []) {
		collectAllIdsRecursively(binding, mapObjectWithIdAndWriteSimple)
	}

	return {
		prompt,
		handleChange(change) {
			switch (change.type) {
				case 'createShape': {
					const { shape } = change
					if (!shape) return change
					const { id: simpleId } = shape
					const originalId = createShapeId(simpleId)
					originalIdsToSimpleIds.set(originalId, simpleId)
					simpleIdsToOriginalIds.set(simpleId, originalId)
					shape.id = originalId

					return {
						...change,
						shape,
					}
				}
				case 'updateShape': {
					const shape = collectAllIdsRecursively(change.shape, writeOriginalIds)

					return {
						...change,
						shape,
					}
				}
				case 'deleteShape': {
					const shapeId = simpleIdsToOriginalIds.get(change.shapeId)
					if (!shapeId) {
						throw new Error(`Shape id not found: ${change.shapeId}`)
					}
					return {
						...change,
						shapeId, // this isn't going to be in our map of ids
					}
				}
				case 'createBinding': {
					let { binding } = change
					if (!binding) return change

					const { id: simpleId } = binding
					const originalId = createBindingId(simpleId)
					originalIdsToSimpleIds.set(originalId, simpleId)
					simpleIdsToOriginalIds.set(simpleId, originalId)
					binding.id = originalId

					binding = collectAllIdsRecursively(change.binding, writeOriginalIds)

					return {
						...change,
						binding,
					}
				}
				case 'updateBinding': {
					const binding = collectAllIdsRecursively(change.binding, writeOriginalIds)

					return {
						...change,
						binding,
					}
				}
				case 'deleteBinding': {
					const bindingId = simpleIdsToOriginalIds.get(change.bindingId)
					if (!bindingId) {
						throw new Error(`Binding id not found: ${change.bindingId}`)
					}
					return {
						...change,
						bindingId,
					}
				}
				default:
					return change
			}
		},
	}

	function collectAllIdsRecursively(value: any, cb: (obj: any) => any) {
		if (!value || typeof value !== 'object') {
			return value
		}

		if (Array.isArray(value)) {
			value.forEach((item) => collectAllIdsRecursively(item, cb))
			return value
		}

		// If object has an id property that's a string, map it
		if ('id' in value && typeof value.id === 'string') {
			return cb(value)
		}

		// Recursively process all object properties
		Object.entries(value).forEach(([key, propValue]) => {
			value[key] = collectAllIdsRecursively(propValue, cb)
		})

		return value
	}

	function mapObjectWithIdAndWriteSimple(obj: { id: string; fromId?: string; toId?: string }) {
		if (!originalIdsToSimpleIds.has(obj.id)) {
			const tId = `${nextSimpleId}`
			simpleIdsToOriginalIds.set(tId, obj.id)
			originalIdsToSimpleIds.set(obj.id, tId)
			nextSimpleId++
			obj.id = tId
		}

		if (obj.fromId && !originalIdsToSimpleIds.has(obj.fromId)) {
			const tId = `${nextSimpleId}`
			simpleIdsToOriginalIds.set(tId, obj.id)
			originalIdsToSimpleIds.set(obj.id, tId)
			nextSimpleId++
			obj.fromId = tId
		}

		if (obj.toId && !originalIdsToSimpleIds.has(obj.toId)) {
			const tId = `${nextSimpleId}`
			simpleIdsToOriginalIds.set(tId, obj.id)
			originalIdsToSimpleIds.set(obj.id, tId)
			nextSimpleId++
			obj.fromId = tId
		}
	}

	function writeOriginalIds(obj: { id: string; fromId?: string; toId?: string }) {
		const id = simpleIdsToOriginalIds.get(obj.id)
		if (id) {
			obj = { ...obj, id }
		}
		const fromId = simpleIdsToOriginalIds.get(obj.fromId)
		if (fromId) {
			obj = { ...obj, fromId }
		}
		const toId = simpleIdsToOriginalIds.get(obj.toId)
		if (toId) {
			obj = { ...obj, toId }
		}
		return obj
	}
})

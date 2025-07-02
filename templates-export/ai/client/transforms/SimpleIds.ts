import { TLAiChange, TLAiPrompt, TldrawAiTransform } from '@tldraw/ai'
import { createBindingId, createShapeId } from '@tldraw/tlschema'

export class SimpleIds extends TldrawAiTransform {
	originalIdsToSimpleIds = new Map()
	simpleIdsToOriginalIds = new Map()
	nextSimpleId = 0

	override transformPrompt = (input: TLAiPrompt) => {
		// Collect all ids, write simple ids, and write the simple ids
		for (const shape of input.canvasContent.shapes ?? []) {
			this.collectAllIdsRecursively(shape, this.mapObjectWithIdAndWriteSimple)
		}

		for (const binding of input.canvasContent.bindings ?? []) {
			this.collectAllIdsRecursively(binding, this.mapObjectWithIdAndWriteSimple)
		}

		return input
	}

	override transformChange = (change: TLAiChange): TLAiChange => {
		switch (change.type) {
			case 'createShape': {
				const { shape } = change
				const { id: simpleId } = shape
				const originalId = createShapeId(simpleId)
				this.originalIdsToSimpleIds.set(originalId, simpleId)
				this.simpleIdsToOriginalIds.set(simpleId, originalId)
				shape.id = originalId

				return {
					...change,
					shape,
				}
			}
			case 'updateShape': {
				const shape = this.collectAllIdsRecursively(change.shape, this.writeOriginalIds)

				return {
					...change,
					shape,
				}
			}
			case 'deleteShape': {
				const shapeId = this.simpleIdsToOriginalIds.get(change.shapeId)
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

				const { id: simpleId } = binding
				const originalId = createBindingId(simpleId)
				this.originalIdsToSimpleIds.set(originalId, simpleId)
				this.simpleIdsToOriginalIds.set(simpleId, originalId)
				binding.id = originalId

				binding = this.collectAllIdsRecursively(change.binding, this.writeOriginalIds)

				return {
					...change,
					binding,
				}
			}
			case 'updateBinding': {
				const binding = this.collectAllIdsRecursively(change.binding, this.writeOriginalIds)

				return {
					...change,
					binding,
				}
			}
			case 'deleteBinding': {
				const bindingId = this.simpleIdsToOriginalIds.get(change.bindingId)
				if (!bindingId) {
					throw new Error(`Binding id not found: ${change.bindingId}`)
				}
				return {
					...change,
					bindingId,
				}
			}
		}
	}

	private mapObjectWithIdAndWriteSimple = (obj: { id: string; fromId?: string; toId?: string }) => {
		const { originalIdsToSimpleIds, simpleIdsToOriginalIds, nextSimpleId } = this

		if (!originalIdsToSimpleIds.has(obj.id)) {
			const tId = `${nextSimpleId}`
			simpleIdsToOriginalIds.set(tId, obj.id)
			originalIdsToSimpleIds.set(obj.id, tId)
			this.nextSimpleId++
			obj.id = tId
		}

		if (obj.fromId && !originalIdsToSimpleIds.has(obj.fromId)) {
			const tId = `${nextSimpleId}`
			simpleIdsToOriginalIds.set(tId, obj.id)
			originalIdsToSimpleIds.set(obj.id, tId)
			this.nextSimpleId++
			obj.fromId = tId
		}

		if (obj.toId && !originalIdsToSimpleIds.has(obj.toId)) {
			const tId = `${nextSimpleId}`
			simpleIdsToOriginalIds.set(tId, obj.id)
			originalIdsToSimpleIds.set(obj.id, tId)
			this.nextSimpleId++
			obj.fromId = tId
		}
	}

	private writeOriginalIds = (obj: { id: string; fromId?: string; toId?: string }) => {
		const { simpleIdsToOriginalIds } = this
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

	private collectAllIdsRecursively(value: any, cb: (obj: any) => any) {
		if (!value || typeof value !== 'object') {
			return value
		}

		if (Array.isArray(value)) {
			value.forEach((item) => this.collectAllIdsRecursively(item, cb))
			return value
		}

		// If object has an id property that's a string, map it
		if ('id' in value && typeof value.id === 'string') {
			return cb(value)
		}

		// Recursively process all object properties
		Object.entries(value).forEach(([key, propValue]) => {
			value[key] = this.collectAllIdsRecursively(propValue, cb)
		})

		return value
	}
}

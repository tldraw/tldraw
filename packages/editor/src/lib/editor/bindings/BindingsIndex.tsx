import { Computed, computed } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { enableMapSet } from 'immer'
import { Editor } from '../Editor'
import { TLUnknownBinding } from './BindingsUtil'

enableMapSet()

export type BindingsForShape = {
	from: TLUnknownBinding[]
	to: TLUnknownBinding[]
}
export type BindingsIndex = Map<TLShapeId, BindingsForShape>

export const bindingsIndex = (editor: Editor): Computed<BindingsIndex> => {
	const { store } = editor
	const bindingUtils = Object.entries(editor.bindingUtils)
	const allRecordIds = store.query.ids('shape')

	const bindingsFromShape = store.createComputedCache('bindingsFromShape', (shape: TLShape) => {
		const results: TLUnknownBinding[] = []
		for (const [type, binding] of bindingUtils) {
			if (!binding) continue
			const bindingsFromShape = binding.getBindingsFromShape(shape)
			if (bindingsFromShape) {
				for (const bindingFromShape of bindingsFromShape) {
					assert(bindingFromShape.type === type, 'Binding type mismatch')
					if (!store.has(bindingFromShape.toId) || !store.has(bindingFromShape.fromId)) continue
					results.push(bindingFromShape)
				}
			}
		}
		return results
	})

	function fromScratch() {
		const index: BindingsIndex = new Map()

		for (const id of allRecordIds.get()) {
			const bindings = bindingsFromShape.get(id) ?? null

			let fromShapeIndex = index.get(id)
			if (!fromShapeIndex) {
				fromShapeIndex = { from: [], to: [] }
				index.set(id, fromShapeIndex)
			}

			if (!bindings) continue
			fromShapeIndex.from = bindings

			for (const binding of bindings) {
				const toShapeIndex = index.get(binding.toId)
				if (!toShapeIndex) {
					index.set(binding.toId, { from: [], to: [binding] })
				} else {
					toShapeIndex.to.push(binding)
				}
			}
		}

		return index
	}

	return computed<BindingsIndex>('arrowBindingsIndex', () => {
		// todo: make an incremental version of this
		return fromScratch()
	})
}

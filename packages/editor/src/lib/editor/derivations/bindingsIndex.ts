import { Computed, RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLArrowBinding, TLBinding, TLShapeId, TLUnknownBinding } from '@tldraw/tlschema'
import { objectMapValues } from '@tldraw/utils'
import { Editor } from '../Editor'

type TLBindingsIndex = Map<TLShapeId, TLBinding[]>

function fromScratch(bindingsQuery: Computed<(TLArrowBinding | TLUnknownBinding)[], unknown>) {
	const allBindings = bindingsQuery.get() as TLBinding[]

	const shapesToBindings: TLBindingsIndex = new Map()

	for (const binding of allBindings) {
		const { fromId, toId } = binding
		const bindingsForFromShape = shapesToBindings.get(fromId)
		if (!bindingsForFromShape) {
			shapesToBindings.set(fromId, [binding])
		} else {
			bindingsForFromShape.push(binding)
		}
		const bindingsForToShape = shapesToBindings.get(toId)
		if (!bindingsForToShape) {
			shapesToBindings.set(toId, [binding])
		} else {
			bindingsForToShape.push(binding)
		}
	}

	return shapesToBindings
}

export const bindingsIndex = (editor: Editor): Computed<TLBindingsIndex> => {
	const { store } = editor
	const bindingsHistory = store.query.filterHistory('binding')
	const bindingsQuery = store.query.records('binding')

	return computed<TLBindingsIndex>('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
		if (isUninitialized(_lastValue)) {
			return fromScratch(bindingsQuery)
		}

		const lastValue = _lastValue

		const diff = bindingsHistory.getDiffSince(lastComputedEpoch)

		if (diff === RESET_VALUE) {
			return fromScratch(bindingsQuery)
		}

		let nextValue: TLBindingsIndex | undefined = undefined

		function removingBinding(binding: TLBinding) {
			nextValue ??= new Map(lastValue)
			const prevFrom = nextValue.get(binding.fromId)
			const nextFrom = prevFrom?.filter((b) => b.id !== binding.id)
			if (!nextFrom?.length) {
				nextValue.delete(binding.fromId)
			} else {
				nextValue.set(binding.fromId, nextFrom)
			}
			const prevTo = nextValue.get(binding.toId)
			const nextTo = prevTo?.filter((b) => b.id !== binding.id)
			if (!nextTo?.length) {
				nextValue.delete(binding.toId)
			} else {
				nextValue.set(binding.toId, nextTo)
			}
		}

		function ensureNewArray(shapeId: TLShapeId) {
			nextValue ??= new Map(lastValue)

			let result = nextValue.get(shapeId)
			if (!result) {
				result = []
				nextValue.set(shapeId, result)
			} else if (result === lastValue.get(shapeId)) {
				result = result.slice(0)
				nextValue.set(shapeId, result)
			}
			return result
		}

		function addBinding(binding: TLBinding) {
			ensureNewArray(binding.fromId).push(binding)
			ensureNewArray(binding.toId).push(binding)
		}

		for (const changes of diff) {
			for (const newBinding of objectMapValues(changes.added)) {
				addBinding(newBinding)
			}

			for (const [prev, next] of objectMapValues(changes.updated)) {
				removingBinding(prev)
				addBinding(next)
			}

			for (const prev of objectMapValues(changes.removed)) {
				removingBinding(prev)
			}
		}

		// TODO: add diff entries if we need them
		return nextValue ?? lastValue
	})
}

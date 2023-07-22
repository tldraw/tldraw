import { Computed, RESET_VALUE, computed, isUninitialized } from '@tldraw/state'
import { TLArrowShape, TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../Editor'

export type TLArrowBindingsIndex = Record<
	TLShapeId,
	undefined | { arrowId: TLShapeId; handleId: 'start' | 'end' }[]
>

export const arrowBindingsIndex = (editor: Editor): Computed<TLArrowBindingsIndex> => {
	const { store } = editor
	const shapeHistory = store.query.filterHistory('shape')
	const arrowQuery = store.query.records('shape', () => ({ type: { eq: 'arrow' as const } }))
	function fromScratch() {
		const allArrows = arrowQuery.value as TLArrowShape[]

		const bindings2Arrows: TLArrowBindingsIndex = {}

		for (const arrow of allArrows) {
			const { start, end } = arrow.props
			if (start.type === 'binding') {
				const arrows = bindings2Arrows[start.boundShapeId]
				if (arrows) arrows.push({ arrowId: arrow.id, handleId: 'start' })
				else bindings2Arrows[start.boundShapeId] = [{ arrowId: arrow.id, handleId: 'start' }]
			}

			if (end.type === 'binding') {
				const arrows = bindings2Arrows[end.boundShapeId]
				if (arrows) arrows.push({ arrowId: arrow.id, handleId: 'end' })
				else bindings2Arrows[end.boundShapeId] = [{ arrowId: arrow.id, handleId: 'end' }]
			}
		}

		return bindings2Arrows
	}

	return computed<TLArrowBindingsIndex>('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
		if (isUninitialized(_lastValue)) {
			return fromScratch()
		}

		const lastValue = _lastValue

		const diff = shapeHistory.getDiffSince(lastComputedEpoch)

		if (diff === RESET_VALUE) {
			return fromScratch()
		}

		let nextValue: TLArrowBindingsIndex | undefined = undefined

		function ensureNewArray(boundShapeId: TLShapeId) {
			// this will never happen
			if (!nextValue) {
				nextValue = { ...lastValue }
			}
			if (!nextValue[boundShapeId]) {
				nextValue[boundShapeId] = []
			} else if (nextValue[boundShapeId] === lastValue[boundShapeId]) {
				nextValue[boundShapeId] = [...nextValue[boundShapeId]!]
			}
		}

		function removingBinding(
			boundShapeId: TLShapeId,
			arrowId: TLShapeId,
			handleId: 'start' | 'end'
		) {
			ensureNewArray(boundShapeId)
			nextValue![boundShapeId] = nextValue![boundShapeId]!.filter(
				(binding) => binding.arrowId !== arrowId || binding.handleId !== handleId
			)
			if (nextValue![boundShapeId]!.length === 0) {
				delete nextValue![boundShapeId]
			}
		}

		function addBinding(boundShapeId: TLShapeId, arrowId: TLShapeId, handleId: 'start' | 'end') {
			ensureNewArray(boundShapeId)
			nextValue![boundShapeId]!.push({ arrowId, handleId })
		}

		for (const changes of diff) {
			for (const newShape of Object.values(changes.added)) {
				if (editor.isShapeOfType<TLArrowShape>(newShape, 'arrow')) {
					const { start, end } = newShape.props
					if (start.type === 'binding') {
						addBinding(start.boundShapeId, newShape.id, 'start')
					}
					if (end.type === 'binding') {
						addBinding(end.boundShapeId, newShape.id, 'end')
					}
				}
			}

			for (const [prev, next] of Object.values(changes.updated) as [TLShape, TLShape][]) {
				if (
					!editor.isShapeOfType<TLArrowShape>(prev, 'arrow') ||
					!editor.isShapeOfType<TLArrowShape>(next, 'arrow')
				)
					continue

				for (const handle of ['start', 'end'] as const) {
					const prevTerminal = prev.props[handle]
					const nextTerminal = next.props[handle]

					if (prevTerminal.type === 'binding' && nextTerminal.type === 'point') {
						// if the binding was removed
						removingBinding(prevTerminal.boundShapeId, prev.id, handle)
					} else if (prevTerminal.type === 'point' && nextTerminal.type === 'binding') {
						// if the binding was added
						addBinding(nextTerminal.boundShapeId, next.id, handle)
					} else if (
						prevTerminal.type === 'binding' &&
						nextTerminal.type === 'binding' &&
						prevTerminal.boundShapeId !== nextTerminal.boundShapeId
					) {
						// if the binding was changed
						removingBinding(prevTerminal.boundShapeId, prev.id, handle)
						addBinding(nextTerminal.boundShapeId, next.id, handle)
					}
				}
			}

			for (const prev of Object.values(changes.removed)) {
				if (editor.isShapeOfType<TLArrowShape>(prev, 'arrow')) {
					const { start, end } = prev.props
					if (start.type === 'binding') {
						removingBinding(start.boundShapeId, prev.id, 'start')
					}
					if (end.type === 'binding') {
						removingBinding(end.boundShapeId, prev.id, 'end')
					}
				}
			}
		}

		// TODO: add diff entries if we need them
		return nextValue ?? lastValue
	})
}

import { isUninitialized, RESET_VALUE } from '@tldraw/state'
import { useMemo, useRef } from 'react'
import { computed, Editor, isShape, Tldraw, TLShapeId, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

export default function DerivedViewExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="derived-view">
				<ShowNumberOfDrawShapesOnPage />
			</Tldraw>
		</div>
	)
}

function ShowNumberOfDrawShapesOnPage() {
	const editor = useEditor()
	const rRenders = useRef(0)

	// Create a computed value that tracks the number of draw shapes in the document, returning a set of ids
	const computed = useMemo(() => deriveNumberOfDrawShapesInDocument(editor), [editor])
	// Get the size of the computed value whenever the computed value changes
	const value = useValue('computed value', () => computed.get().size, [computed])

	return (
		<div style={{ position: 'absolute', top: 50, left: 20, zIndex: 99999 }}>
			<p>{value} draw shapes in project</p>
			{/* Will go up by two in dev, NAB */}
			<p>{rRenders.current++} renders</p>
		</div>
	)
}

export const deriveNumberOfDrawShapesInDocument = (editor: Editor) => {
	const { store } = editor
	const shapesIndex = store.query.ids('shape')

	// Create an index of all the shape ids of all the draw shapes
	function fromScratch() {
		return new Set([...shapesIndex.get()].filter((id) => editor.getShape(id)!.type === 'draw'))
	}

	return computed<Set<TLShapeId>>('_shapeIdsInCurrentPage', (prevValue, lastComputedEpoch) => {
		// On first load, return the initial value
		if (isUninitialized(prevValue)) {
			return fromScratch()
		}

		// Get the changes since the last computed value
		const diff = store.history.getDiffSince(lastComputedEpoch)

		// Something caused the store to reset, compute a new value from scratch
		if (diff === RESET_VALUE) {
			return fromScratch()
		}

		// This will be the new set that includes the changes, if we find any
		let nextValue: Set<TLShapeId> | undefined

		for (const changes of diff) {
			// Check all of the added records for new draw shapes
			for (const record of Object.values(changes.added)) {
				if (isShape(record) && record.type === 'draw') {
					// If we haven't created the new set yet, do it now
					if (!nextValue) {
						nextValue = new Set(prevValue)
					}
					// mutate the new set
					nextValue.add(record.id)
				}
			}

			for (const record of Object.values(changes.removed)) {
				// Check all of the removed records for deleted draw shapes
				if (isShape(record) && record.type === 'draw') {
					// If we haven't created the new set yet, do it now
					if (!nextValue) {
						nextValue = new Set(prevValue)
					}
					// mutate the new set
					nextValue.delete(record.id)
				}
			}
		}

		// if something changed, return the new value
		if (nextValue) return nextValue

		// if nothing changed, return the previous value
		return prevValue
	})
}

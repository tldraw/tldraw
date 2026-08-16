import { useMemo } from 'react'
import {
	computed,
	Editor,
	isShape,
	isUninitialized,
	RESET_VALUE,
	TLComponents,
	Tldraw,
	TLShapeId,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

function DrawShapeCounter() {
	const editor = useEditor()

	// [1]
	const drawShapeIds = useMemo(() => deriveDrawShapeIds(editor), [editor])
	const count = useValue('draw shape count', () => drawShapeIds.get().size, [drawShapeIds])

	return (
		<div className="tlui-menu" style={{ padding: '4px 8px' }}>
			{count} draw shapes in document
		</div>
	)
}

const components: TLComponents = {
	TopPanel: DrawShapeCounter,
}

export default function DerivedViewExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="derived-view" components={components} />
		</div>
	)
}

// [2]
export function deriveDrawShapeIds(editor: Editor) {
	const { store } = editor
	const shapeIds = store.query.ids('shape')

	function fromScratch() {
		return new Set([...shapeIds.get()].filter((id) => editor.getShape(id)!.type === 'draw'))
	}

	return computed<Set<TLShapeId>>('drawShapeIds', (prevValue, lastComputedEpoch) => {
		// [3]
		if (isUninitialized(prevValue)) {
			return fromScratch()
		}

		// [4]
		const diff = store.history.getDiffSince(lastComputedEpoch)
		if (diff === RESET_VALUE) {
			return fromScratch()
		}

		// [5]
		let nextValue: Set<TLShapeId> | undefined

		for (const changes of diff) {
			for (const record of Object.values(changes.added)) {
				if (isShape(record) && record.type === 'draw') {
					nextValue ??= new Set(prevValue)
					nextValue.add(record.id)
				}
			}

			for (const record of Object.values(changes.removed)) {
				if (isShape(record) && record.type === 'draw') {
					nextValue ??= new Set(prevValue)
					nextValue.delete(record.id)
				}
			}
		}

		// [6]
		return nextValue ?? prevValue
	})
}

/*
Signals let you derive a value from the store and have it stay up to date. The naive way to
count draw shapes is to loop over every shape each time anything changes. That's fine for
small documents, but on large ones it's wasted work: most changes don't touch draw shapes at
all. This example builds a computed set of draw shape ids that updates itself incrementally
from the store's change history.

[1]
The derivation is created once per editor and read with `useValue`. Since `useValue` only
re-renders when the returned value changes, and we return the set's size, moving or restyling
shapes doesn't re-render this component at all.

[2]
`store.query.ids('shape')` is a reactive set of every shape id in the store. We only use it for
the from-scratch pass; the incremental path reads diffs instead.

[3]
The first time a `computed` runs, `prevValue` is a special uninitialized sentinel, so there's
nothing to diff against and we compute from scratch.

[4]
`store.history` is an atom whose value is a change counter and whose diffs are the record
changes between updates. `getDiffSince(lastComputedEpoch)` returns every change since our last
run, or `RESET_VALUE` if the history buffer no longer goes back that far (or the store was
reset), in which case we start over.

[5]
Walk the diffs and only allocate a new set if a draw shape was actually added or removed.
Updates to existing draw shapes don't change membership, so we skip `changes.updated`.

[6]
Returning `prevValue` when nothing changed means downstream signals (and `useValue`) see the
same reference and don't recompute. That's what makes the incremental approach cheap.
*/

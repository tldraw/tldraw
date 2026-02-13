import { useCallback, useEffect, useRef, useState } from 'react'
import {
	RecordsDiff,
	TLComponents,
	TLEditorSnapshot,
	TLEventMapHandler,
	TLRecord,
	Tldraw,
	squashRecordDiffs,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

function SaveButton() {
	const editor = useEditor()
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

	const rUnsavedChanges = useRef<RecordsDiff<TLRecord>>({ added: {}, removed: {}, updated: {} })

	useEffect(() => {
		// [1]
		const handleDocumentChange: TLEventMapHandler<'change'> = (diff) => {
			squashRecordDiffs([rUnsavedChanges.current, diff.changes], { mutateFirstDiff: true })
			setHasUnsavedChanges(
				!isPlainObjectEmpty(rUnsavedChanges.current.added) ||
					!isPlainObjectEmpty(rUnsavedChanges.current.removed) ||
					!isPlainObjectEmpty(rUnsavedChanges.current.updated)
			)
		}

		// [2]
		return editor.store.listen(handleDocumentChange, { scope: 'document' })
	}, [editor])

	// [3]
	const handleSave = useCallback(() => {
		// The diff is the difference between the current document and the last saved document
		const diff = rUnsavedChanges.current

		// Maybe also get the current document / schema snapshot
		const snapshot = editor.getSnapshot()

		// Save everything somewhere...
		saveChanges(diff, snapshot)

		// Clear the unsaved changes state
		setHasUnsavedChanges(false)

		// Reset the diff
		rUnsavedChanges.current = {
			added: {},
			removed: {},
			updated: {},
		}
	}, [editor])

	return (
		<button
			onClick={handleSave}
			disabled={!hasUnsavedChanges}
			style={{
				pointerEvents: 'all',
				padding: '8px 16px',
				marginTop: '6px',
				backgroundColor: hasUnsavedChanges ? '#2d7d32' : '#ccc',
				color: hasUnsavedChanges ? 'white' : '#666',
				border: 'none',
				borderRadius: '4px',
				cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
				fontWeight: '500',
			}}
		>
			{hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
		</button>
	)
}

function saveChanges(_diff: RecordsDiff<TLRecord>, _snapshot: TLEditorSnapshot) {
	// todo: do something with the diff, or save the whole document snapshot somewhere
}

function isPlainObjectEmpty(obj: object) {
	for (const key in obj) return false
	return true
}

// [4]
const components: TLComponents = {
	TopPanel: SaveButton,
}

export default function UnsavedChangesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
This example shows how to track unsaved changes in a tldraw document using the store's 
listen method with document scope, and how to accumulate a diff of all changes since 
the last save.

[1]
We create a handler that will be called whenever there are changes to the document. 
The handler receives a diff of the changes that occurred. We use `squashRecordDiffs` 
to accumulate all changes since the last save into a single diff object. This gives 
us a complete picture of what has changed without storing redundant intermediate states.

[2]
We listen to store changes with the 'document' scope, which means we only get notified 
about changes to document content (shapes, pages, etc.) and not to instance data like 
camera position or selected shapes. 

[3]
The save function demonstrates how you might handle saving in a real application. We 
pass both the accumulated diff (showing exactly what changed since last save) and a 
complete snapshot of the current document state to our save function. After saving, 
we reset both the unsaved changes flag and the accumulated diff. In a real application, 
you might send just the diff to minimize bandwidth, or save the full snapshot for 
simpler server-side handling.

[4]
We define our component overrides outside of the React component to keep them static. 
This prevents unnecessary re-renders and follows React best practices. The SaveButton 
component is placed in the TopPanel to provide a prominent save interface.
*/

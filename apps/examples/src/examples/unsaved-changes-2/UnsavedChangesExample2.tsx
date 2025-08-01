import { useCallback, useEffect, useRef, useState } from 'react'
import { TLComponents, TLEditorSnapshot, TLEventMapHandler, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

function SaveButton() {
	const editor = useEditor()
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

	const rSnapshot = useRef<TLEditorSnapshot>()

	useEffect(() => {
		rSnapshot.current = editor.getSnapshot()

		// [1]
		const handleDocumentChange: TLEventMapHandler<'change'> = () => {
			const prevSnapshot = rSnapshot.current
			const currentSnapshot = editor.getSnapshot()
			setHasUnsavedChanges(JSON.stringify(prevSnapshot) !== JSON.stringify(currentSnapshot))
		}

		// [2]
		const cleanupFunction = editor.store.listen(handleDocumentChange, {
			source: 'user',
			scope: 'document',
		})

		return cleanupFunction
	}, [editor])

	// [3]
	const handleSave = useCallback(() => {
		const snapshot = editor.getSnapshot()
		// Save everything somewhere...
		saveChanges(snapshot)

		// Clear the unsaved changes state
		setHasUnsavedChanges(false)

		// Reset the snapshot
		rSnapshot.current = snapshot
	}, [editor])

	return (
		<button
			onClick={handleSave}
			disabled={!hasUnsavedChanges}
			style={{
				pointerEvents: 'all',
				padding: '8px 16px',
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

const saveChanges = (_snapshot: TLEditorSnapshot) => {
	// todo: do something with the snapshot, or save it somewhere
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
This example shows an alternative approach to tracking unsaved changes in a tldraw 
document by comparing full document snapshots rather than accumulating diffs.

[1]
We create a handler that compares the current document snapshot to our saved reference 
snapshot. When changes occur, we get a fresh snapshot and compare it to the last saved 
state using JSON string comparison. This is simpler than diff accumulation but may be 
less efficient for very large documents since we serialize the entire state on each change.

[2]
We listen to store changes with the 'document' scope, which means we only get notified 
about changes to document content (shapes, pages, etc.) and not to instance data like 
camera position or selected shapes. We also filter to only 'user' changes, excluding 
programmatic changes.

[3]
The save function stores a complete snapshot of the current document state. This approach 
is simpler to implement and understand since you always have the full document state 
rather than needing to apply diffs. After saving, we update our reference snapshot to 
the current state. This approach works well for most applications, though the diff-based 
approach may be more efficient for very large documents or when bandwidth is a concern.

[4]
We define our component overrides outside of the React component to keep them static. 
This prevents unnecessary re-renders and follows React best practices. The SaveButton 
component is placed in the TopPanel to provide a prominent save interface.
*/

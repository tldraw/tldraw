import { useCallback, useEffect, useRef, useState } from 'react'
import {
	RecordsDiff,
	TLComponents,
	TLEditorSnapshot,
	TLEventMapHandler,
	TLRecord,
	Tldraw,
	TldrawUiButton,
	squashRecordDiffs,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

function emptyDiff(): RecordsDiff<TLRecord> {
	return { added: {}, removed: {}, updated: {} }
}

function SaveButton() {
	const editor = useEditor()
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

	// [1]
	const rUnsavedChanges = useRef<RecordsDiff<TLRecord>>(emptyDiff())

	useEffect(() => {
		const handleDocumentChange: TLEventMapHandler<'change'> = (entry) => {
			squashRecordDiffs([rUnsavedChanges.current, entry.changes], { mutateFirstDiff: true })
			setHasUnsavedChanges(!isDiffEmpty(rUnsavedChanges.current))
		}

		// [2]
		return editor.store.listen(handleDocumentChange, { scope: 'document' })
	}, [editor])

	// [3]
	const handleSave = useCallback(() => {
		saveChanges(rUnsavedChanges.current, editor.getSnapshot())
		rUnsavedChanges.current = emptyDiff()
		setHasUnsavedChanges(false)
	}, [editor])

	return (
		<div className="tlui-menu">
			<TldrawUiButton type="normal" onClick={handleSave} disabled={!hasUnsavedChanges}>
				{hasUnsavedChanges ? 'Save changes' : 'No changes'}
			</TldrawUiButton>
		</div>
	)
}

function saveChanges(_diff: RecordsDiff<TLRecord>, _snapshot: TLEditorSnapshot) {
	// Send the diff or the snapshot to your server here.
}

function isDiffEmpty(diff: RecordsDiff<TLRecord>) {
	for (const key in diff.added) return false
	for (const key in diff.removed) return false
	for (const key in diff.updated) return false
	return true
}

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
[1]
Rather than a boolean "dirty" flag, we accumulate every change since the last save into a
single `RecordsDiff`. `squashRecordDiffs` folds each new transaction into it, so a shape that
was created and then deleted cancels out, and a shape edited ten times shows up as one update
from its saved state to its current state. Because the squash mutates in place, this lives in
a ref rather than React state; the boolean state is only there to re-render the button.

[2]
`scope: 'document'` limits the listener to records that are part of the persisted document
(shapes, pages, assets, bindings, the document record). Session state like the camera,
selection, and current page still writes to the store but shouldn't count as unsaved work.
`store.listen` returns its unsubscribe function, so it doubles as the effect's cleanup.

[3]
When saving, you have two things to send: the accumulated diff (small, and exactly what
changed) or a full snapshot from `editor.getSnapshot()` (simpler to store and restore). Which
you use depends on your backend. Either way, reset the diff afterwards so it starts tracking
from the newly saved state.
*/

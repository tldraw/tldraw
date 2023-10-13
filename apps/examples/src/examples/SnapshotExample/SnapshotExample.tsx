import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import jsonSnapshot from './snapshot.json'
// ^^^
// This snapshot was previously created with `editor.store.getSnapshot()`
// We'll now load this into the editor with `editor.store.loadSnapshot()`.
// Loading it also migrates the snapshot, so even though the snapshot was
// created in the past (potentially a few versions ago) it should load
// successfully.

const LOAD_SNAPSHOT_WITH_INITIAL_DATA = true

export default function SnapshotExample() {
	if (LOAD_SNAPSHOT_WITH_INITIAL_DATA) {
		// If you want to use the snapshot as the store's initial data, you can do so like this:
		return (
			<div className="tldraw__editor">
				<Tldraw snapshot={jsonSnapshot} />
			</div>
		)
	}

	// You can also load the snapshot an existing editor instance afterwards. Note that this
	// does not create a new editor, and doesn't change the editor's state or the editor's undo
	// history, so you should only ever use this on mount.
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					editor.store.loadSnapshot(jsonSnapshot)
				}}
			/>
		</div>
	)
}

// Tips:
// Want to migrate a snapshot but not load it? Use `editor.store.migrateSnapshot()`

import { TLStoreSnapshot, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import _jsonSnapshot from './snapshot.json'

const jsonSnapshot = _jsonSnapshot as TLStoreSnapshot

// There's a guide at the bottom of this file!

const LOAD_SNAPSHOT_WITH_INITIAL_DATA = true

//[1]
export default function SnapshotExample() {
	if (LOAD_SNAPSHOT_WITH_INITIAL_DATA) {
		return (
			<div className="tldraw__editor">
				<Tldraw snapshot={jsonSnapshot} />
			</div>
		)
	}
	//[2]
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
/*
This example shows how to load a snapshot into the editor. Thanks to our 
migration system, you can load snapshots from any version of Tldraw. The
snapshot we're using can be found in the snapshot.json file in this folder.
You can generate a snapshot by using editor.store.getSnapshot().

There are two ways to load a snapshot:

[1] Via the `snapshot` prop of the Tldraw component.

[2] Using editor.store.loadSnapshot() in the callback of the onMount prop of the
	Tldraw component.


Tips:
Want to migrate a snapshot but not load it? Use `editor.store.migrateSnapshot()`
 */

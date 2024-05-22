import { useCallback, useRef } from 'react'
import { Editor, TLEditorSnapshot, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import _jsonSnapshot from './snapshot.json'

const jsonSnapshot = _jsonSnapshot as any as TLEditorSnapshot

// There's a guide at the bottom of this file!

export default function SnapshotExample() {
	const editorRef = useRef<Editor | null>(null)

	const save = useCallback(() => {
		if (!editorRef.current) return
		const { document, session } = editorRef.current.getSnapshot()
		// The 'document' state is the list of shapes and pages etc
		// The 'session' state is the state of the editor like the current page, camera positions, zoom level, etc
		// You probably need to store these separately if you're building a multi-user app.
		localStorage.setItem('snapshot', JSON.stringify({ document, session }))
	}, [])

	const load = useCallback(() => {
		const snapshot = localStorage.getItem('snapshot')
		if (!snapshot) return
		editorRef.current?.loadSnapshot(JSON.parse(snapshot))
		// You can combine the `document` and `session` states into a single snapshot object to load it back into the editor.
		// Alternatively you can call loadSnapshot on the editor instance with the `document` and `session` states separately, but
		// make sure you pass the `document` state first
		// e.g.
		//   editorRef.current?.loadSnapshot({ document })
		// then later
		//   editorRef.current?.loadSnapshot({ session })
	}, [])

	//[2]
	return (
		<div className="tldraw__editor">
			<Tldraw
				snapshot={jsonSnapshot}
				onMount={(editor) => {
					editorRef.current = editor
				}}
				components={{
					SharePanel: () => {
						return (
							<div style={{ padding: 20, pointerEvents: 'all' }}>
								<button onClick={save}>Save</button>
								<button onClick={load}>Load</button>
							</div>
						)
					},
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

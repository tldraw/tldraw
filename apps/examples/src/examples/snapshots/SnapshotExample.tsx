import { useCallback, useEffect, useState } from 'react'
import { TLEditorSnapshot, Tldraw, getSnapshot, loadSnapshot, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import _jsonSnapshot from './snapshot.json'

// There's a guide at the bottom of this file!

const jsonSnapshot = _jsonSnapshot as any as TLEditorSnapshot

// [1]
function SnapshotToolbar() {
	const editor = useEditor()

	const save = useCallback(() => {
		// [2]
		const { document, session } = getSnapshot(editor.store)
		// [3]
		localStorage.setItem('snapshot', JSON.stringify({ document, session }))
	}, [editor])

	const load = useCallback(() => {
		const snapshot = localStorage.getItem('snapshot')
		if (!snapshot) return

		// [4]
		loadSnapshot(editor.store, JSON.parse(snapshot))
	}, [editor])

	const [showCheckMark, setShowCheckMark] = useState(false)
	useEffect(() => {
		if (showCheckMark) {
			const timeout = setTimeout(() => {
				setShowCheckMark(false)
			}, 1000)
			return () => clearTimeout(timeout)
		}
		return
	})

	return (
		<div style={{ padding: 20, pointerEvents: 'all', display: 'flex', gap: '10px' }}>
			<span
				style={{
					display: 'inline-block',
					transition: 'transform 0.2s ease, opacity 0.2s ease',
					transform: showCheckMark ? `scale(1)` : `scale(0.5)`,
					opacity: showCheckMark ? 1 : 0,
				}}
			>
				Saved ✅
			</span>
			<button
				onClick={() => {
					save()
					setShowCheckMark(true)
				}}
			>
				Save Snapshot
			</button>
			<button onClick={load}>Load Snapshot</button>
		</div>
	)
}

export default function SnapshotExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [5]
				snapshot={jsonSnapshot}
				components={{
					SharePanel: SnapshotToolbar,
				}}
			/>
		</div>
	)
}

/*

[1] We'll add a toolbar to the top-right of the editor viewport that allows the user to save and load snapshots.

[2] Call `getSnapshot(editor.store)` to get the current state of the editor

[3] The 'document' state is the set of shapes and pages and images etc.
The 'session' state is the state of the editor like the current page, camera positions, zoom level, etc.
You probably need to store these separately if you're building a multi-user app, so that you can store per-user session state.
For this example we'll just store them together in localStorage.

[4] Call `loadSnapshot()` to load a snapshot into the editor
You can omit the `session` state, or load it later on its own.
e.g.
	loadSnapshot(editor.store, { document })
then optionally later
	loadSnapshot(editor.store, { session })

[5] You can load an initial snapshot into the editor by passing it to the `snapshot` prop.

*/

import { useEffect, useState } from 'react'
import {
	getSnapshot,
	loadSnapshot,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TLEditorSnapshot,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import _jsonSnapshot from './snapshot.json'
import './snapshots.css'

// There's a guide at the bottom of this file!

const jsonSnapshot = _jsonSnapshot as any as TLEditorSnapshot

function SnapshotToolbar() {
	const editor = useEditor()
	const [showCheckMark, setShowCheckMark] = useState(false)

	const save = () => {
		// [1]
		const { document, session } = getSnapshot(editor.store)
		localStorage.setItem('snapshot', JSON.stringify({ document, session }))
		setShowCheckMark(true)
	}

	const load = () => {
		const snapshot = localStorage.getItem('snapshot')
		if (!snapshot) return
		// [2]
		loadSnapshot(editor.store, JSON.parse(snapshot))
	}

	useEffect(() => {
		if (!showCheckMark) return
		const timeout = setTimeout(() => setShowCheckMark(false), 1000)
		return () => clearTimeout(timeout)
	}, [showCheckMark])

	return (
		<div className="tlui-menu snapshot-toolbar">
			<span className="snapshot-saved" data-visible={showCheckMark}>
				Saved
			</span>
			<TldrawUiButton type="normal" onClick={save}>
				Save snapshot
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={load}>
				Load snapshot
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	SharePanel: SnapshotToolbar,
}

export default function SnapshotExample() {
	return (
		<div className="tldraw__editor">
			{/* [3] */}
			<Tldraw snapshot={jsonSnapshot} components={components} />
		</div>
	)
}

/*
[1]
`getSnapshot(editor.store)` returns `{ document, session }`. `document` is the content: pages, shapes,
assets, and so on. `session` is per-user editor state such as the current page, camera, and selection.
In a multi-user app you'd usually store these separately so each user keeps their own session. Here we
store both together in localStorage.

[2]
`loadSnapshot(editor.store, snapshot)` restores it. You can pass just `{ document }` and load
`{ session }` later on its own, or skip the session entirely.

[3]
Passing a snapshot to the `snapshot` prop loads it into the store when the editor is created, so the
editor starts with content.
*/

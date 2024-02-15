import { Editor, StoreSnapshot, TLPageId, TLRecord, Tldraw, TldrawImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'
import initialSnapshot from './snapshot.json'

export default function SnapshotImageExample() {
	const [editor, setEditor] = useState<Editor>()
	const [snapshot, setSnapshot] = useState<StoreSnapshot<TLRecord>>(initialSnapshot)
	const [pageId, setPageId] = useState<TLPageId | undefined>()
	const [editing, setEditing] = useState(false)

	const editDrawing = useCallback(() => {
		setEditing(true)
	}, [])

	const saveDrawing = useCallback(() => {
		if (!editor) return
		setPageId(editor.getCurrentPageId())
		setSnapshot(editor.store.getSnapshot())
		setEditing(false)
	}, [editor])

	const handleMount = useCallback(
		(editor: Editor) => {
			setEditor(editor)
			if (pageId) editor.setCurrentPage(pageId)
		},
		[pageId]
	)

	return (
		<div style={{ padding: 30 }}>
			<button
				style={{ cursor: 'pointer', fontSize: 18 }}
				onClick={editing ? saveDrawing : editDrawing}
			>
				{editing ? '✓ Save drawing' : '✎ Edit drawing'}
			</button>
			<div style={{ width: 600, height: 450, marginTop: 15 }}>
				{editing ? (
					<Tldraw snapshot={snapshot} onMount={handleMount} />
				) : (
					<TldrawImage
						snapshot={snapshot}
						pageId={pageId}
						opts={{ background: false, darkMode: false }}
					/>
				)}
			</div>
		</div>
	)
}

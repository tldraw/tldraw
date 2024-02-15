import { Editor, StoreSnapshot, TLPageId, TLRecord, Tldraw, TldrawImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'
import initialSnapshot from './snapshot.json'

// There's a guide at the bottom of this file!

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
						//[1]
						snapshot={snapshot}
						// [2]
						pageId={pageId}
						// [3]
						opts={{ background: false, darkMode: false }}
					/>
				)}
			</div>
		</div>
	)
}

/*
This example shows how to use the `TldrawImage` component to display a snapshot
as an image. The example also allows you to toggle between editing the snapshot
and viewing it.

[1] Pass your snapshot to the `snapshot` prop of the `TldrawImage` component.

[2] You can specify which page to display by using the `pageId` prop. By
    default, the first page is shown.
	
[3] You can customize the appearance of the image by passing options to the
    `opts` prop. Try changing the `background` and `darkMode` options to see
    their effects.

 */

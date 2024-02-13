import { Editor, StoreSnapshot, TLRecord, Tldraw, TldrawImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'
import initialSnapshot from './snapshot.json'

export default function SnapshotImageExample() {
	const [editor, setEditor] = useState<Editor>()
	const [snapshot, setSnapshot] = useState<StoreSnapshot<TLRecord> | undefined>(initialSnapshot)
	const [editing, setEditing] = useState(false)

	const editDrawing = useCallback(() => {
		setEditing(true)
	}, [])

	const saveDrawing = useCallback(() => {
		const snapshot = editor?.store.getSnapshot()
		setSnapshot(snapshot)
		setEditing(false)
	}, [editor])

	return (
		<div style={{ padding: 30 }}>
			<button
				style={{ cursor: 'pointer', fontSize: 18 }}
				onClick={editing ? saveDrawing : editDrawing}
			>
				{editing ? '✓ Save drawing' : '✎ Edit drawing'}
			</button>
			<div style={{ width: 600, height: 450, marginTop: 15, overflow: 'hidden' }}>
				{editing ? (
					<Tldraw snapshot={snapshot} onMount={(editor) => setEditor(editor)} />
				) : (
					<TldrawImage snapshot={snapshot} opts={{ background: false }} />
				)}
			</div>
		</div>
	)
}

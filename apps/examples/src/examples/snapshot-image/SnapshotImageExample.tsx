import { Editor, StoreSnapshot, TLRecord, Tldraw, TldrawImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useState } from 'react'
import initialSnapshot from './snapshot.json'

export default function SnapshotImageExample() {
	const [editor, setEditor] = useState<Editor>()

	const [editing, setEditing] = useState(false)
	const [snapshot, setSnapshot] = useState<StoreSnapshot<TLRecord> | undefined>(initialSnapshot)

	return (
		<div
			style={{
				padding: 32,
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				alignItems: 'flex-start',
			}}
		>
			{editing ? (
				<button
					style={{
						cursor: 'pointer',
						fontSize: 18,
					}}
					onClick={() => {
						const snapshot = editor?.store.getSnapshot()
						setSnapshot(snapshot)
						setEditing(false)
					}}
				>
					✓ Save drawing
				</button>
			) : (
				<button
					style={{
						cursor: 'pointer',
						fontSize: 18,
					}}
					onClick={() => {
						setEditing(true)
					}}
				>
					✎ Edit drawing
				</button>
			)}
			<div style={{ width: 600, height: 450, overflow: 'hidden' }}>
				{editing ? (
					<Tldraw
						snapshot={snapshot}
						onMount={(editor) => {
							setEditor(editor)
						}}
					/>
				) : (
					<TldrawImage
						snapshot={snapshot}
						opts={{
							// Customise the appearance of the image by changing these options
							background: false,
							darkMode: true,
						}}
					/>
				)}
			</div>
		</div>
	)
}

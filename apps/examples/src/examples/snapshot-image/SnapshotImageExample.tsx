import { Editor, StoreSnapshot, TLRecord, Tldraw, TldrawImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useState } from 'react'
import initialSnapshot from './snapshot.json'

export default function SnapshotImageExample() {
	const [editor, setEditor] = useState<Editor>()

	const [shouldShowImage, setShouldShowImage] = useState(true)
	const [snapshot, setSnapshot] = useState<StoreSnapshot<TLRecord> | undefined>(initialSnapshot)

	const updateImageToggle = useCallback(
		(value: boolean) => {
			if (value) {
				const snapshot = editor?.store.getSnapshot()
				setSnapshot(snapshot)
			}
			setShouldShowImage(value)
		},
		[editor]
	)

	return (
		<div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div style={{ display: 'flex', gap: 5 }}>
				<input
					id="toggle-image-checkbox"
					type="checkbox"
					checked={shouldShowImage}
					onChange={(e) => updateImageToggle(e.target.checked)}
				/>
				<label htmlFor="toggle-image-checkbox" style={{ userSelect: 'none' }}>
					Toggle snapshot image
				</label>
			</div>
			<div style={{ width: 600, height: 450, overflow: 'hidden' }}>
				{shouldShowImage ? (
					<TldrawImage snapshot={snapshot} />
				) : (
					<Tldraw
						snapshot={snapshot}
						onMount={(editor) => {
							setEditor(editor)
						}}
					/>
				)}
			</div>
		</div>
	)
}

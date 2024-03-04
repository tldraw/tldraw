import { useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import snapshot from './snapshot.json'

export default function TldrawImageExample() {
	const [editor, setEditor] = useState<Editor>()
	const [isEditing, setIsEditing] = useState(false)

	return (
		<div style={{ padding: 30, height: '150vh' }}>
			<div
				style={{ width: 600, height: 400, marginTop: 15 }}
				onFocus={() => setIsEditing(true)}
				onBlur={() => {
					editor?.selectNone()
					setIsEditing(false)
				}}
			>
				<Tldraw
					snapshot={snapshot}
					hideUi={!isEditing}
					onMount={(editor) => {
						setEditor(editor)
						editor.updateInstanceState({ isDebugMode: false })
					}}
					autoFocus={false}
				/>
			</div>
		</div>
	)
}

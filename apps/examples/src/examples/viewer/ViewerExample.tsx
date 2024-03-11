import { useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import snapshot from './snapshot.json'

export default function BlockExample() {
	const [editor, setEditor] = useState<Editor>()
	const [isEditing, setIsEditing] = useState(false)

	return (
		<div
			style={{
				padding: 30,
				height: '150vh',
			}}
			onPointerDown={() => {
				setIsEditing(false)
				if (!editor) return
				editor.selectNone()
				editor.updateInstanceState({ isFocused: false })
				editor.setCurrentTool('hand')
			}}
		>
			<div
				style={{ width: 600, height: 400, marginTop: 15 }}
				onFocus={() => {
					setIsEditing(true)
					editor?.updateInstanceState({ isFocused: true })
				}}
			>
				<Tldraw
					snapshot={snapshot}
					hideUi={!isEditing}
					autoFocus={false}
					components={{
						HelpMenu: null,
						NavigationPanel: null,
						MainMenu: null,
						PageMenu: null,
					}}
					onMount={(editor) => {
						setEditor(editor)
						editor.updateInstanceState({ isDebugMode: false })
						editor.setCurrentTool('hand')
					}}
				/>
			</div>
		</div>
	)
}

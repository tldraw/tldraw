import { useEffect, useRef, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function EditorFocusExample() {
	const [focused, setFocused] = useState(false)
	const rEditorRef = useRef<Editor | null>(null)

	useEffect(() => {
		const editor = rEditorRef.current
		if (!editor) return
		editor.updateInstanceState({ isFocused: focused })
	}, [focused])

	return (
		<div
			style={{ padding: 32 }}
			onPointerDown={() => {
				const editor = rEditorRef.current
				if (editor && editor.getInstanceState().isFocused) {
					editor.updateInstanceState({ isFocused: false })
				}
			}}
		>
			<div>
				<div style={{ display: 'flex', gap: 4 }}>
					<input
						id="focus"
						type="checkbox"
						onChange={(e) => {
							setFocused(e.target.checked)
						}}
					/>
					<label htmlFor="focus">Focus</label>
				</div>
			</div>
			<p>
				The checkbox controls the editor's <code>instanceState.isFocused</code> property.
			</p>
			<p>
				When the editor is "focused", its keyboard shortcuts will work. When it is not focused, the
				keyboard shortcuts will not work.
			</p>
			<div style={{ width: 800, maxWidth: '100%', height: 500 }}>
				<Tldraw
					autoFocus={false}
					onMount={(editor) => {
						rEditorRef.current = editor
					}}
				/>
			</div>
			<input type="text" placeholder="Test me" />
		</div>
	)
}

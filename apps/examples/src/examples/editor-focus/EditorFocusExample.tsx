import { useRef } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function EditorFocusExample() {
	const editorRef = useRef<Editor | null>(null)

	return (
		<div style={{ padding: 32 }}>
			<div>
				<div style={{ display: 'flex', gap: 4 }}>
					<input
						id="focus"
						type="checkbox"
						onChange={(e) => {
							if (e.target.checked) {
								editorRef.current?.focus()
							} else {
								editorRef.current?.blur()
							}
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
						editorRef.current = editor
					}}
				/>
			</div>
			<p>
				You should be able to type in this text input without worrying about triggering editor
				shortcuts even when the editor is focused.
			</p>
			<input type="text" placeholder="Test me" />
		</div>
	)
}

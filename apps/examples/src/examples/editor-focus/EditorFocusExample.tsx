import { useRef } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './editor-focus.css'

export default function EditorFocusExample() {
	const editorRef = useRef<Editor | null>(null)
	return (
		<div style={{ padding: 32, minHeight: '120vh' }}>
			<input type="text" placeholder="Test me" />
			<p>
				You should be able to type in this text input without worrying about triggering editor
				shortcuts even when the editor is focused.
			</p>
			<div>
				<h2>Controlled Focus</h2>
				<div style={{ display: 'flex', gap: 4 }}>
					<input
						id="focus"
						type="checkbox"
						onChange={(e) => {
							const editor = editorRef.current
							if (!editor) return
							if (e.target.checked) {
								editor.focus() // optional
							} else {
								editor.blur() // optional
							}
						}}
					/>
					<label htmlFor="focus">Focus</label>
				</div>
			</div>
			<p>The checkbox focuses and blurs the editor.</p>
			<p>
				When the editor is “focused”, its keyboard shortcuts will work and scrolling over the editor
				will scroll the canvas. When it is not focused, the keyboard shortcuts will not work and
				scrolling over the editor will not move the canvas.
			</p>
			<div style={{ width: 800, maxWidth: '100%', height: 500 }}>
				<Tldraw
					autoFocus={false}
					onMount={(editor) => {
						editorRef.current = editor
					}}
				/>
			</div>
		</div>
	)
}

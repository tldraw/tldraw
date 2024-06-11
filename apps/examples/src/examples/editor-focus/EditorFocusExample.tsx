import { useRef } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './editor-focus.css'

export default function EditorFocusExample() {
	return (
		<div style={{ padding: 32 }}>
			<ControlledFocusExample />
			<p>
				You should be able to type in this text input without worrying about triggering editor
				shortcuts even when the editor is focused.
			</p>
			<input type="text" placeholder="Test me" />

			<hr />
			<FreeFocusExample />
		</div>
	)
}

function ControlledFocusExample() {
	const editorRef = useRef<Editor | null>(null)

	return (
		<>
			<div>
				<h2>Controlled Focus</h2>
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
				The checkbox controls the editor’s <code>instanceState.isFocused</code> property.
			</p>
			<p>
				When the editor is “focused”, its keyboard shortcuts will work. When it is not focused, the
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
		</>
	)
}

function FreeFocusExample() {
	const editorRef = useRef<Editor | null>(null)

	return (
		<div>
			<h2>Free Focus</h2>
			<p>
				You can use `onBlur` and `onFocus` to control the editor’s focus so that it behaves like a
				native form input.
			</p>
			<div
				style={{ width: 800, maxWidth: '100%', height: 500 }}
				onBlur={() => {
					editorRef.current?.blur()
				}}
				onFocus={() => {
					editorRef.current?.focus()
				}}
			>
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

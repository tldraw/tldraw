import { useState } from 'react'
import { Editor, Tldraw, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './editor-focus.css'

// There's a guide at the bottom of this file!

export default function EditorFocusExample() {
	const [editor, setEditor] = useState<Editor | null>(null)

	// [1]
	const isFocused = useValue('isFocused', () => editor?.getIsFocused() ?? false, [editor])

	return (
		<div className="editor-focus-example">
			<input type="text" placeholder="Test me" />
			<p>
				You should be able to type in this text input without triggering editor shortcuts, even when
				the editor is focused.
			</p>
			<h2>Controlled focus</h2>
			<div className="editor-focus-example__controls">
				<input
					id="focus"
					type="checkbox"
					checked={isFocused}
					onChange={(e) => {
						// [2]
						if (e.target.checked) {
							editor?.focus()
						} else {
							editor?.blur()
						}
					}}
				/>
				<label htmlFor="focus">Focus</label>
			</div>
			<p>
				The checkbox focuses and blurs the editor. Clicking on the canvas also focuses it, which is
				why the checkbox follows the editor&apos;s own focus state.
			</p>
			<p>
				When the editor is focused, its keyboard shortcuts work and scrolling over it moves the
				canvas. When it is not, shortcuts are ignored and the page scrolls instead.
			</p>
			<div className="editor-focus-example__editor">
				{/* [3] */}
				<Tldraw autoFocus={false} onMount={setEditor} />
			</div>
		</div>
	)
}

/*
[1]
`editor.getIsFocused()` is reactive, so reading it through `useValue` keeps the checkbox in sync
whether focus changed through the checkbox or by clicking the canvas.

[2]
`editor.focus()` and `editor.blur()` set the editor's focus state and, by default, also focus or
blur the container element. Pass `{ focusContainer: false }` / `{ blurContainer: false }` to
change only the editor's state.

[3]
`autoFocus={false}` stops the editor from grabbing focus when it mounts, which matters when the
canvas is one of several things on a page (or one of several editors).
*/

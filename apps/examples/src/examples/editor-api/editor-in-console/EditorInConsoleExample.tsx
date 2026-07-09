import { Editor, react, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

//[1]
function exposeEditorOnWindow(editor: Editor) {
	return react('expose editor on window', () => {
		// `isDebugMode` is reactive instance state — it's the same flag the SDK reads to decide
		// whether to show the debug panel, so this tracks the debug menu being open.
		if (editor.getInstanceState().isDebugMode) {
			;(window as any).editor = editor
		} else if ((window as any).editor === editor) {
			delete (window as any).editor
		}
	})
}

//[2]
export default function EditorInConsoleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				onMount={(editor) => {
					// Return the reaction's disposer so it's cleaned up when the editor unmounts.
					return exposeEditorOnWindow(editor)
				}}
			/>
		</div>
	)
}

/*
This example exposes the editor on `window.editor` so you can inspect and drive it from the browser
console, e.g. `editor.selectAll()` or `editor.getCurrentPageShapes()`.

The SDK does not set `window.editor` for you — publishing a global is a host-app concern. Turn debug
mode on (from the main menu, under preferences) and `window.editor` appears; turn it off and it's
removed again.

[1]
`react()` runs its callback whenever the reactive state it reads changes. Here it reads
`editor.getInstanceState().isDebugMode`, so it re-runs each time debug mode is toggled. It returns a
disposer that stops the reaction.

If you don't need the debug-mode gate, you can skip all of this and just set the global directly:

	onMount={(editor) => {
		;(window as any).editor = editor
	}}

[2]
Returning the disposer from `onMount` ties the reaction's lifetime to the editor: when the editor
unmounts, the reaction is disposed and `window.editor` is cleaned up.
*/

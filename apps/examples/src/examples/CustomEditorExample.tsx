import { Editor, TLEditorOptions, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useState } from 'react'

// The tldraw component shares its App instance via its onMount callback prop.

// The App instance is tldraw's "god object". You can use the app to do
// just about everything that's possible in tldraw. Internally, the canvas
// component and all shapes, tools, and UI components use this instance to
// send events, observe changes, and perform actions.

// You can subclass the editor to add custom functionality. This is useful
// for deeper integrations but is not necessary for most use cases.

class CustomEditor extends Editor {
	/**
	 * Some custom method you want exposed on the editor.
	 */
	sayHello() {
		alert('hello!')
	}
}

// Define a function that creates your custom editor.
function createEditor(options: TLEditorOptions) {
	return new CustomEditor(options)
}

export default function CustomeEditorExample() {
	const [editor, setEditor] = useState<CustomEditor | null>(null)
	const handleMount = (_editor: Editor) => {
		// Unfortunatly, we have to cast the editor to our custom editor type.
		// In the future, we may be able to use generics to avoid this.
		setEditor(_editor as CustomEditor)
	}

	useEffect(() => {
		const sayHelloFromEditor = () => {
			if (editor) {
				editor.sayHello()
			}
		}
		// timeout
		const timeout = setTimeout(sayHelloFromEditor, 2000)
		return () => {
			clearTimeout(timeout)
		}
	})

	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="custom-editor-example"
				onMount={handleMount}
				createEditor={createEditor}
			/>
		</div>
	)
}

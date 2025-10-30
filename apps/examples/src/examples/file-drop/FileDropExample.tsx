import { useCallback } from 'react'
import {
	createTLSchema,
	defaultHandleExternalFileContent,
	Editor,
	parseTldrawJsonFile,
	Tldraw,
	useToasts,
	useTranslation,
} from 'tldraw'
import 'tldraw/tldraw.css'

/*
[1]
This example handles .tldr file drops by parsing and loading them into the editor.
It uses useToasts and useTranslation, which require wrapping this component with:
<TldrawUiContextProvider>
	<FileDropExample />
 </TldrawUiContextProvider>
*/

export default function DragAndParseTldrExample() {
	// [2] Get toast and translation utilities from tldraw context
	const toasts = useToasts()
	const msg = useTranslation()

	// [3] Register a handler to parse .tldr files on external file drop
	const handleEditorMount = useCallback((editor: Editor) => {
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))

			if (tldrawFiles.length > 0) {
				for (const file of tldrawFiles) {
					const text = await file.text()
					const parseFileResult = parseTldrawJsonFile({ schema: createTLSchema(), json: text })

					if (!parseFileResult.ok) {
						return
					}

					const snapshot = parseFileResult.value.getStoreSnapshot()
					editor.loadSnapshot(snapshot)
				}
			} else {
				// [4] Fallback for other files (images, videos, etc.)
				await defaultHandleExternalFileContent(editor, content, {
					toasts,
					msg,
				})
			}
		})
	}, [])

	// [5] Render the Tldraw editor with custom file drop behavior
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="drag-drop-parse-tldr" onMount={handleEditorMount} />
		</div>
	)
}

/*
[1]
This example sets up a handler to load `.tldr` files when dropped onto the canvas. It uses the
`parseTldrawJsonFile` function to convert raw JSON text into a snapshot and load it into the editor.

[2]
We access `useToasts` and `useTranslation` to provide feedback for unsupported files or errors.
These hooks require that the component be wrapped in `TldrawUiContextProvider`.

[3]
The `registerExternalContentHandler` method lets you intercept dropped files and handle them
your own way. If the dropped file ends with `.tldr`, we parse and load it into the editor.

[4]
For any other file types, we defer to the default content handler provided by tldraw.

[5]
The `Tldraw` component mounts the editor with a given persistence key, enabling us to persist the
editor's state and handle lifecycle events like onMount.
*/

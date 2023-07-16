import {
	debounce,
	parseAndLoadDocument,
	serializeTldrawJson,
	useDefaultHelpers,
	useEditor,
} from '@tldraw/tldraw'
import React from 'react'
// @ts-ignore
import type { VscodeMessage } from '../../messages'
import '../public/index.css'
import { vscode } from './utils/vscode'

export const ChangeResponder = () => {
	const editor = useEditor()
	const { addToast, clearToasts, msg } = useDefaultHelpers()

	React.useEffect(() => {
		// When a message is received from the VS Code extension, handle it
		function handleMessage({ data: message }: MessageEvent<VscodeMessage>) {
			switch (message.type) {
				// case 'vscode:undo': {
				// 	editor.undo()
				// 	break
				// }
				// case 'vscode:redo': {
				// 	editor.redo()
				// 	break
				// }
				case 'vscode:revert': {
					parseAndLoadDocument(editor, message.data.fileContents, msg, addToast)
					break
				}
			}
		}

		window.addEventListener('message', handleMessage)

		return () => {
			clearToasts()
			window.removeEventListener('message', handleMessage)
		}
	}, [editor, msg, addToast, clearToasts])

	React.useEffect(() => {
		// When the history changes, send the new file contents to VSCode
		const handleChange = debounce(async () => {
			vscode.postMessage({
				type: 'vscode:editor-updated',
				data: {
					fileContents: await serializeTldrawJson(editor.store),
				},
			})
		}, 250)

		vscode.postMessage({
			type: 'vscode:editor-loaded',
		})

		editor.on('change-history', handleChange)

		return () => {
			handleChange()
			editor.off('change-history', handleChange)
		}
	}, [editor])

	return null
}

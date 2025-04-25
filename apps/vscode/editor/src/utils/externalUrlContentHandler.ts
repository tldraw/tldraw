import { Editor } from 'tldraw'
import { rpc } from './rpc'

export function registerExternalUrlContentHandler(editor: Editor) {
	const currentFilesContentHandler = editor.externalContentHandlers['files']
	const currentUrlContentHandler = editor.externalContentHandlers['url']
	editor.registerExternalContentHandler('url', async (info) => {
		// This happens when you shift drag a file from the file explorer to the editor
		if (info.url.startsWith('file://')) {
			// We cannot fetch the file directly since we are sandboxed, we have to ask the extension manager to get it for us
			const data = await rpc('vscode:get-file', { url: info.url })
			const uint8Array = new Uint8Array(data.file)
			const blob = new Blob([uint8Array], { type: data.mimeType })
			const file = new File([blob], data.fileName, { type: data.mimeType })
			currentFilesContentHandler?.({
				type: 'files',
				files: [file],
				ignoreParent: false,
			})
		} else {
			// default logic if it's a regular url
			currentUrlContentHandler?.(info)
		}
	})
}

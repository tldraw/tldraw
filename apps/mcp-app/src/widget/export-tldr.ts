import type { App } from '@modelcontextprotocol/ext-apps/react'
import { Editor, serializeTldrawJson, serializeTldrawJsonBlob } from 'tldraw'

export async function exportTldr(editor: Editor, app?: App) {
	const json = await serializeTldrawJson(editor)

	// Copy to clipboard
	navigator.clipboard.writeText(json).catch(() => {
		// Clipboard may be unavailable in some contexts.
	})

	// Download file
	if (app?.getHostCapabilities()?.downloadFile) {
		await app.downloadFile({
			contents: [
				{
					type: 'resource',
					resource: {
						uri: 'file:///diagram.tldr',
						mimeType: 'application/json',
						text: json,
					},
				},
			],
		})
	} else {
		const blob = await serializeTldrawJsonBlob(editor)
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'diagram.tldr'
		a.click()
		URL.revokeObjectURL(url)
	}
}

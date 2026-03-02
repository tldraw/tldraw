import { Editor, serializeTldrawJson, serializeTldrawJsonBlob } from 'tldraw'

export async function exportTldr(editor: Editor) {
	const json = await serializeTldrawJson(editor)

	// Copy to clipboard
	navigator.clipboard.writeText(json).catch(() => {
		// Clipboard may be unavailable in some contexts.
	})

	// Download file
	const blob = await serializeTldrawJsonBlob(editor)
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'diagram.tldr'
	a.click()
	URL.revokeObjectURL(url)
}

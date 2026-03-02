import { Editor, structuredClone } from 'tldraw'
import { log } from './debug'

function collectPageBindings(editor: Editor) {
	const seen = new Set<string>()
	const bindings: unknown[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		for (const binding of editor.getBindingsInvolvingShape(shape)) {
			if (seen.has(binding.id)) continue
			seen.add(binding.id)
			bindings.push(structuredClone(binding))
		}
	}
	return bindings
}

function buildTldrDocument(editor: Editor) {
	const shapes = [...editor.getCurrentPageShapes()].map((s) => structuredClone(s))
	const bindings = collectPageBindings(editor)

	return {
		tldrawFileFormatVersion: 1,
		schema: {
			schemaVersion: 2,
			sequences: {
				'com.tldraw.store': 4,
				'com.tldraw.asset': 1,
				'com.tldraw.camera': 1,
				'com.tldraw.document': 2,
				'com.tldraw.instance': 25,
				'com.tldraw.instance_page_state': 5,
				'com.tldraw.page': 1,
				'com.tldraw.shape': 4,
				'com.tldraw.instance_presence': 5,
				'com.tldraw.pointer': 1,
			},
		},
		records: [
			{
				typeName: 'page',
				id: 'page:page',
				name: 'Page 1',
				index: 'a1',
				meta: {},
			},
			...shapes,
			...bindings,
		],
	}
}

export function exportTldr(editor: Editor) {
	const doc = buildTldrDocument(editor)
	const json = JSON.stringify(doc, null, 2)

	// Copy to clipboard
	navigator.clipboard.writeText(json).catch(() => {
		// Clipboard may be unavailable in some contexts.
	})

	log(json)

	// Download file
	const blob = new Blob([json], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'diagram.tldr'
	a.click()
	URL.revokeObjectURL(url)
}

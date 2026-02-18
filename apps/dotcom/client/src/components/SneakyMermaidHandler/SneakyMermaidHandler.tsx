import { useEffect } from 'react'
import { useEditor, useToasts } from 'tldraw'
import { defineMessages, useMsg } from '../../tla/utils/i18n'
import { createMermaidDiagram, UnsupportedMermaidDiagramError } from './utils/createMermaidDiagram'

const messages = defineMessages({
	unsupportedTitle: { defaultMessage: 'Unsupported Mermaid diagram' },
	unsupportedDescription: { defaultMessage: 'Unsupported diagram, will generate SVG instead' },
})

export function SneakyMermaidHandler() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const unsupportedTitle = useMsg(messages.unsupportedTitle)
	const unsupportedDescription = useMsg(messages.unsupportedDescription)

	useEffect(() => {
		editor.registerExternalContentHandler('text', async (content) => {
			const mermaid = (await import('mermaid')).default

			try {
				const shapesBefore = new Set(editor.getCurrentPageShapeIds())

				await createMermaidDiagram(editor, content.text)

				const newShapeIds = [...editor.getCurrentPageShapeIds()].filter(
					(id) => !shapesBefore.has(id)
				)
				if (newShapeIds.length) {
					editor.setSelectedShapes(newShapeIds)
				}
			} catch (e) {
				if (e instanceof UnsupportedMermaidDiagramError) {
					addToast({
						id: 'unsupported-mermaid-diagram',
						title: unsupportedTitle,
						description: unsupportedDescription,
						severity: 'warning',
					})
					const { svg } = await mermaid.render(`mermaid-${Date.now()}`, content.text)
					editor.putExternalContent({
						type: 'svg-text',
						text: svg,
						point: content.point,
						sources: content.sources,
					})
					return
				}
				// not parsable, most likely not mermaid
				console.error(e)
			}
		})
	}, [editor, addToast, unsupportedTitle, unsupportedDescription])

	return null
}

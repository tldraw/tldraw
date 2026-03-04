import { useEffect } from 'react'
import { defaultHandleExternalTextContent, useEditor, useToasts } from 'tldraw'
import { defineMessages, useMsg } from '../../tla/utils/i18n'
import { createMermaidDiagram, MermaidDiagramError } from './utils/createMermaidDiagram'

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
			let svgResult: string | undefined
			try {
				const shapesBefore = new Set(editor.getCurrentPageShapeIds())

				svgResult = await createMermaidDiagram(editor, content.text)

				const newShapeIds = [...editor.getCurrentPageShapeIds()].filter(
					(id) => !shapesBefore.has(id)
				)
				if (newShapeIds.length) {
					editor.setSelectedShapes(newShapeIds)
				}
			} catch (e) {
				if (e instanceof MermaidDiagramError && e.type === 'unsupported') {
					addToast({
						id: 'unsupported-mermaid-diagram',
						title: unsupportedTitle,
						description: unsupportedDescription,
						severity: 'warning',
					})

					if (typeof svgResult === 'string') {
						editor.putExternalContent({
							type: 'svg-text',
							text: svgResult,
							point: content.point,
							sources: content.sources,
						})
						return
					}
				}

				// Only log unexpected errors; MermaidDiagramError is the normal "not mermaid" path
				if (!(e instanceof MermaidDiagramError)) {
					console.error(e)
				}

				await defaultHandleExternalTextContent(editor, content)
			}
		})
	}, [editor, addToast, unsupportedTitle, unsupportedDescription])

	return null
}

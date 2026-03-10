import { useEffect } from 'react'
import { defaultHandleExternalTextContent, useEditor, useToasts } from 'tldraw'
import { defineMessages, useMsg } from '../../tla/utils/i18n'
import { simpleMermaidStringTest } from './simpleMermaidStringTest'

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
			if (!simpleMermaidStringTest(content.text)) {
				await defaultHandleExternalTextContent(editor, content)
				return
			}
			const { createMermaidDiagram, MermaidDiagramError } = await import('@tldraw/mermaid')
			try {
				const shapesBefore = new Set(editor.getCurrentPageShapeIds())

				const onUnsupportedDiagram = async (svgString: string) => {
					await editor.putExternalContent({
						type: 'svg-text',
						text: svgString,
						point: content.point,
						sources: content.sources,
					})
				}

				await createMermaidDiagram(editor, content.text, onUnsupportedDiagram)

				const newShapeIds = [...editor.getCurrentPageShapeIds()].filter(
					(id) => !shapesBefore.has(id)
				)
				if (newShapeIds.length) {
					editor.setSelectedShapes(newShapeIds)
				}
			} catch (e) {
				console.error(e)

				if (e instanceof MermaidDiagramError && e.type == 'unsupported') {
					addToast({
						id: 'unsupported-mermaid-diagram',
						title: unsupportedTitle,
						description: unsupportedDescription,
						severity: 'warning',
					})
					return
				}

				await defaultHandleExternalTextContent(editor, content)
			}
		})
	}, [editor, addToast, unsupportedTitle, unsupportedDescription])

	return null
}

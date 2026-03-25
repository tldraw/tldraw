import { useEffect } from 'react'
import { defaultHandleExternalTextContent, useEditor, useToasts } from 'tldraw'
import { defineMessages, useMsg } from '../../tla/utils/i18n'
import { simpleMermaidStringTest, stripMarkdownMermaidFence } from './simpleMermaidStringTest'

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
			// Strip markdown code fences if present (e.g. ```mermaid ... ```)
			const mermaidText = stripMarkdownMermaidFence(content.text)
			const { createMermaidDiagram } = await import('@tldraw/mermaid')
			const shapesBefore = new Set(editor.getCurrentPageShapeIds())

			const selectNewShapes = () => {
				const newShapeIds = [...editor.getCurrentPageShapeIds()].filter(
					(id) => !shapesBefore.has(id)
				)
				if (newShapeIds.length) {
					editor.setSelectedShapes(newShapeIds)
				}
			}

			try {
				const onUnsupportedDiagram = async (svgString: string) => {
					await editor.putExternalContent({
						type: 'svg-text',
						text: svgString,
						point: content.point,
						sources: content.sources,
					})
					addToast({
						id: 'unsupported-mermaid-diagram',
						title: unsupportedTitle,
						description: unsupportedDescription,
						severity: 'warning',
					})
				}

				await createMermaidDiagram(editor, mermaidText, { onUnsupportedDiagram })
				selectNewShapes()
			} catch (e) {
				console.error(e)
				await defaultHandleExternalTextContent(editor, content)
			}
		})
	}, [editor, addToast, unsupportedTitle, unsupportedDescription])

	return null
}

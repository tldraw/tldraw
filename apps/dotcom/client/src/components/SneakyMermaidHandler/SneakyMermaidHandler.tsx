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
			// when pasting html, the derived text is stripped and loses line breaks
			// which make evaluating mermaid diagrams impossible. We look into the
			// sources and see if there's some plain text alongside the html and if
			// there are, we can use this to evaluate mermaid diagrams.

			const plainTextSource = content.sources?.find(
				(s) => s.type === 'text' && s.subtype === 'text'
			)
			const plainText = plainTextSource?.data ?? content.text
			const textToTest = simpleMermaidStringTest(plainText) ? plainText : content.text

			if (!simpleMermaidStringTest(textToTest)) {
				await defaultHandleExternalTextContent(editor, content)
				return
			}
			const mermaidText = stripMarkdownMermaidFence(textToTest)
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

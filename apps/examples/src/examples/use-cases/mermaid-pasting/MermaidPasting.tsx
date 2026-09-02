import { useEffect } from 'react'
import { Tldraw, defaultHandleExternalTextContent, useEditor, useToasts } from 'tldraw'
import 'tldraw/tldraw.css'

export default function MermaidPastingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<MermaidPasteHandler />
			</Tldraw>
		</div>
	)
}

function MermaidPasteHandler() {
	const editor = useEditor()
	const { addToast } = useToasts()

	useEffect(() => {
		// [1]
		editor.registerExternalContentHandler('text', async (content) => {
			// [2]
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
				// [3]
				const onUnsupportedDiagram = async (svgString: string) => {
					await editor.putExternalContent({
						type: 'svg-text',
						text: svgString,
						point: content.point,
						sources: content.sources,
					})
					addToast({
						id: 'unsupported-mermaid-diagram',
						title: 'Unsupported mermaid diagram',
						description: 'This diagram is not supported yet',
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
	}, [editor, addToast])

	return null
}

/**
 * Lightweight mermaid detection replicating mermaid's own detectType preprocessing
 * (from mermaid v11.12.2 src/diagram-api/detectType.ts and src/diagram-api/regexes.ts).
 *
 * https://github.com/mermaid-js/mermaid/blob/277c4967f97405e9bb172c0a2f67f462a672b162/packages/mermaid/src/diagram-api/detectType.ts
 * https://github.com/mermaid-js/mermaid/blob/277c4967f97405e9bb172c0a2f67f462a672b162/packages/mermaid/src/diagram-api/regexes.ts
 *
 * Strips YAML frontmatter, %%{...}%% directives, and %% comments, then tests for
 * a known diagram keyword at the start of the cleaned text. It has no mermaid
 * import so the heavy library is only loaded once a diagram is actually detected.
 */
const FRONTMATTER_REGEX = /^-{3}\s*[\n\r]([\s\S]*?)[\n\r]-{3}\s*[\n\r]+/
const DIAGRAM_KEYWORD_REGEX =
	/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|sankey|xychart|block|quadrantChart|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|packet|kanban|architecture|treemap|radar|info)/

/**
 * Leading ```mermaid (or longer run) fence, closed by the first line that ends
 * the same run length (CommonMark-style: inner shorter ``` lines do not close a
 * longer fence). Trailing markdown after the block is allowed so multi-block
 * pastes do not pull in later fences. Group 1 = fence run, group 2 = diagram body.
 */
const MARKDOWN_MERMAID_FENCE_REGEX =
	/^\s*(```+)\s*mermaid\s*\r?\n([\s\S]*?)\r?\n\s*\1\s*(?:[\s\S]*)$/

/**
 * Strip mermaid boilerplate (frontmatter, directives, comments) so only the
 * diagram body remains. The two global regexes are created as fresh literals
 * each call to avoid the stateful-lastIndex footgun of module-level /g regexes.
 */
function stripMermaidBoilerplate(text: string): string {
	return text
		.replace(FRONTMATTER_REGEX, '')
		.replace(/%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?/gi, '')
		.replace(/\s*%%.*\n/gm, '\n')
}

function stripMarkdownMermaidFence(text: string): string {
	const match = text.match(MARKDOWN_MERMAID_FENCE_REGEX)
	return match ? match[2] : text
}

function simpleMermaidStringTest(text: string): boolean {
	return DIAGRAM_KEYWORD_REGEX.test(stripMermaidBoilerplate(stripMarkdownMermaidFence(text)))
}

/*
[1]
`registerExternalContentHandler('text', ...)` replaces the default handler for pasted text.
Anything that doesn't look like Mermaid is passed on to `defaultHandleExternalTextContent`
so ordinary text still pastes as a text shape.

[2]
When HTML is pasted, the derived `content.text` has its line breaks stripped, which makes
Mermaid unparseable. The clipboard usually carries a plain-text source alongside the HTML,
so we prefer that when it looks like a diagram.

[3]
`createMermaidDiagram` creates native shapes for flowcharts, state diagrams, sequence
diagrams, and mind maps. For other diagram types it calls `onUnsupportedDiagram` with
Mermaid's SVG, which we drop onto the canvas as an image via `putExternalContent`.
*/

/**
 * Component that registers an external content handler to intercept text paste events
 * and detect Mermaid diagram code. Renders supported diagram types as native tldraw shapes,
 * with SVG fallback for unsupported types.
 */

import { memo, useEffect } from 'react'
import { defaultHandleExternalTextContent, useEditor, useToasts, Vec } from 'tldraw'
import { createShapesFromClassDiagram } from '../utils/mermaid/createShapesFromClassDiagram'
import { createShapesFromErDiagram } from '../utils/mermaid/createShapesFromErDiagram'
import { createShapesFromFlowchart } from '../utils/mermaid/createShapesFromFlowchart'
import { createShapesFromSequenceDiagram } from '../utils/mermaid/createShapesFromSequenceDiagram'
import { createShapesFromStateDiagram } from '../utils/mermaid/createShapesFromStateDiagram'
import { extractMermaidCode, getDiagramType, isMermaidCode } from '../utils/mermaid/detectMermaid'
import { parseClassDiagram } from '../utils/mermaid/parseClassDiagram'
import { parseErDiagram } from '../utils/mermaid/parseErDiagram'
import { parseMermaidFlowchart } from '../utils/mermaid/parseMermaidFlowchart'
import { parseSequenceDiagram } from '../utils/mermaid/parseSequenceDiagram'
import { parseStateDiagram } from '../utils/mermaid/parseStateDiagram'
import { renderMermaidToSvg } from '../utils/mermaid/renderMermaid'

export const SneakyMermaidHandler = memo(function SneakyMermaidHandler() {
	const editor = useEditor()
	const toasts = useToasts()

	useEffect(() => {
		editor.registerExternalContentHandler('text', async (content) => {
			const { text, point } = content

			if (!isMermaidCode(text)) {
				return defaultHandleExternalTextContent(editor, content)
			}

			try {
				const mermaidCode = extractMermaidCode(text)
				if (!mermaidCode) {
					return defaultHandleExternalTextContent(editor, content)
				}

				const diagramType = getDiagramType(mermaidCode)

				// Determine position
				const position =
					point ??
					(editor.inputs.getShiftKey()
						? editor.inputs.getCurrentPagePoint()
						: editor.getViewportPageBounds().center)

				// Mark history stopping point
				editor.markHistoryStoppingPoint('paste')

				// Handle different diagram types with native shapes
				if (diagramType === 'flowchart') {
					const parsed = parseMermaidFlowchart(mermaidCode)
					if (parsed) {
						createShapesFromFlowchart(editor, parsed, Vec.From(position))
						toasts.addToast({
							title: 'Flowchart created',
							description: `Created ${parsed.nodes.length} nodes and ${parsed.edges.length} edges`,
							severity: 'success',
						})
						return
					}
				} else if (diagramType === 'sequenceDiagram') {
					const parsed = parseSequenceDiagram(mermaidCode)
					if (parsed) {
						createShapesFromSequenceDiagram(editor, parsed, Vec.From(position))
						toasts.addToast({
							title: 'Sequence diagram created',
							description: `Created ${parsed.participants.length} participants and ${parsed.messages.length} messages`,
							severity: 'success',
						})
						return
					}
				} else if (diagramType === 'classDiagram') {
					const parsed = parseClassDiagram(mermaidCode)
					if (parsed) {
						createShapesFromClassDiagram(editor, parsed, Vec.From(position))
						toasts.addToast({
							title: 'Class diagram created',
							description: `Created ${parsed.classes.length} classes and ${parsed.relationships.length} relationships`,
							severity: 'success',
						})
						return
					}
				} else if (diagramType === 'stateDiagram') {
					const parsed = parseStateDiagram(mermaidCode)
					if (parsed) {
						createShapesFromStateDiagram(editor, parsed, Vec.From(position))
						toasts.addToast({
							title: 'State diagram created',
							description: `Created ${parsed.states.length} states and ${parsed.transitions.length} transitions`,
							severity: 'success',
						})
						return
					}
				} else if (diagramType === 'erDiagram') {
					const parsed = parseErDiagram(mermaidCode)
					if (parsed) {
						createShapesFromErDiagram(editor, parsed, Vec.From(position))
						toasts.addToast({
							title: 'ER diagram created',
							description: `Created ${parsed.entities.length} entities and ${parsed.relationships.length} relationships`,
							severity: 'success',
						})
						return
					}
				}

				// For unsupported diagram types or if parsing failed, try SVG rendering
				try {
					const svgResult = await renderMermaidToSvg(mermaidCode)

					if (svgResult) {
						// Use tldraw's putExternalContent to handle SVG
						editor.putExternalContent({
							type: 'svg-text',
							text: svgResult.svg,
							point,
							sources: content.sources,
						})

						toasts.addToast({
							title: 'Mermaid diagram created',
							description: `Created ${diagramType} diagram as SVG`,
							severity: 'success',
						})
						return
					}
				} catch (svgError) {
					// SVG rendering failed
				}

				// If both native and SVG rendering failed, fall back to text
				toasts.addToast({
					title: 'Failed to create diagram',
					description: `Could not render ${diagramType} diagram`,
					severity: 'error',
				})
				return defaultHandleExternalTextContent(editor, content)
			} catch (error) {
				toasts.addToast({
					title: 'Failed to create diagram',
					description: 'An error occurred while processing the diagram',
					severity: 'error',
				})
				return defaultHandleExternalTextContent(editor, content)
			}
		})
	}, [editor, toasts])

	return null
})

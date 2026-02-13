import { memo, useEffect } from 'react'
import { Tldraw, Vec, defaultHandleExternalTextContent, useEditor, useToasts } from 'tldraw'
import 'tldraw/tldraw.css'
import { createShapesFromClassDiagram } from './createShapesFromClassDiagram'
import { createShapesFromErDiagram } from './createShapesFromErDiagram'
import { createShapesFromFlowchart } from './createShapesFromFlowchart'
import { createShapesFromSequenceDiagram } from './createShapesFromSequenceDiagram'
import { createShapesFromStateDiagram } from './createShapesFromStateDiagram'
import { parseClassDiagram } from './parseClassDiagram'
import { parseErDiagram } from './parseErDiagram'
import { parseMermaidFlowchart } from './parseMermaidFlowchart'
import { parseSequenceDiagram } from './parseSequenceDiagram'
import { parseStateDiagram } from './parseStateDiagram'
import { renderMermaidToSvg } from './renderMermaidToSvg'

// Check if text is Mermaid code
function isMermaidCode(text: string): boolean {
	if (!text) return false
	const trimmed = text.trim()
	if (/^```(?:mermaid|mmd)\s*\n[\s\S]*\n```\s*$/.test(trimmed)) return true
	const diagramTypes = [
		'flowchart',
		'sequenceDiagram',
		'classDiagram',
		'stateDiagram',
		'erDiagram',
		'gantt',
		'pie',
		'journey',
		'gitGraph',
		'mindmap',
		'timeline',
		'quadrantChart',
		'requirementDiagram',
		'C4Context',
	]
	const firstLine = trimmed.split('\n')[0].trim()
	return diagramTypes.some((type) => firstLine.startsWith(type))
}

// Extract Mermaid code
function extractMermaidCode(text: string): string | null {
	if (!text) return null
	let trimmed = text.trim()

	// Handle code fences
	const fenceMatch = trimmed.match(/^```(?:mermaid|mmd)\s*\n([\s\S]*)\n```\s*$/)
	if (fenceMatch && fenceMatch[1]) return fixMermaidNewlines(fenceMatch[1])

	// Strip common prefixes like "Class Diagram:", "Sequence Diagram:", etc.
	trimmed = trimmed.replace(/^(?:Class|Sequence|State|ER|Entity[- ]Relationship|Flow)\s+Diagram\s*:?\s*/i, '')

	if (isMermaidCode(trimmed)) return fixMermaidNewlines(trimmed)
	return null
}

// Fix Mermaid code by adding newlines where needed
function fixMermaidNewlines(text: string): string {
	let fixed = text.trim()

	// First, normalize runs of 4+ spaces to newlines (common when pasting from formatted text)
	fixed = fixed.replace(/\s{4,}/g, '\n')

	// Add newline after diagram declaration if missing
	fixed = fixed.replace(
		/^(flowchart\s+(?:LR|RL|TB|BT|TD)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram)\s*/,
		'$1\n'
	)

	// Get the diagram type after initial normalization
	const firstLine = fixed.split('\n')[0].trim()
	let diagramType: string | null = null
	if (firstLine.startsWith('flowchart')) diagramType = 'flowchart'
	else if (firstLine.startsWith('sequenceDiagram')) diagramType = 'sequenceDiagram'
	else if (firstLine.startsWith('classDiagram')) diagramType = 'classDiagram'
	else if (firstLine.startsWith('stateDiagram')) diagramType = 'stateDiagram'
	else if (firstLine.startsWith('erDiagram')) diagramType = 'erDiagram'

	// Type-specific fixes based on diagram type
	if (diagramType === 'stateDiagram') {
		// For state diagrams: split transitions that are on same line
		// Match: Still --> Moving    Moving --> Crash
		// Result: Still --> Moving\nMoving --> Crash
		const lines = fixed.split('\n')
		const newLines: string[] = []
		for (const line of lines) {
			// Split on arrow patterns but preserve the full transition
			const parts = line.split(/(?<=\[\*\]|\w+)\s+(?=\[\*\]|\w+\s*-->)/)
			newLines.push(...parts)
		}
		fixed = newLines.join('\n')
	} else if (diagramType === 'flowchart') {
		// For flowcharts: add newlines before node definitions
		fixed = fixed.replace(/([}\]\)])\s+([A-Z\[])/g, '$1\n$2')
		fixed = fixed.replace(/\s{2,}([A-Z][A-Z0-9]*[\[\(\{])/g, '\n$1')
	} else if (diagramType === 'sequenceDiagram') {
		// For sequence diagrams: ensure each statement is on its own line
		// Split on keywords - be aggressive and split even when adjacent
		// First pass: add newlines before keywords when preceded by any non-newline char
		fixed = fixed.replace(/(.)(\s*)(participant|actor|loop|end|opt|alt|par|Note)(\s+)/gi, (match, before, space, keyword, after) => {
			// If before is already a newline, don't add another
			if (before === '\n') return match
			// Otherwise, add newline before keyword
			return before + '\n' + keyword + after
		})
		// Add newlines before message arrows (participant->>participant or participant-->>participant)
		fixed = fixed.replace(/\s{2,}([A-Z]\w*)(->>|-->>|->|-->|-\)|--\)|-x|--x)/g, '\n$1$2')
	}

	// Clean up: remove empty lines and fix multiple newlines
	fixed = fixed
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l)
		.join('\n')

	return fixed
}

// Get diagram type from code
function getDiagramType(code: string): string | null {
	const firstLine = code.trim().split('\n')[0].trim()

	// Supported with native shapes
	if (firstLine.startsWith('flowchart')) return 'flowchart'
	if (firstLine.startsWith('sequenceDiagram')) return 'sequenceDiagram'
	if (firstLine.startsWith('classDiagram')) return 'classDiagram'
	if (firstLine.startsWith('stateDiagram')) return 'stateDiagram'
	if (firstLine.startsWith('erDiagram')) return 'erDiagram'

	// SVG fallback types
	if (firstLine.startsWith('gantt')) return 'gantt'
	if (firstLine.startsWith('pie')) return 'pie'
	if (firstLine.startsWith('journey')) return 'journey'
	if (firstLine.startsWith('gitGraph')) return 'gitGraph'
	if (firstLine.startsWith('mindmap')) return 'mindmap'
	if (firstLine.startsWith('timeline')) return 'timeline'
	if (firstLine.startsWith('quadrantChart')) return 'quadrantChart'
	if (firstLine.startsWith('requirementDiagram')) return 'requirementDiagram'
	if (firstLine.startsWith('C4Context')) return 'C4Context'

	return null
}

// Mermaid Handler Component
const MermaidHandler = memo(function MermaidHandler() {
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

				// Handle different diagram types
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
				}

				// If SVG rendering also failed, fall back to text
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

export default function MermaidPasteExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<MermaidHandler />
			</Tldraw>
		</div>
	)
}

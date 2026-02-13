/**
 * Utilities for detecting and extracting Mermaid diagram code from text.
 */

/**
 * Supported Mermaid diagram types.
 * These are keywords that appear at the start of Mermaid diagram code.
 */
const MERMAID_DIAGRAM_TYPES = [
	'flowchart',
	'sequenceDiagram',
	'classDiagram',
	'stateDiagram',
	'stateDiagram-v2',
	'erDiagram',
	'gantt',
	'pie',
	'journey',
	'gitGraph',
	'quadrantChart',
	'requirementDiagram',
	'timeline',
	'mindmap',
	'block-beta',
] as const

/**
 * Detects if the provided text contains Mermaid diagram code.
 *
 * Checks for:
 * 1. Code fence with mermaid/mmd language identifier (```mermaid or ```mmd)
 * 2. Plain text starting with a Mermaid diagram keyword
 *
 * @param text - The text to check
 * @returns True if the text appears to be Mermaid diagram code
 */
export function isMermaidCode(text: string): boolean {
	if (!text || typeof text !== 'string') {
		return false
	}

	const trimmed = text.trim()

	// Check for code fence with mermaid/mmd language identifier
	if (/^```(?:mermaid|mmd)\s*\n[\s\S]*\n```\s*$/.test(trimmed)) {
		return true
	}

	// Check if text starts with a Mermaid diagram keyword
	const firstLine = trimmed.split('\n')[0].trim()
	const startsWithKeyword = MERMAID_DIAGRAM_TYPES.some((type) => firstLine.startsWith(type))

	return startsWithKeyword
}

/**
 * Fixes Mermaid code by adding newlines where needed.
 * Handles cases where code is pasted with missing line breaks.
 */
function fixMermaidNewlines(text: string): string {
	let fixed = text.trim()

	// Normalize runs of 4+ spaces to newlines
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

	// Type-specific fixes
	if (diagramType === 'stateDiagram') {
		const lines = fixed.split('\n')
		const newLines: string[] = []
		for (const line of lines) {
			const parts = line.split(/(?<=\[\*\]|\w+)\s+(?=\[\*\]|\w+\s*-->)/)
			newLines.push(...parts)
		}
		fixed = newLines.join('\n')
	} else if (diagramType === 'flowchart') {
		fixed = fixed.replace(/([}\]])\s+([A-Z\[])/g, '$1\n$2')
		fixed = fixed.replace(/\s{2,}([A-Z][A-Z0-9]*[\[({])/g, '\n$1')
	} else if (diagramType === 'sequenceDiagram') {
		fixed = fixed.replace(/(.)(\\s*)(participant|actor|loop|end|opt|alt|par|Note)(\s+)/gi, (match, before, space, keyword, after) => {
			if (before === '\n') return match
			return before + '\n' + keyword + after
		})
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

/**
 * Gets the diagram type from Mermaid code.
 */
export function getDiagramType(code: string): string | null {
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

/**
 * Extracts clean Mermaid diagram code from text.
 *
 * If the text is wrapped in a code fence (```mermaid or ```mmd), strips the fence.
 * Otherwise returns the text as-is.
 *
 * @param text - The text to extract from
 * @returns The clean Mermaid code, or null if no valid code is found
 */
export function extractMermaidCode(text: string): string | null {
	if (!text || typeof text !== 'string') {
		return null
	}

	let trimmed = text.trim()

	// Extract code from fence if present
	const fenceMatch = trimmed.match(/^```(?:mermaid|mmd)\s*\n([\s\S]*)\n```\s*$/)
	if (fenceMatch && fenceMatch[1]) {
		return fixMermaidNewlines(fenceMatch[1])
	}

	// Strip common prefixes
	trimmed = trimmed.replace(/^(?:Class|Sequence|State|ER|Entity[-]Relationship|Flow)\s+Diagram\s*:?\s*/i, '')

	// Fix newlines and return if valid
	if (isMermaidCode(trimmed)) {
		return fixMermaidNewlines(trimmed)
	}

	return null
}

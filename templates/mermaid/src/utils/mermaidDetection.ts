/**
 * Utilities for detecting and extracting Mermaid diagram code
 */

// Check if text is Mermaid code
export function isMermaidCode(text: string): boolean {
	if (!text) return false
	const trimmed = text.trim()
	if (/^```(?:mermaid|mmd)\s*\n[\s\S]*\n```\s*$/.test(trimmed)) return true
	const diagramTypes = [
		'flowchart',
		'graph', // Legacy syntax for flowchart
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
		'C4Container',
		'C4Component',
		'C4Dynamic',
		'C4Deployment',
		'sankey-beta',
		'xyChart',
		'block-beta',
		'packet-beta',
		'architecture-beta',
		'kanban',
	]
	const firstLine = trimmed.split('\n')[0].trim()
	return diagramTypes.some((type) => firstLine.startsWith(type))
}

// Extract Mermaid code from various formats
export function extractMermaidCode(text: string): string | null {
	if (!text) return null
	let trimmed = text.trim()

	// Handle code fences
	const fenceMatch = trimmed.match(/^```(?:mermaid|mmd)\s*\n([\s\S]*)\n```\s*$/)
	if (fenceMatch && fenceMatch[1]) return fixMermaidNewlines(fenceMatch[1])

	// Strip common prefixes
	trimmed = trimmed.replace(
		/^(?:Class|Sequence|State|ER|Entity[- ]Relationship|Flow)\s+Diagram\s*:?\s*/i,
		''
	)

	if (isMermaidCode(trimmed)) return fixMermaidNewlines(trimmed)
	return null
}

// Fix Mermaid code by adding newlines where needed
function fixMermaidNewlines(text: string): string {
	let fixed = text.trim()

	// Normalize runs of 4+ spaces to newlines
	fixed = fixed.replace(/\s{4,}/g, '\n')

	// Add newline after diagram declaration
	fixed = fixed.replace(
		/^((?:flowchart|graph)\s+(?:LR|RL|TB|BT|TD)|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram)\s*/,
		'$1\n'
	)

	// Get diagram type
	const firstLine = fixed.split('\n')[0].trim()
	let diagramType: string | null = null
	if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) diagramType = 'flowchart'
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
		fixed = fixed.replace(/([}\]\)])\s+([A-Z\[])/g, '$1\n$2')
		fixed = fixed.replace(/\s{2,}([A-Z][A-Z0-9]*[\[\(\{])/g, '\n$1')
	} else if (diagramType === 'sequenceDiagram') {
		fixed = fixed.replace(
			/(.)(\s*)(participant|actor|loop|end|opt|alt|par|Note)(\s+)/gi,
			(match, before, space, keyword, after) => {
				if (before === '\n') return match
				return before + '\n' + keyword + after
			}
		)
		fixed = fixed.replace(/\s{2,}([A-Z]\w*)(->>|-->>|->|-->|-\)|--\)|-x|--x)/g, '\n$1$2')
	}

	// Clean up
	fixed = fixed
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l)
		.join('\n')

	return fixed
}

// Get diagram type from code
export function getDiagramType(code: string): string | null {
	const firstLine = code.trim().split('\n')[0].trim()

	// Native shape support
	if (firstLine.startsWith('flowchart')) return 'flowchart'
	if (firstLine.startsWith('graph')) return 'flowchart' // Legacy syntax maps to flowchart
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
	if (firstLine.startsWith('C4Container')) return 'C4Container'
	if (firstLine.startsWith('C4Component')) return 'C4Component'
	if (firstLine.startsWith('C4Dynamic')) return 'C4Dynamic'
	if (firstLine.startsWith('C4Deployment')) return 'C4Deployment'
	if (firstLine.startsWith('sankey-beta')) return 'sankey-beta'
	if (firstLine.startsWith('xyChart')) return 'xyChart'
	if (firstLine.startsWith('block-beta')) return 'block-beta'
	if (firstLine.startsWith('packet-beta')) return 'packet-beta'
	if (firstLine.startsWith('architecture-beta')) return 'architecture-beta'
	if (firstLine.startsWith('kanban')) return 'kanban'

	return null
}

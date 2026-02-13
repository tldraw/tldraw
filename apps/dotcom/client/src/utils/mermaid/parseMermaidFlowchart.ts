/**
 * Parser for Mermaid flowchart diagrams
 * Extracts nodes and edges to create native tldraw shapes
 */

export interface MermaidNode {
	id: string
	label: string
	shape: 'rectangle' | 'diamond' | 'oval' | 'ellipse' | 'rounded' | 'stadium' | 'hexagon'
}

export interface MermaidEdge {
	from: string
	to: string
	label?: string
	arrowType: 'arrow' | 'none'
	lineStyle: 'solid' | 'dotted'
}

export interface ParsedFlowchart {
	direction: 'LR' | 'RL' | 'TB' | 'BT' | 'TD'
	nodes: MermaidNode[]
	edges: MermaidEdge[]
}

/**
 * Parse a Mermaid flowchart into nodes and edges
 */
export function parseMermaidFlowchart(code: string): ParsedFlowchart | null {
	try {
		const lines = code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0) return null

		// Parse direction from first line
		const firstLine = lines[0]
		const directionMatch = firstLine.match(/^flowchart\s+(LR|RL|TB|BT|TD)/)
		if (!directionMatch) return null

		const direction = directionMatch[1] as ParsedFlowchart['direction']

		const nodes: MermaidNode[] = []
		const edges: MermaidEdge[] = []
		const nodeMap = new Map<string, MermaidNode>()

		// Parse remaining lines
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Parse edges: A --> B, A[Label] -->|label| B(Label), etc.
			// Pattern handles inline node definitions: A[...], B{...}, C(...)
			const edgePattern = /(\w+)(?:[\[\{\(][^\]\}\)]+[\]\}\)])?\s*(-->|->|---|-\.->|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:[\[\{\(][^\]\}\)]+[\]\}\)])?/
			const edgeMatch = line.match(edgePattern)

			if (edgeMatch) {
				const [, from, arrow, label, to] = edgeMatch


				// Create edge
				edges.push({
					from,
					to,
					label: label?.trim(),
					arrowType: arrow.includes('>') ? 'arrow' : 'none',
					lineStyle: arrow.includes('.') ? 'dotted' : 'solid',
				})

				// Extract node definitions from edge if present
				const fromNodeMatch = line.match(new RegExp(`${from}([\\[\\{\\(][^\\]\\}\\)]+[\\]\\}\\)])`))

				if (fromNodeMatch && !nodeMap.has(from)) {
					const node = parseNodeDefinition(from, fromNodeMatch[1])
					if (node) {
						nodes.push(node)
						nodeMap.set(from, node)
					}
				}

				const toNodeMatch = line.match(new RegExp(`${to}([\\[\\{\\(][^\\]\\}\\)]+[\\]\\}\\)])`))
				if (toNodeMatch && !nodeMap.has(to)) {
					const node = parseNodeDefinition(to, toNodeMatch[1])
					if (node) {
						nodes.push(node)
						nodeMap.set(to, node)
					}
				}

				// If nodes not defined inline, create default rectangle nodes
				if (!nodeMap.has(from)) {
					const node: MermaidNode = { id: from, label: from, shape: 'rectangle' }
					nodes.push(node)
					nodeMap.set(from, node)
				}
				if (!nodeMap.has(to)) {
					const node: MermaidNode = { id: to, label: to, shape: 'rectangle' }
					nodes.push(node)
					nodeMap.set(to, node)
				}

				continue
			}

			// Parse standalone node definition: A[Label], B{Label}, C(Label)
			const nodePattern = /^(\w+)([\[\{\(].+[\]\}\)])/
			const nodeMatch = line.match(nodePattern)

			if (nodeMatch) {
				const [, id, definition] = nodeMatch
				if (!nodeMap.has(id)) {
					const node = parseNodeDefinition(id, definition)
					if (node) {
						nodes.push(node)
						nodeMap.set(id, node)
					}
				}
			}
		}

		return { direction, nodes, edges }
	} catch (error) {
		return null
	}
}

/**
 * Clean Mermaid label - remove backticks, quotes, and convert markdown
 */
function cleanLabel(label: string): string {
	// Remove outer quotes and backticks: "`text`" -> text
	let cleaned = label.trim()

	// Remove backtick-quote wrappers: "`...`" or "`...'
	if (cleaned.startsWith('"`') && cleaned.endsWith('`"')) {
		cleaned = cleaned.slice(2, -2)
	} else if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
		cleaned = cleaned.slice(1, -1)
	} else if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
		cleaned = cleaned.slice(1, -1)
	}

	// For now, strip markdown syntax (we could parse it to rich text in the future)
	// Remove ** for bold
	cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
	// Remove _ for italic
	cleaned = cleaned.replace(/_(.+?)_/g, '$1')

	return cleaned
}

/**
 * Parse a node definition like [Label], {Label}, (Label), etc.
 */
function parseNodeDefinition(id: string, definition: string): MermaidNode | null {
	// [Label] - rectangle
	if (definition.startsWith('[') && definition.endsWith(']')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'rectangle' }
	}

	// {Label} - diamond
	if (definition.startsWith('{') && definition.endsWith('}')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'diamond' }
	}

	// ((Label)) - ellipse/circle
	if (definition.startsWith('((') && definition.endsWith('))')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'ellipse' }
	}

	// (Label) - rounded rectangle / stadium
	if (definition.startsWith('(') && definition.endsWith(')')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'oval' }
	}

	// ([Label]) - stadium (very rounded)
	if (definition.startsWith('([') && definition.endsWith('])')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'stadium' }
	}

	// {{Label}} - hexagon
	if (definition.startsWith('{{') && definition.endsWith('}}')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'hexagon' }
	}

	// [[Label]] - subroutine (rectangle with double borders - treat as rectangle)
	if (definition.startsWith('[[') && definition.endsWith(']]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'rectangle' }
	}

	// [(Label)] - cylinder (treat as oval)
	if (definition.startsWith('[(') && definition.endsWith(')]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'oval' }
	}

	return null
}

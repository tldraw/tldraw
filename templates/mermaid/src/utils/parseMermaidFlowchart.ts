/**
 * Parser for Mermaid flowchart diagrams
 * Extracts nodes and edges to create native tldraw shapes
 */

export interface MermaidNode {
	id: string
	label: string
	shape:
		| 'rectangle'
		| 'diamond'
		| 'oval'
		| 'ellipse'
		| 'rounded'
		| 'stadium'
		| 'hexagon'
		| 'trapezoid'
		| 'parallelogram'
		| 'flag'
		| 'subroutine'
		| 'cylinder'
		| 'double-circle'
}

export interface MermaidEdge {
	from: string
	to: string
	label?: string
	arrowStart: 'none' | 'arrow' | 'dot' | 'bar' | 'diamond'
	arrowEnd: 'none' | 'arrow' | 'dot' | 'bar' | 'diamond'
	lineStyle: 'solid' | 'dotted' | 'dashed'
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
		const lines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (lines.length === 0) return null

		// Parse direction from first line
		const firstLine = lines[0]
		// Support both 'flowchart' and legacy 'graph' syntax
		const directionMatch = firstLine.match(/^(?:flowchart|graph)\s+(LR|RL|TB|BT|TD)/)
		if (!directionMatch) return null

		const direction = directionMatch[1] as ParsedFlowchart['direction']

		const nodes: MermaidNode[] = []
		const edges: MermaidEdge[] = []
		const nodeMap = new Map<string, MermaidNode>()

		// Parse remaining lines
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i]

			// Parse edges with various arrow types
			// Handles: -->, <-->, --o, o--o, --x, x--x, ==>, ---,  -.->
			const edgePattern =
				/(o|x)?(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?\s*(---|--|==>|-->|->|-\.->|<-->|o--|--o|x--|--x|o--o|x--x)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?(o|x)?/
			const edgeMatch = line.match(edgePattern)

			if (edgeMatch) {
				const [, startMarker, from, arrow, label, to, endMarker] = edgeMatch

				// Determine arrow start based on arrow type
				let arrowStart: MermaidEdge['arrowStart'] = 'none'
				if (arrow.startsWith('<') || arrow.startsWith('o') || startMarker === 'o') {
					arrowStart = arrow.startsWith('o') || startMarker === 'o' ? 'dot' : 'arrow'
				} else if (arrow.startsWith('x') || startMarker === 'x') {
					arrowStart = 'bar'
				}

				// Determine arrow end based on arrow type
				let arrowEnd: MermaidEdge['arrowEnd'] = 'none'
				if (arrow.endsWith('>')) {
					arrowEnd = 'arrow'
				} else if (arrow.endsWith('o') || endMarker === 'o') {
					arrowEnd = 'dot'
				} else if (arrow.endsWith('x') || endMarker === 'x') {
					arrowEnd = 'bar'
				}

				// Determine line style
				let lineStyle: MermaidEdge['lineStyle'] = 'solid'
				if (arrow.includes('.')) {
					lineStyle = 'dotted'
				} else if (arrow.startsWith('===') || arrow.startsWith('==')) {
					lineStyle = 'dashed' // Use dashed for thick arrows
				}

				// Create edge
				edges.push({
					from,
					to,
					label: label?.trim(),
					arrowStart,
					arrowEnd,
					lineStyle,
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
	// (((Label))) - double circle
	if (definition.startsWith('(((') && definition.endsWith(')))')) {
		return { id, label: cleanLabel(definition.slice(3, -3)), shape: 'double-circle' }
	}

	// ((Label)) - circle
	if (definition.startsWith('((') && definition.endsWith('))')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'ellipse' }
	}

	// ([Label]) - stadium (pill shape)
	if (definition.startsWith('([') && definition.endsWith('])')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'stadium' }
	}

	// [(Label)] - cylinder
	if (definition.startsWith('[(') && definition.endsWith(')]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'cylinder' }
	}

	// (Label) - rounded rectangle
	if (definition.startsWith('(') && definition.endsWith(')')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'oval' }
	}

	// [[Label]] - subroutine (rectangle with double borders)
	if (definition.startsWith('[[') && definition.endsWith(']]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'subroutine' }
	}

	// {{Label}} - hexagon
	if (definition.startsWith('{{') && definition.endsWith('}}')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'hexagon' }
	}

	// [/Label/] - parallelogram (alt 1)
	if (definition.startsWith('[/') && definition.endsWith('/]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'parallelogram' }
	}

	// [\Label\] - parallelogram (alt 2)
	if (definition.startsWith('[\\') && definition.endsWith('\\]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'parallelogram' }
	}

	// [/Label\] - trapezoid (alt 1)
	if (definition.startsWith('[/') && definition.endsWith('\\]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'trapezoid' }
	}

	// [\Label/] - trapezoid (alt 2)
	if (definition.startsWith('[\\') && definition.endsWith('/]')) {
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'trapezoid' }
	}

	// [Label] - rectangle
	if (definition.startsWith('[') && definition.endsWith(']')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'rectangle' }
	}

	// {Label} - diamond/rhombus
	if (definition.startsWith('{') && definition.endsWith('}')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'diamond' }
	}

	// >Label] - flag/asymmetric shape
	if (definition.startsWith('>') && definition.endsWith(']')) {
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'flag' }
	}

	return null
}

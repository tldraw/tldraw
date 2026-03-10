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
	/** Mermaid line styles: solid (--), dotted (-.-), thick (==) */
	lineStyle: 'solid' | 'dotted' | 'thick'
}

export interface LinkStyleOverride {
	index: number
	stroke?: string // CSS color
}

export interface ParsedFlowchart {
	direction: 'LR' | 'RL' | 'TB' | 'BT' | 'TD'
	nodes: MermaidNode[]
	edges: MermaidEdge[]
	linkStyles: LinkStyleOverride[]
}

/**
 * Parse a Mermaid flowchart into nodes and edges
 */
export function parseMermaidFlowchart(code: string): ParsedFlowchart | null {
	try {
		const rawLines = code
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith('%%'))

		if (rawLines.length === 0) return null

		// Parse direction from first line — support 'flowchart' and legacy 'graph' syntax
		const firstLine = rawLines[0]
		const directionMatch = firstLine.match(/^(?:flowchart|graph)\s+(LR|RL|TB|BT|TD)/)
		if (!directionMatch) return null
		const direction = directionMatch[1] as ParsedFlowchart['direction']

		// Preprocess: flatten subgraphs, skip directives, expand & and multi-hop chains
		const { contentLines: lines, linkStyles } = preprocessLines(rawLines.slice(1))

		const nodes: MermaidNode[] = []
		const edges: MermaidEdge[] = []
		const nodeMap = new Map<string, MermaidNode>()

		for (const line of lines) {
			// Handle "-- label -->" syntax: A -- text --> B[Label]
			const labeledEdgePattern =
				/^(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?\s*--\s+(.+?)\s+(--[->ox]|==+[=>]|-\.->)\s*(\w+)([\[\{\(][^\]\}\)]*[\]\}\)])?/
			const labeledEdgeMatch = line.match(labeledEdgePattern)
			if (labeledEdgeMatch) {
				const [, from, edgeLabel, arrow, to, toDefinition] = labeledEdgeMatch
				const arrowEnd: MermaidEdge['arrowEnd'] = arrow.endsWith('>')
					? 'arrow'
					: arrow.endsWith('o')
						? 'dot'
						: arrow.endsWith('x')
							? 'bar'
							: 'none'
				const lineStyle: MermaidEdge['lineStyle'] = arrow.includes('.')
					? 'dotted'
					: arrow.startsWith('==')
						? 'thick'
						: 'solid'
				edges.push({ from, to, label: edgeLabel.trim(), arrowStart: 'none', arrowEnd, lineStyle })

				const fromNodeMatch = line.match(
					new RegExp(`^${from}([\\[\\{\\(][^\\]\\}\\)]+[\\]\\}\\)])`)
				)
				if (fromNodeMatch && !nodeMap.has(from)) {
					const node = parseNodeDefinition(from, fromNodeMatch[1])
					if (node) {
						nodes.push(node)
						nodeMap.set(from, node)
					}
				}
				if (!nodeMap.has(from)) {
					const node: MermaidNode = { id: from, label: from, shape: 'rectangle' }
					nodes.push(node)
					nodeMap.set(from, node)
				}
				if (toDefinition && !nodeMap.has(to)) {
					const node = parseNodeDefinition(to, toDefinition)
					if (node) {
						nodes.push(node)
						nodeMap.set(to, node)
					}
				}
				if (!nodeMap.has(to)) {
					const node: MermaidNode = { id: to, label: to, shape: 'rectangle' }
					nodes.push(node)
					nodeMap.set(to, node)
				}
				continue
			}

			// Parse edges with various arrow types
			const edgePattern =
				/(o|x)?(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?\s*(---|--|==>|-->|->|-\.->|<-->|o--|--o|x--|--x|o--o|x--x)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:[\[\{\(][^\]\}\)]*[\]\}\)])?(o|x)?/
			const edgeMatch = line.match(edgePattern)

			if (edgeMatch) {
				const [, startMarker, from, arrow, label, to, endMarker] = edgeMatch

				let arrowStart: MermaidEdge['arrowStart'] = 'none'
				if (arrow.startsWith('<') || arrow.startsWith('o') || startMarker === 'o') {
					arrowStart = arrow.startsWith('o') || startMarker === 'o' ? 'dot' : 'arrow'
				} else if (arrow.startsWith('x') || startMarker === 'x') {
					arrowStart = 'bar'
				}

				let arrowEnd: MermaidEdge['arrowEnd'] = 'none'
				if (arrow.endsWith('>')) {
					arrowEnd = 'arrow'
				} else if (arrow.endsWith('o') || endMarker === 'o') {
					arrowEnd = 'dot'
				} else if (arrow.endsWith('x') || endMarker === 'x') {
					arrowEnd = 'bar'
				}

				let lineStyle: MermaidEdge['lineStyle'] = 'solid'
				if (arrow.includes('.')) {
					lineStyle = 'dotted'
				} else if (arrow.startsWith('===') || arrow.startsWith('==')) {
					lineStyle = 'thick'
				}

				edges.push({ from, to, label: label?.trim(), arrowStart, arrowEnd, lineStyle })

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

		return { direction, nodes, edges, linkStyles }
	} catch (error) {
		return null
	}
}

/**
 * Preprocess lines: flatten subgraphs, skip directives, expand & and multi-hop chains.
 * Extracts linkStyle directives separately for per-edge styling.
 */
function preprocessLines(lines: string[]): {
	contentLines: string[]
	linkStyles: LinkStyleOverride[]
} {
	const contentLines: string[] = []
	const linkStyles: LinkStyleOverride[] = []
	let subgraphDepth = 0

	for (const line of lines) {
		// Extract linkStyle directives: linkStyle N stroke:#color,...
		const linkStyleMatch = line.match(/^linkStyle\s+(\d+)\s+(.+)/)
		if (linkStyleMatch) {
			const index = parseInt(linkStyleMatch[1], 10)
			const styles = linkStyleMatch[2]
			const strokeMatch = styles.match(/stroke\s*:\s*(#?[\w-]+)/)
			if (strokeMatch) {
				linkStyles.push({ index, stroke: strokeMatch[1] })
			}
			continue
		}

		// Skip other styling/callback directives — cosmetic only
		if (/^(style|classDef|click)\b/.test(line)) continue
		// Skip "class NodeId styleName" assignment (not a class definition)
		if (/^class\s+\w[\w\s,]*\s+\w+$/.test(line) && !line.includes('{')) continue

		// Track subgraph nesting — flatten content, skip markers
		if (/^subgraph\b/.test(line)) {
			subgraphDepth++
			continue
		}
		if (line === 'end') {
			if (subgraphDepth > 0) {
				subgraphDepth--
				continue
			}
			continue
		}

		// Expand & and multi-hop, then collect all resulting lines
		for (const expanded of expandLine(line)) {
			contentLines.push(expanded)
		}
	}

	return { contentLines, linkStyles }
}

/**
 * Expand a single line into multiple lines if it uses & (multi-source/target) or
 * multi-hop chaining (A --> B --> C).
 */
function expandLine(line: string): string[] {
	// Arrow tokens we recognise
	const arrowRe = /-->|---|--|==>|-.->|<-->|--o|--x|o--|x--|o--o|x--x/

	// Expand "A & B --> C" (multiple sources) into ["A --> C", "B --> C"]
	const ampFromMatch = line.match(
		/^((?:\w+\s*&\s*)+\w+)((?:\s*[\[\{\(][^\]\}\)]*[\]\}\)])?\s*)((?:-->|---|--|==>|-.->).*)$/
	)
	if (ampFromMatch) {
		const [, nodeList, fromSuffix, rest] = ampFromMatch
		const ids = nodeList.split('&').map((n) => n.trim())
		return ids.flatMap((id) => expandLine(`${id}${fromSuffix}${rest}`))
	}

	// Expand "A --> B & C" (multiple targets) into ["A --> B", "A --> C"]
	// Pattern: nodeOrDef arrow [|label|] nodeList(&nodeList)
	const ampToMatch = line.match(
		/^(\w+(?:[\[\{\(][^\]\}\)]*[\]\}\)])?)\s*(-->|---|--|==>|-.->)\s*(?:\|([^|]*)\|)?\s*((?:\w+\s*&\s*)+\w+)([\[\{\(][^\]\}\)]*[\]\}\)])?(.*)$/
	)
	if (ampToMatch) {
		const [, from, arrow, label, nodeList, toDef, rest] = ampToMatch
		const ids = nodeList.split('&').map((n) => n.trim())
		const labelPart = label ? `|${label}|` : ''
		return ids.flatMap((id) =>
			expandLine(`${from} ${arrow} ${labelPart} ${id}${toDef ?? ''}${rest}`)
		)
	}

	// Expand multi-hop chains: A --> B --> C  =>  ["A --> B", "B --> C"]
	// Strategy: match one edge, then check if the remaining string starts with another arrow
	const hopMatch = line.match(
		/^(\w+)([\[\{\(][^\]\}\)]*[\]\}\)])?(\s*(?:-->|---|--|==>|-.->)\s*(?:\|[^|]*\|)?\s*)(\w+)([\[\{\(][^\]\}\)]*[\]\}\)])?(.*)$/
	)
	if (hopMatch) {
		const [, from, fromDef, arrowPart, to, toDef, rest] = hopMatch
		if (rest && arrowRe.test(rest.trimStart())) {
			// There's a continuation: emit this edge and recurse on the rest
			const thisEdge = `${from}${fromDef ?? ''}${arrowPart}${to}${toDef ?? ''}`
			const nextLine = `${to}${toDef ?? ''}${rest}`
			return [thisEdge, ...expandLine(nextLine)]
		}
	}

	return [line]
}

/**
 * Clean Mermaid label — remove backticks, outer quotes, and markdown formatting
 */
function cleanLabel(label: string): string {
	let cleaned = label.trim()
	if (cleaned.startsWith('"`') && cleaned.endsWith('`"')) cleaned = cleaned.slice(2, -2)
	else if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1)
	else if (cleaned.startsWith('`') && cleaned.endsWith('`')) cleaned = cleaned.slice(1, -1)
	cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1')
	cleaned = cleaned.replace(/_(.+?)_/g, '$1')
	return cleaned
}

/**
 * Parse a node definition like [Label], {Label}, (Label), etc.
 */
function parseNodeDefinition(id: string, definition: string): MermaidNode | null {
	if (definition.startsWith('(((') && definition.endsWith(')))'))
		return { id, label: cleanLabel(definition.slice(3, -3)), shape: 'double-circle' }
	if (definition.startsWith('((') && definition.endsWith('))'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'ellipse' }
	if (definition.startsWith('([') && definition.endsWith('])'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'stadium' }
	if (definition.startsWith('[(') && definition.endsWith(')]'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'cylinder' }
	if (definition.startsWith('(') && definition.endsWith(')'))
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'oval' }
	if (definition.startsWith('[[') && definition.endsWith(']]'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'subroutine' }
	if (definition.startsWith('{{') && definition.endsWith('}}'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'hexagon' }
	if (definition.startsWith('[/') && definition.endsWith('\\]'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'trapezoid' }
	if (definition.startsWith('[\\') && definition.endsWith('/]'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'trapezoid' }
	if (definition.startsWith('[/') && definition.endsWith('/]'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'parallelogram' }
	if (definition.startsWith('[\\') && definition.endsWith('\\]'))
		return { id, label: cleanLabel(definition.slice(2, -2)), shape: 'parallelogram' }
	if (definition.startsWith('[') && definition.endsWith(']'))
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'rectangle' }
	if (definition.startsWith('{') && definition.endsWith('}'))
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'diamond' }
	if (definition.startsWith('>') && definition.endsWith(']'))
		return { id, label: cleanLabel(definition.slice(1, -1)), shape: 'flag' }
	return null
}

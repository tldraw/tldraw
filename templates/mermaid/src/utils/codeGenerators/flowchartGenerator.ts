/**
 * Generate Mermaid flowchart code from a ParsedFlowchart AST.
 */

import type { MermaidEdge, ParsedFlowchart } from '../parseMermaidFlowchart'
import { tldrawColorToCss } from '../shapeReaders/propertyMappings'

export function generateFlowchartCode(ast: ParsedFlowchart): string {
	const lines: string[] = [`flowchart ${ast.direction}`]

	// Track which nodes have appeared in edge definitions
	const definedNodes = new Set<string>()

	// Generate edges
	for (const edge of ast.edges) {
		const fromDef = nodeDefinition(ast, edge.from, !definedNodes.has(edge.from))
		const toDef = nodeDefinition(ast, edge.to, !definedNodes.has(edge.to))
		definedNodes.add(edge.from)
		definedNodes.add(edge.to)

		const arrowSyntax = buildArrowSyntax(edge)
		const label = edge.label ? `|${edge.label}|` : ''

		lines.push(`${fromDef} ${arrowSyntax}${label} ${toDef}`)
	}

	// Add standalone nodes (not referenced in any edge)
	for (const node of ast.nodes) {
		if (!definedNodes.has(node.id)) {
			lines.push(nodeDefinition(ast, node.id, true))
		}
	}

	// Emit linkStyle directives for colored edges
	for (let i = 0; i < ast.edges.length; i++) {
		const edge = ast.edges[i] as MermaidEdge & { color?: string }
		if (edge.color && edge.color !== 'black') {
			const cssColor = tldrawColorToCss(edge.color)
			if (cssColor) {
				lines.push(`linkStyle ${i} stroke:${cssColor}`)
			}
		}
	}

	return lines.join('\n')
}

function nodeDefinition(ast: ParsedFlowchart, nodeId: string, includeLabel: boolean): string {
	if (!includeLabel) return nodeId

	const node = ast.nodes.find((n) => n.id === nodeId)
	const label = node?.label ?? nodeId

	switch (node?.shape) {
		case 'diamond': return `${nodeId}{${label}}`
		case 'ellipse': return `${nodeId}((${label}))`
		case 'oval': return `${nodeId}(${label})`
		case 'stadium': return `${nodeId}([${label}])`
		case 'hexagon': return `${nodeId}{{${label}}}`
		case 'trapezoid': return `${nodeId}[/${label}\\]`
		case 'parallelogram': return `${nodeId}[/${label}/]`
		case 'subroutine': return `${nodeId}[[${label}]]`
		case 'cylinder': return `${nodeId}[(${label})]`
		case 'double-circle': return `${nodeId}(((${label})))`
		case 'flag': return `${nodeId}>${label}]`
		case 'rectangle':
		default: return `${nodeId}[${label}]`
	}
}

function buildArrowSyntax(edge: MermaidEdge): string {
	let syntax = ''

	// Start arrowhead
	if (edge.arrowStart === 'arrow') syntax += '<'
	else if (edge.arrowStart === 'dot') syntax += 'o'
	else if (edge.arrowStart === 'bar') syntax += 'x'

	// Line style: solid (--), dotted (-.-), thick (==)
	if (edge.lineStyle === 'dotted') syntax += '-.-'
	else if (edge.lineStyle === 'thick') syntax += '=='
	else syntax += '--'

	// End arrowhead
	if (edge.arrowEnd === 'arrow') syntax += '>'
	else if (edge.arrowEnd === 'dot') syntax += 'o'
	else if (edge.arrowEnd === 'bar') syntax += 'x'
	else syntax += '-'

	return syntax
}

import { parseMermaidFlowchart } from '../../parseMermaidFlowchart'
import { cssColorToTldraw } from '../../shapeReaders/propertyMappings'
import { detectGeoShape, extractSvgText, getNodeBounds } from '../svgUtils'
import { DiagramLayout, EdgeLayout, NodeLayout } from '../types'

export function extractFlowchartLayout(svgEl: Element, code: string): DiagramLayout {
	const ast = parseMermaidFlowchart(code)
	const nodes: NodeLayout[] = []
	const edges: EdgeLayout[] = []

	// Build AST lookup by node id
	const astNodeMap = new Map<string, any>()
	if (ast) {
		for (const node of ast.nodes) astNodeMap.set(node.id, node)
	}

	// Extract nodes: g.node elements with id="flowchart-{nodeId}-{N}"
	const nodeEls = svgEl.querySelectorAll('g.node')
	nodeEls.forEach((el) => {
		const rawId = el.getAttribute('id') ?? ''
		// Extract the node ID between "flowchart-" and the trailing "-N"
		const match = rawId.match(/^flowchart-(.+)-\d+$/)
		if (!match) return
		const nodeId = match[1]

		const bounds = getNodeBounds(el)
		const geoShape = detectGeoShape(el)
		const astNode = astNodeMap.get(nodeId)
		const label = astNode?.label ?? extractSvgText(el)

		nodes.push({
			id: nodeId,
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
			geoShape,
			label,
			meta: {
				diagramType: 'flowchart',
				originalId: nodeId,
				mermaidGeoType: astNode?.shape ?? 'rectangle',
			},
		})
	})

	// Extract edges from AST (has labels) + match positions from SVG paths if needed
	if (ast) {
		// Build linkStyle lookup: edge index -> stroke color
		const linkStyleMap = new Map<number, string>()
		for (const ls of ast.linkStyles) {
			if (ls.stroke) linkStyleMap.set(ls.index, ls.stroke)
		}

		for (let i = 0; i < ast.edges.length; i++) {
			const edge = ast.edges[i]
			const edgeColor = linkStyleMap.get(i)
			// Map CSS color to tldraw color name
			const tldrawColor = edgeColor ? cssColorToTldraw(edgeColor) : undefined
			edges.push({
				id: `edge-${i}`,
				from: edge.from,
				to: edge.to,
				label: edge.label ?? '',
				meta: {
					diagramType: 'flowchart',
					arrowType: edge.arrowEnd ?? 'arrow',
					arrowStartType: edge.arrowStart ?? 'none',
					lineStyle: edge.lineStyle ?? 'solid',
					originalIndex: i,
					...(tldrawColor ? { edgeColor: tldrawColor } : {}),
				},
			})
		}
	}

	return { type: 'flowchart', nodes, edges }
}

import { parseStateDiagram } from '../../parseStateDiagram'
import { extractSvgText, getNodeBounds } from '../svgUtils'
import { DiagramLayout, EdgeLayout, NodeLayout } from '../types'

export function extractStateLayout(svgEl: Element, code: string): DiagramLayout {
	const ast = parseStateDiagram(code)
	const nodes: NodeLayout[] = []
	const edges: EdgeLayout[] = []

	const stateMap = new Map<string, any>()
	if (ast) {
		for (const s of ast.states) stateMap.set(s.id, s)
	}

	// State nodes: same dagre-based layout as flowchart, nodes are g.node elements
	const nodeEls = svgEl.querySelectorAll('g.node, g.stateGroup')
	const processedIds = new Set<string>()

	nodeEls.forEach((el) => {
		const rawId = el.getAttribute('id') ?? ''
		const bounds = getNodeBounds(el)

		// Try to match to a state by label or ID
		const label = extractSvgText(el)

		// Check for start/end markers (filled circles)
		const circle = el.querySelector('circle')
		const isStartOrEnd = circle !== null

		if (isStartOrEnd) {
			// Determine if start or end by class
			const isEnd = el.classList.contains('end') || rawId.includes('end')
			const id = isEnd ? 'end' : 'start'
			if (!processedIds.has(id)) {
				processedIds.add(id)
				nodes.push({
					id,
					x: bounds.x,
					y: bounds.y,
					width: bounds.width,
					height: bounds.height,
					geoShape: 'ellipse',
					label: '',
					meta: {
						diagramType: 'stateDiagram',
						stateData: { id, label: '', isStart: !isEnd, isEnd },
					},
				})
			}
			return
		}

		// Regular state - match by label
		const state = ast?.states.find((s) => s.label === label || s.id === label)
		if (!state || processedIds.has(state.id)) return
		processedIds.add(state.id)

		// choice/fork/join render as diamonds; everything else is a rectangle
		const geoShape = (state as any).stateType === 'choice' ? 'diamond' : 'rectangle'

		nodes.push({
			id: state.id,
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
			geoShape,
			label: state.label,
			meta: {
				diagramType: 'stateDiagram',
				stateData: { id: state.id, label: state.label, isStart: state.isStart, isEnd: state.isEnd, stateType: (state as any).stateType },
			},
		})
	})

	// Ensure start/end nodes exist if transitions reference them.
	// Position them relative to existing nodes rather than at the origin.
	if (ast) {
		const hasStart = ast.transitions.some((t) => t.from === 'start')
		const hasEnd = ast.transitions.some((t) => t.to === 'end')

		// Compute bounding box of existing nodes for smart placement
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
		for (const n of nodes) { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height) }
		const centerX = nodes.length > 0 ? (minX + maxX) / 2 - 15 : 0

		if (hasStart && !nodes.find((n) => n.id === 'start')) {
			nodes.unshift({
				id: 'start',
				x: centerX,
				y: nodes.length > 0 ? minY - 60 : 0,
				width: 30,
				height: 30,
				geoShape: 'ellipse',
				label: '',
				meta: {
					diagramType: 'stateDiagram',
					stateData: { id: 'start', label: '', isStart: true, isEnd: false },
				},
			})
		}
		if (hasEnd && !nodes.find((n) => n.id === 'end')) {
			nodes.push({
				id: 'end',
				x: centerX,
				y: nodes.length > 0 ? maxY + 30 : 100,
				width: 30,
				height: 30,
				geoShape: 'ellipse',
				label: '',
				meta: {
					diagramType: 'stateDiagram',
					stateData: { id: 'end', label: '', isStart: false, isEnd: true },
				},
			})
		}

		for (let i = 0; i < ast.transitions.length; i++) {
			const t = ast.transitions[i]
			edges.push({
				id: `trans-${i}`,
				from: t.from,
				to: t.to,
				label: t.label ?? '',
				meta: {
					diagramType: 'stateDiagram',
					transitionData: { from: t.from, to: t.to, label: t.label ?? '' },
				},
			})
		}
	}

	return { type: 'stateDiagram', nodes, edges }
}

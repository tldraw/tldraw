import { parseFlowchartLayout } from './flowchartDiagram'
import { parseStateDiagramLayout } from './stateDiagram'

function appendNode(root: Element, domId: string) {
	const group = document.createElement('div')
	group.classList.add('node')
	group.setAttribute('id', domId)
	group.setAttribute('transform', 'translate(100, 50)')
	const rect = document.createElement('rect')
	rect.setAttribute('width', '80')
	rect.setAttribute('height', '40')
	group.appendChild(rect)
	root.appendChild(group)
}

function appendEdge(root: Element, dataId: string, points: [number, number][]) {
	const path = document.createElement('path')
	path.setAttribute('data-id', dataId)
	path.setAttribute('id', `mermaid-0-${dataId}`)
	path.setAttribute('data-points', btoa(JSON.stringify(points.map(([x, y]) => ({ x, y })))))
	root.appendChild(path)
}

describe('parseFlowchartLayout', () => {
	// Mermaid 11.15 prefixes node dom ids with the diagram id.
	it('parses node ids from diagram-id-prefixed dom ids', () => {
		const root = document.createElement('div')
		appendNode(root, 'mermaid-0-flowchart-s1-0')
		appendNode(root, 'mermaid-0-flowchart-s2-1')
		appendEdge(root, 'L_s1_s2_0', [
			[0, 0],
			[100, 0],
		])

		const layout = parseFlowchartLayout(root)

		expect([...layout.nodes.keys()].sort()).toEqual(['s1', 's2'])
		expect(layout.edges.map((e) => [e.start, e.end])).toEqual([['s1', 's2']])
	})

	it('still parses legacy unprefixed dom ids', () => {
		const root = document.createElement('div')
		appendNode(root, 'flowchart-s1-0')
		appendEdge(root, 'L_s1_s2_0', [
			[0, 0],
			[100, 0],
		])

		const layout = parseFlowchartLayout(root)

		expect([...layout.nodes.keys()]).toEqual(['s1'])
		expect(layout.edges.map((e) => [e.start, e.end])).toEqual([['s1', 's2']])
	})
})

describe('parseStateDiagramLayout', () => {
	it('parses node ids from diagram-id-prefixed dom ids', () => {
		const root = document.createElement('div')
		appendNode(root, 'mermaid-0-state-Still-2')
		appendNode(root, 'mermaid-0-state-Moving-3')
		appendEdge(root, 'edge0', [
			[0, 0],
			[100, 0],
		])

		const layout = parseStateDiagramLayout(root)

		expect([...layout.nodes.keys()].sort()).toEqual(['Moving', 'Still'])
		expect(layout.edges).toHaveLength(1)
	})
})

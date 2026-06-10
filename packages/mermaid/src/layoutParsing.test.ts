import { assertBlueprintMapped, MermaidDiagramError } from './createMermaidDiagram'
import { parseFlowchartLayout } from './flowchartDiagram'
import { parseStateDiagramLayout } from './stateDiagram'

const DIAGRAM_ID = 'mermaid-0'

// The real parse root is the rendered `<svg>`, whose own id is the diagram id
// that prefixes every node/cluster dom id. Mirror that here.
function makeRoot() {
	const root = document.createElement('div')
	root.setAttribute('id', DIAGRAM_ID)
	return root
}

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

function appendCluster(root: Element, domId: string, clusterClass: string) {
	const group = document.createElement('div')
	group.classList.add(clusterClass)
	group.setAttribute('id', domId)
	const rect = document.createElement('rect')
	rect.setAttribute('x', '8')
	rect.setAttribute('y', '8')
	rect.setAttribute('width', '200')
	rect.setAttribute('height', '120')
	group.appendChild(rect)
	root.appendChild(group)
}

function appendEdge(root: Element, dataId: string, points: [number, number][]) {
	const path = document.createElement('path')
	// Mermaid tags edge paths with this marker; detection relies on it rather
	// than on the (version-specific) id format.
	path.setAttribute('data-et', 'edge')
	path.setAttribute('data-id', dataId)
	path.setAttribute('id', `${DIAGRAM_ID}-${dataId}`)
	path.setAttribute('data-points', btoa(JSON.stringify(points.map(([x, y]) => ({ x, y })))))
	root.appendChild(path)
}

describe('parseFlowchartLayout', () => {
	// Mermaid 11.15 prefixes node dom ids with the diagram id.
	it('parses node ids from diagram-id-prefixed dom ids', () => {
		const root = makeRoot()
		appendNode(root, 'mermaid-0-flowchart-s1-0')
		appendNode(root, 'mermaid-0-flowchart-s2-1')
		appendEdge(root, 'L_s1_s2_0', [
			[0, 0],
			[100, 0],
		])

		const layout = parseFlowchartLayout(root)

		// Node ids are recovered by stripping the known diagram-id prefix.
		expect([...layout.nodes.keys()].sort()).toEqual(['s1', 's2'])
		// The node's geometry is its `translate()` center and rect size, scaled by
		// LAYOUT_SCALE (1.25). This is the data production actually consumes.
		expect(layout.nodes.get('s1')).toMatchObject({
			center: { x: 125, y: 62.5 },
			width: 100,
			height: 50,
		})
		// The edge's waypoints are decoded from data-points and scaled by 1.25.
		expect(layout.edges).toHaveLength(1)
		expect(layout.edges[0].points).toEqual([
			{ x: 0, y: 0 },
			{ x: 125, y: 0 },
		])
	})

	it('parses subgraph cluster ids by stripping the diagram-id prefix', () => {
		const root = makeRoot()
		// Subgraph cluster ids are `${diagramId}-${subgraphId}` with no inner
		// token, so only diagram-id stripping can recover the clean id.
		appendNode(root, 'mermaid-0-flowchart-a1-0')
		appendCluster(root, 'mermaid-0-G', 'cluster')

		const layout = parseFlowchartLayout(root)

		expect([...layout.clusters.keys()]).toEqual(['G'])
	})

	it('still parses legacy unprefixed dom ids', () => {
		const root = makeRoot()
		appendNode(root, 'flowchart-s1-0')
		appendEdge(root, 'L_s1_s2_0', [
			[0, 0],
			[100, 0],
		])

		const layout = parseFlowchartLayout(root)

		expect([...layout.nodes.keys()]).toEqual(['s1'])
		expect(layout.edges[0].points).toEqual([
			{ x: 0, y: 0 },
			{ x: 125, y: 0 },
		])
	})

	it('detects edges by their marker and decodes geometry, ignoring the id format', () => {
		const root = makeRoot()
		appendNode(root, 'mermaid-0-flowchart-s1-0')
		// A path whose id no longer matches any known pattern is still an edge,
		// and its geometry is still decoded.
		appendEdge(root, 'some-future-edge-id', [
			[0, 0],
			[40, 0],
		])

		const layout = parseFlowchartLayout(root)

		expect(layout.edges).toHaveLength(1)
		expect(layout.edges[0].points).toEqual([
			{ x: 0, y: 0 },
			{ x: 50, y: 0 },
		])
	})

	it('ignores non-edge paths that carry data-points', () => {
		const root = makeRoot()
		appendNode(root, 'mermaid-0-flowchart-s1-0')
		// A decorative path with waypoints but no edge marker must not be treated
		// as an edge.
		const decoy = document.createElement('path')
		decoy.setAttribute('data-points', btoa(JSON.stringify([{ x: 1, y: 1 }])))
		root.appendChild(decoy)

		const layout = parseFlowchartLayout(root)

		expect(layout.edges).toHaveLength(0)
	})
})

describe('parseStateDiagramLayout', () => {
	it('parses node ids from diagram-id-prefixed dom ids', () => {
		const root = makeRoot()
		appendNode(root, 'mermaid-0-state-Still-2')
		appendNode(root, 'mermaid-0-state-Moving-3')
		appendEdge(root, 'edge0', [
			[0, 0],
			[100, 0],
		])

		const layout = parseStateDiagramLayout(root)

		expect([...layout.nodes.keys()].sort()).toEqual(['Moving', 'Still'])
		expect(layout.edges).toHaveLength(1)
		expect(layout.edges[0].points).toEqual([
			{ x: 0, y: 0 },
			{ x: 125, y: 0 },
		])
	})

	it('parses compound cluster ids (diagram-id prefix + state token)', () => {
		const root = makeRoot()
		appendNode(root, 'mermaid-0-state-second-2')
		appendCluster(root, 'mermaid-0-state-First-1', 'statediagram-cluster')

		const layout = parseStateDiagramLayout(root)

		expect([...layout.clusters.keys()]).toEqual(['First'])
	})
})

describe('assertBlueprintMapped', () => {
	const counts = (over: Partial<Parameters<typeof assertBlueprintMapped>[1]> = {}) => ({
		expectedNodes: 2,
		mappedNodes: 2,
		expectedEdges: 1,
		mappedEdges: 1,
		...over,
	})

	it('passes when the blueprint maps nodes and edges', () => {
		expect(() => assertBlueprintMapped('flowchart-v2', counts())).not.toThrow()
	})

	it('throws when every node is dropped (the mermaid 11.15 regression shape)', () => {
		// DB has 5 vertices / 5 edges but the join produced an empty blueprint.
		expect(() =>
			assertBlueprintMapped('flowchart-v2', {
				expectedNodes: 5,
				mappedNodes: 0,
				expectedEdges: 5,
				mappedEdges: 0,
			})
		).toThrow(MermaidDiagramError)
	})

	it('throws when all edges drop but nodes survive', () => {
		expect(() => assertBlueprintMapped('flowchart-v2', counts({ mappedEdges: 0 }))).toThrow(
			MermaidDiagramError
		)
	})

	it('does not throw for legitimately edgeless or empty diagrams', () => {
		expect(() =>
			assertBlueprintMapped('flowchart-v2', counts({ expectedEdges: 0, mappedEdges: 0 }))
		).not.toThrow()
		expect(() =>
			assertBlueprintMapped('flowchart-v2', {
				expectedNodes: 0,
				mappedNodes: 0,
				expectedEdges: 0,
				mappedEdges: 0,
			})
		).not.toThrow()
	})
})

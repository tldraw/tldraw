import { fromMermaidFlowchart } from '../lib/utils/mermaid/parseMermaid'

describe('mermaid flowchart parser', () => {
	it('parses semicolon-separated edge statements as separate edges', () => {
		const graph = fromMermaidFlowchart(`flowchart TB
A-->B; C-->D`)

		expect(graph.nodes.map((node) => node.id).sort()).toEqual(['A', 'B', 'C', 'D'])
		expect(graph.edges.map((edge) => `${edge.sourceId}->${edge.targetId}`).sort()).toEqual([
			'A->B',
			'C->D',
		])
	})

	it('assigns parentId when a node is first referenced before entering its subgraph', () => {
		const graph = fromMermaidFlowchart(`flowchart TB
c1-->a2
subgraph one
  a1-->a2
end
subgraph three
  c1-->c2
end`)

		const nodesById = new Map(graph.nodes.map((node) => [node.id, node]))
		expect(nodesById.get('a1')?.parentId).toBe('one')
		expect(nodesById.get('a2')?.parentId).toBe('one')
		expect(nodesById.get('c1')?.parentId).toBe('three')
		expect(nodesById.get('c2')?.parentId).toBe('three')
	})
})

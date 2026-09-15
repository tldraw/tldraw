import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { MindmapNode } from 'mermaid/dist/diagrams/mindmap/mindmapTypes.js'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { Actor, Box, Message } from 'mermaid/dist/diagrams/sequence/types.js'
import type { StateStmt } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import type { DiagramMermaidBlueprint, MermaidBlueprintNode, MermaidDiagramKind } from './blueprint'
import {
	defaultMermaidNodeRenderSpec,
	resolveMermaidNodeRender,
} from './defaultMermaidNodeRenderSpec'
import { flowchartToBlueprint } from './flowchartDiagram'
import {
	MERMAID_MINDMAP_NODE_TYPE,
	mindmapToBlueprint,
	type ParsedMindmapLayout,
} from './mindmapDiagram'
import {
	countSequenceEvents,
	LINETYPE,
	PLACEMENT,
	sequenceToBlueprint,
	type ParsedSequenceLayout,
} from './sequenceDiagram'
import { stateToBlueprint } from './stateDiagram'
import type { ParsedCluster, ParsedDiagramLayout, ParsedEdge, ParsedNode } from './svgParsing'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function node(id: string, cx: number, cy: number, w: number, h: number): ParsedNode {
	return { id, center: { x: cx, y: cy }, width: w, height: h }
}

function cluster(id: string, x: number, y: number, w: number, h: number): ParsedCluster {
	return { id, topLeft: { x, y }, width: w, height: h }
}

function edge(start: string, end: string, points: [number, number][]): ParsedEdge {
	return { id: `L_${start}_${end}`, start, end, points: points.map(([x, y]) => ({ x, y })) }
}

function diagramLayout(
	nodes: ParsedNode[],
	clusters: ParsedCluster[] = [],
	edges: ParsedEdge[] = [],
	edgeLabels: ParsedDiagramLayout['edgeLabels'] = new Map()
): ParsedDiagramLayout {
	return {
		nodes: new Map(nodes.map((n) => [n.id, n])),
		clusters: new Map(clusters.map((c) => [c.id, c])),
		edges,
		edgeLabels,
	}
}

function vertex(
	id: string,
	opts: { text?: string; type?: string; classes?: string[]; styles?: string[] } = {}
): [string, FlowVertex] {
	return [
		id,
		{
			id,
			text: opts.text ?? id,
			type: (opts.type ?? 'rect') as FlowVertex['type'],
			classes: opts.classes ?? [],
			styles: opts.styles ?? [],
		} as FlowVertex,
	]
}

function flowEdge(start: string, end: string, opts: Partial<FlowEdge> = {}): FlowEdge {
	return {
		start,
		end,
		type: opts.type ?? 'arrow_point',
		text: opts.text ?? '',
		stroke: opts.stroke ?? 'normal',
		style: opts.style,
	} as FlowEdge
}

function subGraph(id: string, title: string, nodes: string[]): FlowSubGraph {
	return { id, title, nodes } as FlowSubGraph
}

/** Two nodes A and B side by side joined by a straight SVG edge. */
function twoNodeLayout() {
	return diagramLayout(
		[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
		[],
		[
			edge('A', 'B', [
				[20, 0],
				[180, 0],
			]),
		]
	)
}

function findNode(bp: DiagramMermaidBlueprint, id: string) {
	return bp.nodes.find((n) => n.id === id)
}

function findNodeByLabel(bp: DiagramMermaidBlueprint, label: string) {
	return bp.nodes.find((n) => n.label === label)
}

function findEdge(bp: DiagramMermaidBlueprint, from: string, to: string) {
	return bp.edges.find((e) => e.startNodeId === from && e.endNodeId === to)
}

function expectNodeGeo(
	node: MermaidBlueprintNode,
	geo: string,
	diagramKind: MermaidDiagramKind = 'flowchart'
) {
	expect(defaultMermaidNodeRenderSpec(diagramKind, node.kind)).toEqual({ variant: 'geo', geo })
}

function expectResolvedRender(
	diagramKind: MermaidDiagramKind,
	node: MermaidBlueprintNode,
	expected: ReturnType<typeof resolveMermaidNodeRender>,
	mapper?: Parameters<typeof resolveMermaidNodeRender>[2]
) {
	expect(resolveMermaidNodeRender(diagramKind, node, mapper)).toEqual(expected)
}

// ---------------------------------------------------------------------------
// Flowchart tests
// ---------------------------------------------------------------------------

describe('flowchartToBlueprint', () => {
	it('maps nodes with correct id, label, default geo render spec, and positions', () => {
		const layout = diagramLayout([node('A', 100, 50, 80, 40), node('B', 100, 150, 60, 60)])
		const vertices = new Map([
			vertex('A', { text: 'Start', type: 'rect' }),
			vertex('B', { text: 'Is it?', type: 'diamond' }),
		])
		const edges = [flowEdge('A', 'B')]

		const bp = flowchartToBlueprint(layout, vertices, edges)

		expect(bp.diagramKind).toBe('flowchart')
		expect(bp.nodes).toHaveLength(2)
		const a = findNode(bp, 'A')!
		expect(a.kind).toBe('rect')
		expect(a.label).toBe('Start')
		expectNodeGeo(a, 'rectangle')
		expect(a.x).toBe(100 - 80 / 2)
		expect(a.y).toBe(50 - 40 / 2)
		expect(a.w).toBe(80)
		expect(a.h).toBe(40)

		const b = findNode(bp, 'B')!
		expect(b.kind).toBe('diamond')
		expect(b.label).toBe('Is it?')
		expectNodeGeo(b, 'diamond')
	})

	it('maps edge labels and arrowhead types', () => {
		const layout = diagramLayout(
			[node('A', 100, 50, 80, 40), node('B', 300, 50, 80, 40)],
			[],
			[
				edge('A', 'B', [
					[140, 50],
					[260, 50],
				]),
			]
		)
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B', { text: 'Yes', type: 'arrow_point' })]

		const bp = flowchartToBlueprint(layout, vertices, edges)

		expect(bp.edges).toHaveLength(1)
		expect(bp.edges[0].label).toBe('Yes')
		expect(bp.edges[0].arrowheadEnd).toBe('arrow')
		expect(bp.edges[0].startNodeId).toBe('A')
		expect(bp.edges[0].endNodeId).toBe('B')
	})

	it('maps various geo shape types', () => {
		const types: [string, string][] = [
			['diamond', 'diamond'],
			['ellipse', 'ellipse'],
			['circle', 'ellipse'],
			['hexagon', 'hexagon'],
			['trapezoid', 'trapezoid'],
			['lean_right', 'rhombus'],
			['lean_left', 'rhombus-2'],
			['rect', 'rectangle'],
			['round', 'rectangle'],
			['subroutine', 'rectangle'],
		]

		for (const [mermaidType, expectedGeo] of types) {
			const id = `node_${mermaidType}`
			const layout = diagramLayout([node(id, 0, 0, 80, 40)])
			const vertices = new Map([vertex(id, { type: mermaidType })])

			const bp = flowchartToBlueprint(layout, vertices, [])
			expectNodeGeo(findNode(bp, id)!, expectedGeo)
		}
	})

	it('handles circle type with equal width/height', () => {
		const layout = diagramLayout([node('C', 100, 100, 60, 80)])
		const vertices = new Map([vertex('C', { type: 'circle' })])

		const bp = flowchartToBlueprint(layout, vertices, [])

		const c = findNode(bp, 'C')!
		expect(c.w).toBe(c.h)
		expect(c.w).toBe(80)
	})

	it('creates subgraph frames with correct parent-child relationships', () => {
		const layout = diagramLayout(
			[node('a1', 50, 80, 60, 30), node('a2', 150, 80, 60, 30), node('b1', 300, 80, 60, 30)],
			[cluster('sg1', 10, 40, 200, 100), cluster('sg2', 260, 40, 100, 100)]
		)
		const vertices = new Map([vertex('a1'), vertex('a2'), vertex('b1')])
		const subGraphs = [
			subGraph('sg1', 'Group One', ['a1', 'a2']),
			subGraph('sg2', 'Group Two', ['b1']),
		]

		const bp = flowchartToBlueprint(layout, vertices, [], subGraphs)

		const sg1 = findNode(bp, 'sg1')!
		expect(sg1.label).toBe('Group One')
		expect(sg1.fill).toBe('semi')
		expect(sg1.verticalAlign).toBe('start')

		expect(findNode(bp, 'a1')!.parentId).toBe('sg1')
		expect(findNode(bp, 'a2')!.parentId).toBe('sg1')
		expect(findNode(bp, 'b1')!.parentId).toBe('sg2')
	})

	it('computes bend for curved edges', () => {
		const layout = diagramLayout(
			[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
			[],
			[
				edge('A', 'B', [
					[20, 0],
					[100, -50],
					[180, 0],
				]),
			]
		)
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B')]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].bend).not.toBe(0)
	})

	it('handles self-loop edges with non-zero bend', () => {
		const layout = diagramLayout(
			[node('D', 100, 100, 80, 40)],
			[],
			[
				edge('D', 'D', [
					[100, 80],
					[140, 40],
					[100, 120],
				]),
			]
		)
		const vertices = new Map([vertex('D')])
		const edges = [flowEdge('D', 'D')]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].startNodeId).toBe('D')
		expect(bp.edges[0].endNodeId).toBe('D')
		expect(bp.edges[0].bend).not.toBe(0)
	})

	it('loops out of the side mermaid routed it and reaches out to its label', () => {
		// Node spans x 60–140, y 80–120. Mermaid's loop leaves and re-enters its bottom edge, the
		// side facing the next rank in a top-down chart, and dips 30 below it; its label is centred
		// 45 below that edge.
		const loopPoints: [number, number][] = [
			[90, 120],
			[80, 145],
			[110, 150],
			[120, 120],
		]
		const nodes = [node('B', 100, 100, 80, 40)]
		const vertices = new Map([vertex('B')])
		const edges = [flowEdge('B', 'B', { text: 'next page' })]

		const withLabel = flowchartToBlueprint(
			diagramLayout(
				nodes,
				[],
				[edge('B', 'B', loopPoints)],
				new Map([['L_B_B', { x: 60, y: 155, w: 80, h: 20 }]])
			),
			vertices,
			edges
		).edges[0]

		// The label stays on the arrow. tldraw centres it on the middle of the arc, so the loop
		// reaches the label's centre rather than stopping at mermaid's depth.
		expect(withLabel.label).toBe('next page')
		expect(withLabel.bend).toBe(45)
		// A loop on a top or bottom edge is wider than tall, which is when tldraw wraps its label to
		// the arrow's width; its ends spread across the edge to give the label room.
		expect(withLabel.anchorStartY).toBe(1)
		expect(withLabel.anchorEndY).toBe(1)
		expect(withLabel.anchorStartX).toBeCloseTo(0.1625)
		expect(withLabel.anchorEndX).toBeCloseTo(0.9625)

		const withoutLabel = flowchartToBlueprint(
			diagramLayout(nodes, [], [edge('B', 'B', loopPoints)]),
			vertices,
			edges
		).edges[0]
		// An edge between two shapes would get 54 here, which on a loop is needlessly deep.
		expect(withoutLabel.bend).toBe(30)
	})

	it('leaves anchors alone on edges between two nodes', () => {
		const labelBox = { x: 90, y: 30, w: 40, h: 20 }
		const layout = diagramLayout(
			[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
			[],
			[
				edge('A', 'B', [
					[20, 0],
					[180, 0],
				]),
			],
			new Map([['L_A_B', labelBox]])
		)
		const edges = [flowEdge('A', 'B', { text: 'go' })]

		const bp = flowchartToBlueprint(layout, new Map([vertex('A'), vertex('B')]), edges)

		expect(bp.edges[0]).not.toHaveProperty('anchorStartX')
	})

	it('filters out edges referencing missing nodes', () => {
		const layout = diagramLayout([node('A', 0, 0, 40, 40)])
		const vertices = new Map([vertex('A')])
		const edges = [flowEdge('A', 'MISSING')]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges).toHaveLength(0)
	})

	it('maps classDef fill colors', () => {
		const layout = diagramLayout([node('A', 50, 50, 80, 40), node('B', 200, 50, 80, 40)])
		const vertices = new Map([
			vertex('A', { text: 'Start', classes: ['green'] }),
			vertex('B', { text: 'End', classes: ['blue'] }),
		])
		const classDefs = new Map<string, { styles: string[] }>([
			['green', { styles: ['fill:#00ff00'] }],
			['blue', { styles: ['fill:#0000ff'] }],
		])

		const bp = flowchartToBlueprint(layout, vertices, [], undefined, classDefs as any)

		expect(findNodeByLabel(bp, 'Start')!.fill).toBe('solid')
		expect(findNodeByLabel(bp, 'Start')!.color).toBe('light-green')
		expect(findNodeByLabel(bp, 'End')!.fill).toBe('solid')
		expect(findNodeByLabel(bp, 'End')!.color).toBe('blue')
	})

	it('maps inline style fill/stroke colors', () => {
		const layout = diagramLayout([node('A', 50, 50, 80, 40)])
		const vertices = new Map([
			vertex('A', { text: 'Styled', styles: ['fill:#ffebee', 'stroke:#c62828'] }),
		])

		const bp = flowchartToBlueprint(layout, vertices, [])

		const a = findNodeByLabel(bp, 'Styled')!
		expect(a.fill).toBe('solid')
		expect(a.color).toBe('red')
	})

	it('maps edge dash styles from stroke-dasharray', () => {
		const layout = twoNodeLayout()
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B', { style: ['stroke-dasharray: 4 3'] })]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].dash).toBe('dashed')
	})

	it('maps dotted stroke to dotted dash', () => {
		const layout = twoNodeLayout()
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B', { stroke: 'dotted' })]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].dash).toBe('dotted')
	})

	it('maps double_arrow edge type to bidirectional arrowheads', () => {
		const layout = twoNodeLayout()
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B', { type: 'double_arrow_point' })]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].arrowheadEnd).toBe('arrow')
		expect(bp.edges[0].arrowheadStart).toBe('arrow')
	})

	it('mapNodeToRenderSpec overrides default geo when returning a spec', () => {
		const layout = diagramLayout([node('A', 100, 50, 80, 40)])
		const vertices = new Map([vertex('A', { type: 'diamond' })])
		const bp = flowchartToBlueprint(layout, vertices, [])
		const mapNodeToRenderSpec = ({ kind }: { kind: string }) =>
			kind === 'diamond' ? { variant: 'geo' as const, geo: 'hexagon' as const } : undefined
		expectResolvedRender(
			'flowchart',
			findNode(bp, 'A')!,
			{ variant: 'geo', geo: 'hexagon' },
			mapNodeToRenderSpec
		)
	})

	it('mapNodeToRenderSpec can set variant shape on blueprint nodes', () => {
		const layout = diagramLayout([node('A', 100, 50, 80, 40)])
		const vertices = new Map([vertex('A')])
		const bp = flowchartToBlueprint(layout, vertices, [])
		const mapNodeToRenderSpec = () => ({
			variant: 'shape' as const,
			type: 'geo',
			props: { geo: 'star' },
		})
		expectResolvedRender(
			'flowchart',
			findNode(bp, 'A')!,
			{ variant: 'shape', type: 'geo', props: { geo: 'star' } },
			mapNodeToRenderSpec
		)
	})
})

// ---------------------------------------------------------------------------
// State diagram tests
// ---------------------------------------------------------------------------

describe('stateToBlueprint', () => {
	function stateStmt(id: string, opts: Partial<StateStmt> = {}): [string, StateStmt] {
		return [
			id,
			{
				id,
				type: opts.type ?? 'default',
				description: opts.description ?? '',
				descriptions: opts.descriptions,
				doc: opts.doc,
				note: (opts as any).note,
				classes: opts.classes,
				stmt: 'state',
			} as StateStmt,
		]
	}

	it('maps leaf states with correct geo and labels', () => {
		const layout = diagramLayout([
			node('Still', 100, 100, 80, 40),
			node('Moving', 250, 100, 80, 40),
		])
		const states = new Map([stateStmt('Still'), stateStmt('Moving')])
		const relations = [{ id1: 'Still', id2: 'Moving', relationTitle: 'go' }]

		const bp = stateToBlueprint(layout, states, relations)

		expect(bp.diagramKind).toBe('state')
		expect(findNode(bp, 'Still')!.label).toBe('Still')
		expectNodeGeo(findNode(bp, 'Still')!, 'rectangle', 'state')
		expect(findNode(bp, 'Moving')!.label).toBe('Moving')
		expect(findEdge(bp, 'Still', 'Moving')!.label).toBe('go')
	})

	it('loops out of the right edge of a left-to-right diagram, ends unspread', () => {
		// Mermaid loops out of the right edge (x 140), 25 deep, with its label centred 60 beyond it.
		const layout = diagramLayout(
			[node('Review', 100, 100, 80, 40)],
			[],
			[
				edge('Review', 'Review', [
					[140, 85],
					[165, 100],
					[140, 115],
				]),
			],
			new Map([['L_Review_Review', { x: 150, y: 90, w: 100, h: 20 }]])
		)
		const states = new Map([stateStmt('Review')])
		const relations = [{ id1: 'Review', id2: 'Review', relationTitle: 'request more changes' }]

		const loop = stateToBlueprint(layout, states, relations).edges[0]

		// A loop on a side edge is taller than wide, so tldraw gives its label the full 16em cap and
		// its ends stay where mermaid put them.
		expect(loop).toMatchObject({
			anchorStartX: 1,
			anchorStartY: 0.125,
			anchorEndX: 1,
			anchorEndY: 0.875,
			bend: -60,
			label: 'request more changes',
		})
	})

	it('maps start/end pseudo-states to ellipses', () => {
		const layout = diagramLayout([
			node('root_start', 50, 50, 20, 20),
			node('root_end', 300, 50, 20, 20),
			node('Idle', 175, 50, 80, 40),
		])
		const states = new Map([
			stateStmt('root_start', { type: 'start' }),
			stateStmt('root_end', { type: 'end' }),
			stateStmt('Idle'),
		])
		const relations = [
			{ id1: 'root_start', id2: 'Idle' },
			{ id1: 'Idle', id2: 'root_end' },
		]

		const bp = stateToBlueprint(layout, states, relations)

		const start = findNode(bp, 'root_start')!
		expectNodeGeo(start, 'ellipse', 'state')
		expect(start.fill).toBe('solid')

		const end = findNode(bp, 'root_end')!
		expectNodeGeo(end, 'ellipse', 'state')
		expect(end.fill).toBe('none')

		const endInner = findNode(bp, 'root_end__inner')!
		expectNodeGeo(endInner, 'ellipse', 'state')
		expect(endInner.fill).toBe('solid')
	})

	it('maps choice states to diamonds', () => {
		const layout = diagramLayout([node('D', 100, 100, 40, 40)])
		const states = new Map([stateStmt('D', { type: 'choice' })])

		const bp = stateToBlueprint(layout, states, [])
		expectNodeGeo(findNode(bp, 'D')!, 'diamond', 'state')
	})

	it('maps fork/join states to wide bars', () => {
		const layout = diagramLayout([node('F', 100, 100, 20, 20)])
		const states = new Map([stateStmt('F', { type: 'fork' })])

		const bp = stateToBlueprint(layout, states, [])

		const f = findNode(bp, 'F')!
		expectNodeGeo(f, 'rectangle', 'state')
		expect(f.fill).toBe('solid')
		expect(f.w).toBeGreaterThan(20)
	})

	it('creates compound state frames from clusters', () => {
		const layout = diagramLayout(
			[node('fA', 80, 100, 60, 30)],
			[cluster('First', 20, 40, 200, 120)]
		)
		const states = new Map([
			stateStmt('First', {
				description: 'First',
				doc: [
					{ stmt: 'state', id: 'fA', type: 'default', description: '' } as unknown as StateStmt,
				],
			}),
			stateStmt('fA'),
		])

		const bp = stateToBlueprint(layout, states, [])

		const first = findNode(bp, 'First')!
		expect(first.fill).toBe('semi')
		expect(first.label).toBe('First')
		expect(findNode(bp, 'fA')!.parentId).toBe('First')
	})

	it('creates note nodes with yellow color', () => {
		const layout = diagramLayout([
			node('Idle', 100, 100, 80, 40),
			node('Idle----note', 250, 100, 100, 40),
		])
		const states = new Map([stateStmt('Idle', { note: { text: 'Important note' } } as any)])

		const bp = stateToBlueprint(layout, states, [])

		const noteNode = findNode(bp, 'Idle----note')!
		expect(noteNode.label).toBe('Important note')
		expect(noteNode.color).toBe('yellow')
		expect(noteNode.fill).toBe('solid')

		const noteEdge = findEdge(bp, 'Idle', 'Idle----note')!
		expect(noteEdge.dash).toBe('dotted')
		expect(noteEdge.arrowheadEnd).toBe('none')
	})

	it('maps classDef fill colors', () => {
		const layout = diagramLayout([node('Idle', 100, 100, 80, 40)])
		const states = new Map([stateStmt('Idle', { classes: ['green'] })])
		const classDefs = new Map([['green', { styles: ['fill:#00ff00'] }]])

		const bp = stateToBlueprint(layout, states, [], classDefs as any)

		expect(findNode(bp, 'Idle')!.fill).toBe('solid')
		expect(findNode(bp, 'Idle')!.color).toBe('light-green')
	})

	it('computes edge bend from SVG edge waypoints', () => {
		const layout = diagramLayout(
			[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
			[],
			[
				edge('', '', [
					[0, 0],
					[100, -40],
					[200, 0],
				]),
			]
		)
		const states = new Map([stateStmt('A'), stateStmt('B')])
		const relations = [{ id1: 'A', id2: 'B' }]

		const bp = stateToBlueprint(layout, states, relations)
		expect(findEdge(bp, 'A', 'B')!.bend).not.toBe(0)
	})

	it('filters out edges referencing missing nodes', () => {
		const layout = diagramLayout([node('A', 0, 0, 40, 40)])
		const states = new Map([stateStmt('A')])
		const relations = [{ id1: 'A', id2: 'MISSING' }]

		const bp = stateToBlueprint(layout, states, relations)
		expect(bp.edges).toHaveLength(0)
	})

	it('uses auto-detected start/end types from ID suffixes', () => {
		const layout = diagramLayout([
			node('root_start', 50, 50, 20, 20),
			node('root_end2', 300, 50, 20, 20),
		])
		const states = new Map([
			stateStmt('root_start', { type: 'default' }),
			stateStmt('root_end2', { type: 'default' }),
		])

		const bp = stateToBlueprint(layout, states, [])

		expectNodeGeo(findNode(bp, 'root_start')!, 'ellipse', 'state')
		expectNodeGeo(findNode(bp, 'root_end2')!, 'ellipse', 'state')
	})
})

// ---------------------------------------------------------------------------
// Sequence diagram tests
// ---------------------------------------------------------------------------

describe('sequenceToBlueprint', () => {
	function actor(key: string, opts: Partial<Actor> = {}): [string, Actor] {
		return [
			key,
			{
				name: opts.name ?? key,
				description: opts.description ?? key,
				type: opts.type ?? 'participant',
			} as Actor,
		]
	}

	function msg(type: number, from: string, to: string, message = ''): Message {
		return { type, from, to, message } as Message
	}

	/** An `autonumber` directive in the shape mermaid's parser produces. */
	function autonumberMsg(opts: { start?: number; step?: number; visible: boolean }): Message {
		return { type: LINETYPE.AUTONUMBER, message: opts } as unknown as Message
	}

	function noteMsg(from: string, message: string, placement: number, to?: string): Message {
		return { type: LINETYPE.NOTE, from, to: to ?? from, message, placement } as unknown as Message
	}

	function actorLayout(
		xs: number[],
		noteRects: ParsedSequenceLayout['noteRects'] = [],
		measured: Partial<Pick<ParsedSequenceLayout, 'rowYs' | 'fragmentFrames'>> = {}
	): ParsedSequenceLayout {
		return {
			actorLayouts: xs.map((x) => ({ x, y: -200, w: 100, h: 50, bottomY: 200 })),
			noteRects,
			rowYs: measured.rowYs ?? new Map(),
			fragmentFrames: measured.fragmentFrames ?? new Map(),
		}
	}
	const twoActorLayout = () => actorLayout([-150, 150])
	const threeActorLayout = () => actorLayout([-300, 0, 300])

	it('creates top/bottom actor boxes and lifelines', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [msg(LINETYPE.SOLID, 'Alice', 'Bob', 'Hello')]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.diagramKind).toBe('sequence')
		expect(findNode(bp, 'actor-top-Alice')).toBeDefined()
		expect(findNode(bp, 'actor-top-Bob')).toBeDefined()
		expect(findNode(bp, 'actor-bottom-Alice')).toBeDefined()
		expect(findNode(bp, 'actor-bottom-Bob')).toBeDefined()

		expect(bp.lines!.find((l) => l.id === 'lifeline-Alice')).toBeDefined()
		expect(bp.lines!.find((l) => l.id === 'lifeline-Bob')).toBeDefined()
	})

	it('creates groups for actor elements', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [msg(LINETYPE.SOLID, 'Alice', 'Bob', 'Hi')]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.groups).toEqual([
			['actor-top-Alice', 'lifeline-Alice', 'actor-bottom-Alice'],
			['actor-top-Bob', 'lifeline-Bob', 'actor-bottom-Bob'],
		])
	})

	it('creates signal edges with correct labels and dash styles', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('John')])
		const messages = [
			msg(LINETYPE.SOLID, 'Alice', 'John', 'Hello John, how are you?'),
			msg(LINETYPE.DOTTED, 'John', 'Alice', 'Great!'),
			msg(LINETYPE.SOLID_OPEN, 'Alice', 'John', 'See you later!'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'John'], messages)

		expect(bp.edges).toHaveLength(3)
		expect(bp.edges[0].label).toBe('Hello John, how are you?')
		expect(bp.edges[0].dash).toBe('solid')
		expect(bp.edges[0].arrowheadEnd).toBe('arrow')

		expect(bp.edges[1].label).toBe('Great!')
		expect(bp.edges[1].dash).toBe('dotted')

		expect(bp.edges[2].label).toBe('See you later!')
		expect(bp.edges[2].arrowheadEnd).toBe('none')
	})

	it('maps arrow type variations correctly', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('A'), actor('B')])
		const messages = [
			msg(LINETYPE.SOLID_CROSS, 'A', 'B', 'cross'),
			msg(LINETYPE.DOTTED_CROSS, 'B', 'A', 'dotted cross'),
			msg(LINETYPE.DOTTED_OPEN, 'A', 'B', 'dotted open'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['A', 'B'], messages)

		expect(bp.edges[0].arrowheadEnd).toBe('bar')
		expect(bp.edges[0].dash).toBe('solid')
		expect(bp.edges[1].arrowheadEnd).toBe('bar')
		expect(bp.edges[1].dash).toBe('dotted')
		expect(bp.edges[2].arrowheadEnd).toBe('none')
		expect(bp.edges[2].dash).toBe('dotted')
	})

	it('creates self-message with non-zero bend', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('W')])
		const messages = [msg(LINETYPE.SOLID, 'W', 'W', 'execute()')]

		const bp = sequenceToBlueprint(layout, actors, ['W'], messages)

		const selfEdge = bp.edges.find(
			(e) => e.startNodeId === 'lifeline-W' && e.endNodeId === 'lifeline-W'
		)
		expect(selfEdge).toBeDefined()
		expect(selfEdge!.label).toBe('execute()')
		expect(selfEdge!.bend).not.toBe(0)
	})

	it('creates loop fragments', () => {
		const layout = threeActorLayout()
		const actors = new Map([actor('P'), actor('Q'), actor('W')])
		const messages = [
			msg(LINETYPE.SOLID, 'P', 'Q', 'enqueue'),
			{ type: LINETYPE.LOOP_START, message: 'poll' } as unknown as Message,
			msg(LINETYPE.SOLID, 'W', 'Q', 'dequeue'),
			msg(LINETYPE.DOTTED, 'Q', 'W', 'job?'),
			{ type: LINETYPE.LOOP_END } as unknown as Message,
		]

		const bp = sequenceToBlueprint(layout, actors, ['P', 'Q', 'W'], messages)

		const fragment = findNode(bp, 'fragment-0')
		expect(fragment).toBeDefined()
		expect(fragment!.label).toContain('loop')
		expect(fragment!.label).toContain('poll')
	})

	it('creates alt/else fragments with separator lines and section labels', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('User'), actor('App')])
		const messages = [
			msg(LINETYPE.SOLID, 'User', 'App', 'Sign in'),
			{ type: LINETYPE.ALT_START, message: 'Credentials valid' } as unknown as Message,
			msg(LINETYPE.DOTTED, 'App', 'User', 'Redirect to dashboard'),
			{ type: LINETYPE.ALT_ELSE, message: 'Credentials invalid' } as unknown as Message,
			msg(LINETYPE.DOTTED, 'App', 'User', 'Show error'),
			{ type: LINETYPE.ALT_END } as unknown as Message,
		]

		const bp = sequenceToBlueprint(layout, actors, ['User', 'App'], messages)

		const fragment = findNode(bp, 'fragment-0')
		expect(fragment).toBeDefined()
		expect(fragment!.label).toBe('alt [Credentials valid]')

		const sepLine = bp.lines!.find((l) => l.id === 'fragment-0-sep-1')
		expect(sepLine).toBeDefined()
		expect(sepLine!.dash).toBe('dashed')
		expect(sepLine!.endY).toBe(0)
		expect(sepLine!.endX).toBeGreaterThan(0)

		const sectionLabel = findNode(bp, 'fragment-0-section-1')
		expect(sectionLabel).toBeDefined()
		expect(sectionLabel!.label).toBe('[Credentials invalid]')
	})

	it('draws a colored rect fragment as a background so it does not hide the lifelines it spans', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('User'), actor('App')])
		const messages = [
			{ type: LINETYPE.RECT_START, message: 'rgb(200, 150, 255)' } as unknown as Message,
			msg(LINETYPE.SOLID, 'User', 'App', 'Sign in'),
			{ type: LINETYPE.RECT_END } as unknown as Message,
		]

		const bp = sequenceToBlueprint(layout, actors, ['User', 'App'], messages)

		expect(findNode(bp, 'fragment-0')).toMatchObject({
			fill: 'solid',
			color: 'violet',
			background: true,
		})
	})

	it('sizes a multi-line note from its longest line', () => {
		// Mermaid's own rect is narrow enough that the text estimate decides the width.
		const widthOf = (message: string) => {
			const layout = actorLayout([-150, 150], [{ x: 10, y: 50, w: 40, h: 40 }])
			const actors = new Map([actor('Alice'), actor('John')])
			const bp = sequenceToBlueprint(
				layout,
				actors,
				['Alice', 'John'],
				[noteMsg('Alice', message, PLACEMENT.RIGHTOF)]
			)
			return bp.nodes.find((n) => n.id.startsWith('note-'))!.w
		}

		// Same longest line, split three ways: measuring the whole label instead would size
		// the second note as though all three lines ran end to end.
		expect(widthOf('short<br/>the longest line in the note<br/>tiny')).toBe(
			widthOf('the longest line in the note')
		)
	})

	it('creates note nodes with yellow color and correct labels', () => {
		const layout = actorLayout([-150, 150], [{ x: 10, y: 50, w: 120, h: 40 }])
		const actors = new Map([actor('Alice'), actor('John')])
		const messages = [
			msg(LINETYPE.SOLID, 'Alice', 'John', 'Hello'),
			noteMsg('Alice', 'Alice thinks', PLACEMENT.RIGHTOF),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'John'], messages)

		const note = bp.nodes.find((n) => n.id.startsWith('note-'))
		expect(note).toBeDefined()
		expect(note!.label).toBe('Alice thinks')
		expect(note!.color).toBe('yellow')
		expect(note!.fill).toBe('solid')
		expectNodeGeo(note!, 'rectangle', 'sequence')
	})

	it('creates activation boxes', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('John')])
		const messages = [
			msg(LINETYPE.SOLID, 'Alice', 'John', 'Hello'),
			{ type: LINETYPE.ACTIVE_START, from: 'John' } as unknown as Message,
			msg(LINETYPE.DOTTED, 'John', 'Alice', 'Reply'),
			{ type: LINETYPE.ACTIVE_END, from: 'John' } as unknown as Message,
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'John'], messages)

		const activations = bp.nodes.filter((n) => n.id.startsWith('activation-'))
		expect(activations).toHaveLength(1)
		expect(activations[0].fill).toBe('solid')
		expect(activations[0].color).toBe('light-violet')
		expect(activations[0].w).toBe(20)
		expect(activations[0].h).toBeGreaterThan(0)
	})

	it('adds autonumber decorations', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [
			{ type: LINETYPE.AUTONUMBER } as unknown as Message,
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'Hello'),
			msg(LINETYPE.DOTTED, 'Bob', 'Alice', 'Hi'),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'How are you?'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.edges).toHaveLength(3)
		expect(bp.edges[0].decoration).toEqual({ type: 'autonumber', value: '1' })
		expect(bp.edges[1].decoration).toEqual({ type: 'autonumber', value: '2' })
		expect(bp.edges[2].decoration).toEqual({ type: 'autonumber', value: '3' })
	})

	it('honors autonumber start and step', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [
			autonumberMsg({ start: 10, step: 5, visible: true }),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'Hello'),
			msg(LINETYPE.SOLID, 'Bob', 'Alice', 'Hi'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.edges.map((e) => e.decoration?.value)).toEqual(['10', '15'])
	})

	it('stops numbering at autonumber off without clearing earlier numbers', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [
			autonumberMsg({ visible: true }),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'one'),
			msg(LINETYPE.SOLID, 'Bob', 'Alice', 'two'),
			autonumberMsg({ visible: false }),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'three'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.edges.map((e) => e.decoration?.value)).toEqual(['1', '2', undefined])
	})

	it('numbers only the signals after a mid-diagram autonumber', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'one'),
			autonumberMsg({ start: 10, step: 1, visible: true }),
			msg(LINETYPE.SOLID, 'Bob', 'Alice', 'two'),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'three'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.edges.map((e) => e.decoration?.value)).toEqual([undefined, '10', '11'])
	})

	it('does not let notes consume a sequence number', () => {
		const layout = actorLayout([-150, 150], [{ x: 10, y: 50, w: 120, h: 40 }])
		const actors = new Map([actor('Alice'), actor('Bob')])
		const messages = [
			autonumberMsg({ visible: true }),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'one'),
			noteMsg('Alice', 'a note', PLACEMENT.OVER),
			msg(LINETYPE.SOLID, 'Bob', 'Alice', 'two'),
		]

		const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

		expect(bp.edges.map((e) => e.decoration?.value)).toEqual(['1', '2'])
	})

	it('maps bidirectional arrows', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('A'), actor('B')])
		const messages = [msg(LINETYPE.BIDIRECTIONAL_SOLID, 'A', 'B', 'sync')]

		const bp = sequenceToBlueprint(layout, actors, ['A', 'B'], messages)

		expect(bp.edges[0].arrowheadEnd).toBe('arrow')
		expect(bp.edges[0].arrowheadStart).toBe('arrow')
	})

	it('handles created actors with late-appearing top box', () => {
		const layout = threeActorLayout()
		const actors = new Map([actor('User'), actor('App'), actor('JobRunner')])
		const createdActors = new Map([['JobRunner', 1]])
		const messages = [
			msg(LINETYPE.SOLID, 'User', 'App', 'Start report'),
			msg(LINETYPE.SOLID, 'App', 'JobRunner', 'Spawn job'),
			msg(LINETYPE.DOTTED, 'JobRunner', 'App', 'Job started'),
		]

		const bp = sequenceToBlueprint(
			layout,
			actors,
			['User', 'App', 'JobRunner'],
			messages,
			createdActors
		)

		const jobRunnerTop = findNode(bp, 'actor-top-JobRunner')!
		expect(jobRunnerTop).toBeDefined()
		const userTop = findNode(bp, 'actor-top-User')!
		expect(jobRunnerTop.y).toBeGreaterThan(userTop.y)

		const creationEdge = bp.edges.find((e) => e.label === 'Spawn job')!
		expect(creationEdge.endNodeId).toBe('actor-top-JobRunner')
	})

	it('gives a destroyed actor a tombstone box on the destroying row', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Client'), actor('TempSession')])
		const messages = [
			{ type: LINETYPE.LOOP_START, message: 'retry' } as unknown as Message,
			msg(LINETYPE.SOLID, 'Client', 'TempSession', 'Start temporary session'),
			{ type: LINETYPE.LOOP_END } as unknown as Message,
			msg(LINETYPE.DOTTED, 'TempSession', 'Client', 'Session active'),
			msg(LINETYPE.SOLID, 'Client', 'TempSession', 'Close session'),
		]
		// mermaid indexes `destroy` by statement, fragments included: statement 4 is the third
		// row, which TempSession receives.
		const destroyedActors = new Map([['TempSession', 4]])

		const bp = sequenceToBlueprint(
			layout,
			actors,
			['Client', 'TempSession'],
			messages,
			new Map(),
			destroyedActors
		)

		const tombstone = findNode(bp, 'actor-bottom-TempSession')!
		expect(tombstone).toBeDefined()
		// Centred on the third of three rows, above the surviving actor's bottom box.
		expect(tombstone.y).toBeLessThan(findNode(bp, 'actor-bottom-Client')!.y)
		expect(bp.groups).toContainEqual([
			'actor-top-TempSession',
			'lifeline-TempSession',
			'actor-bottom-TempSession',
		])

		const lifeline = bp.lines!.find((l) => l.id === 'lifeline-TempSession')!
		expect(lifeline.y + lifeline.endY).toBe(tombstone.y)

		const destroyingEdge = bp.edges.find((e) => e.label === 'Close session')!
		expect(destroyingEdge.endNodeId).toBe('actor-bottom-TempSession')
	})

	it('anchors messages per lifeline so shortened lifelines keep arrows level', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Client'), actor('TempSession')])
		// `destroy TempSession` before the second message, which TempSession sends.
		const destroyedActors = new Map([['TempSession', 1]])
		const messages = [
			msg(LINETYPE.SOLID, 'Client', 'TempSession', 'Open'),
			msg(LINETYPE.SOLID, 'TempSession', 'Client', 'Close'),
		]

		const bp = sequenceToBlueprint(
			layout,
			actors,
			['Client', 'TempSession'],
			messages,
			new Map(),
			destroyedActors
		)

		const client = bp.lines!.find((l) => l.id === 'lifeline-Client')!
		const temp = bp.lines!.find((l) => l.id === 'lifeline-TempSession')!
		const open = bp.edges.find((e) => e.label === 'Open')!
		// The two lifelines end at different heights, so the same row has to resolve to a
		// different fraction on each of them for the arrow to stay horizontal.
		const startY = client.y + client.endY * open.anchorStartY!
		const endY = temp.y + temp.endY * open.anchorEndY!
		expect(endY).toBeCloseTo(startY)

		expect(bp.edges.find((e) => e.label === 'Close')!.startNodeId).toBe('actor-bottom-TempSession')
	})

	it('ignores a destroy whose next statement is a note, as mermaid does', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Bob')])
		// mermaid only applies create/destroy from its signal branch, so a `destroy` recorded
		// against a note is one it renders as though the keyword were not there.
		const destroyedActors = new Map([['Bob', 1]])
		const messages = [
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'hi'),
			noteMsg('Bob', 'cleanup', PLACEMENT.OVER),
			msg(LINETYPE.SOLID, 'Alice', 'Bob', 'bye'),
		]

		const bp = sequenceToBlueprint(
			layout,
			actors,
			['Alice', 'Bob'],
			messages,
			new Map(),
			destroyedActors
		)

		expect(findNode(bp, 'actor-bottom-Bob')!.y).toBe(findNode(bp, 'actor-bottom-Alice')!.y)
		const bye = bp.edges.find((e) => e.label === 'bye')!
		expect(bye.endNodeId).toBe('lifeline-Bob')
		expect(bye.anchorEndY).toBeCloseTo(bye.anchorStartY!)
	})

	it('keeps a lifeline for a participant created and destroyed a row apart', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('Alice'), actor('Tmp')])
		// Ten rows packs them closer together than an actor box is tall, so Tmp's two boxes
		// meet and the lifeline between them has nowhere to go.
		const messages = Array.from({ length: 10 }, (_, i) =>
			msg(LINETYPE.SOLID, 'Alice', 'Tmp', `m${i}`)
		)

		const bp = sequenceToBlueprint(
			layout,
			actors,
			['Alice', 'Tmp'],
			messages,
			new Map([['Tmp', 3]]),
			new Map([['Tmp', 4]])
		)

		// An absent lifeline shape would take every arrow bound to it down with it.
		const lifeline = bp.lines!.find((l) => l.id === 'lifeline-Tmp')!
		expect(lifeline).toBeDefined()
		expect(lifeline.endY).toBeGreaterThan(0)
		// The bottom box is pushed down with it, so it still caps the lifeline.
		expect(lifeline.y + lifeline.endY).toBe(findNode(bp, 'actor-bottom-Tmp')!.y)

		for (const edge of bp.edges) {
			expect(edge.anchorEndY).toBeGreaterThanOrEqual(0)
			expect(edge.anchorEndY).toBeLessThanOrEqual(1)
		}
	})

	it('resolves one lifecycle per message, the way mermaid does', () => {
		const layout = twoActorLayout()
		const actors = new Map([actor('A'), actor('B')])
		// `create participant B` and `destroy A` both land on the same message. Mermaid
		// resolves the three lifecycle cases as one exclusive chain, so the creation wins
		// and A keeps its lifeline to the foot of the diagram.
		const messages = [msg(LINETYPE.SOLID, 'A', 'B', 'bye')]

		const bp = sequenceToBlueprint(
			layout,
			actors,
			['A', 'B'],
			messages,
			new Map([['B', 0]]),
			new Map([['A', 0]])
		)

		const edge = bp.edges[0]
		expect(edge.endNodeId).toBe('actor-top-B')
		expect(edge.startNodeId).toBe('lifeline-A')
		expect(findNode(bp, 'actor-bottom-A')!.y).toBe(twoActorLayout().actorLayouts[0].bottomY)
	})

	describe('rows measured from mermaid', () => {
		/** Where an edge meets the lifelines it is bound to. */
		function edgeYs(bp: DiagramMermaidBlueprint, label: string) {
			const edge = bp.edges.find((e) => e.label === label)!
			const lineY = (id: string, anchor: number) => {
				const line = bp.lines!.find((l) => l.id === id)!
				return line.y + line.endY * anchor
			}
			return [lineY(edge.startNodeId, edge.anchorStartY!), lineY(edge.endNodeId, edge.anchorEndY!)]
		}

		it('gives a tall note the room mermaid gave it', () => {
			const layout = actorLayout([-150, 150], [{ x: 0, y: 0, w: 120, h: 150 }], {
				rowYs: new Map([
					[0, -110],
					[1, 0],
					[2, 110],
				]),
			})
			const actors = new Map([actor('Alice'), actor('Bob')])
			const messages = [
				msg(LINETYPE.SOLID, 'Alice', 'Bob', 'first'),
				noteMsg('Bob', 'a<br/>tall<br/>note', PLACEMENT.RIGHTOF),
				msg(LINETYPE.SOLID, 'Bob', 'Alice', 'second'),
			]

			const bp = sequenceToBlueprint(layout, actors, ['Alice', 'Bob'], messages)

			const note = bp.nodes.find((n) => n.id.startsWith('note-'))!
			expect({ y: note.y, h: note.h }).toEqual({ y: -75, h: 150 })
			// Evenly spaced rows would put both arrows inside the note's 150px.
			edgeYs(bp, 'first').forEach((y) => expect(y).toBeCloseTo(-110))
			edgeYs(bp, 'second').forEach((y) => expect(y).toBeCloseTo(110))
		})

		it("keeps a created and destroyed participant's boxes apart", () => {
			const layout = actorLayout([-150, 150], [], {
				// Mermaid pushes the rows after a lifecycle box down by half the box's height.
				rowYs: new Map([
					[0, -140],
					[1, -130],
					[2, -120],
					[3, -80],
					[4, 20],
					[5, 120],
				]),
			})
			const actors = new Map([actor('Alice'), actor('Tmp')])
			const messages = Array.from({ length: 6 }, (_, i) =>
				msg(LINETYPE.SOLID, 'Alice', 'Tmp', `m${i}`)
			)

			const bp = sequenceToBlueprint(
				layout,
				actors,
				['Alice', 'Tmp'],
				messages,
				new Map([['Tmp', 3]]),
				new Map([['Tmp', 4]])
			)

			// Boxes are 50px tall, centred on their rows.
			expect(findNode(bp, 'actor-top-Tmp')!.y).toBe(-105)
			expect(findNode(bp, 'actor-bottom-Tmp')!.y).toBe(-5)
			const lifeline = bp.lines!.find((l) => l.id === 'lifeline-Tmp')!
			expect({ y: lifeline.y, endY: lifeline.endY }).toEqual({ y: -55, endY: 50 })
		})

		it("draws a fragment's frame and sections where mermaid did", () => {
			const layout = actorLayout([-150, 150], [], {
				rowYs: new Map([
					[0, -120],
					[2, 0],
					[4, 120],
				]),
				// Keyed by the statement that closes the fragment.
				fragmentFrames: new Map([[5, { top: -100, bottom: 140, sectionYs: [60] }]]),
			})
			const actors = new Map([actor('User'), actor('App')])
			const messages = [
				msg(LINETYPE.SOLID, 'User', 'App', 'Sign in'),
				{ type: LINETYPE.ALT_START, message: 'a title long enough to wrap' } as unknown as Message,
				msg(LINETYPE.DOTTED, 'App', 'User', 'Welcome'),
				{ type: LINETYPE.ALT_ELSE, message: 'Invalid' } as unknown as Message,
				msg(LINETYPE.DOTTED, 'App', 'User', 'Error'),
				{ type: LINETYPE.ALT_END } as unknown as Message,
			]

			const bp = sequenceToBlueprint(layout, actors, ['User', 'App'], messages)

			const fragment = findNode(bp, 'fragment-0')!
			expect({ y: fragment.y, h: fragment.h }).toEqual({ y: -100, h: 240 })
			expect(bp.lines!.find((l) => l.id === 'fragment-0-sep-1')!.y).toBe(60)
			expect(findNode(bp, 'fragment-0-section-1')!.y).toBeGreaterThan(60)
		})

		it('spaces every row evenly when mermaid did not draw one of them', () => {
			const partlyMeasured = actorLayout([-150, 150], [], { rowYs: new Map([[0, -140]]) })
			const actors = new Map([actor('Alice'), actor('Bob')])
			const messages = [
				msg(LINETYPE.SOLID, 'Alice', 'Bob', 'one'),
				msg(LINETYPE.SOLID, 'Bob', 'Alice', 'two'),
			]

			const bp = sequenceToBlueprint(partlyMeasured, actors, ['Alice', 'Bob'], messages)
			const even = sequenceToBlueprint(twoActorLayout(), actors, ['Alice', 'Bob'], messages)

			expect(bp.edges).toEqual(even.edges)
		})
	})

	it('maps actor types to correct geo', () => {
		const layout = actorLayout([0])
		const actors = new Map([actor('User', { type: 'actor' })])
		const messages = [msg(LINETYPE.SOLID, 'User', 'User', 'think')]

		const bp = sequenceToBlueprint(layout, actors, ['User'], messages)

		expectNodeGeo(findNode(bp, 'actor-top-User')!, 'ellipse', 'sequence')
	})

	describe('participant boxes', () => {
		function participantBox(opts: Partial<Box> = {}): Box {
			return { name: '', wrap: false, fill: 'transparent', actorKeys: [], ...opts }
		}

		function boxed(key: string, box: Box): [string, Actor] {
			const [, a] = actor(key)
			return [key, { ...a, box }]
		}

		const boxNodes = (bp: DiagramMermaidBlueprint) =>
			bp.nodes.filter((n) => n.kind === 'sequence_box')

		it('draws a box behind the participants it groups, with its label and color', () => {
			// Participants are 100 wide, 200 apart, with a header row at -200 and a footer row at 200.
			const layout = actorLayout([-450, -150, 150, 450])
			const frontend = participantBox({ name: 'Frontend', fill: 'Purple' })
			const backend = participantBox({ name: 'Backend' })
			const actors = new Map([
				boxed('A', frontend),
				boxed('B', frontend),
				boxed('C', backend),
				actor('D'),
			])
			const messages = [msg(LINETYPE.SOLID, 'A', 'D', 'Hi')]

			const bp = sequenceToBlueprint(layout, actors, ['A', 'B', 'C', 'D'], messages)

			const shared = {
				kind: 'sequence_box',
				y: -260,
				h: 530,
				size: 's',
				align: 'middle',
				verticalAlign: 'start',
				background: true,
			}
			expect(boxNodes(bp)).toEqual([
				{
					...shared,
					id: 'box-0',
					x: -490,
					w: 480,
					fill: 'solid',
					color: 'violet',
					label: 'Frontend',
				},
				{ ...shared, id: 'box-1', x: 110, w: 180, fill: 'none', color: 'grey', label: 'Backend' },
			])
			expect(bp.nodes.slice(0, 2)).toEqual(boxNodes(bp))
			expectNodeGeo(boxNodes(bp)[0], 'rectangle', 'sequence')
		})

		it('maps the colors mermaid accepts for a box', () => {
			const colorOf = (fill: string) => {
				const actors = new Map([boxed('A', participantBox({ fill }))])
				const bp = sequenceToBlueprint(actorLayout([0]), actors, ['A'], [])
				const { fill: fillStyle, color } = boxNodes(bp)[0]
				return { fill: fillStyle, color }
			}

			expect(colorOf('Aqua')).toEqual({ fill: 'solid', color: 'light-blue' })
			expect(colorOf('rgb(0, 128, 0)')).toEqual({ fill: 'solid', color: 'green' })
			expect(colorOf('rgba(255, 0, 0, 0.3)')).toEqual({ fill: 'semi', color: 'red' })
			expect(colorOf('transparent')).toEqual({ fill: 'none', color: 'grey' })
		})

		it('reserves room for a label only when some box has one', () => {
			const actors = new Map([boxed('A', participantBox())])
			const bp = sequenceToBlueprint(actorLayout([0]), actors, ['A'], [])

			expect(boxNodes(bp)[0].y).toBe(-220)
		})

		it('keeps neighboring boxes apart when participants are close together', () => {
			const layout = actorLayout([0, 130])
			const actors = new Map([boxed('A', participantBox()), boxed('B', participantBox())])

			const bp = sequenceToBlueprint(layout, actors, ['A', 'B'], [])

			const [left, right] = boxNodes(bp)
			expect(left.x + left.w).toBe(110)
			expect(right.x).toBe(120)
		})

		it('draws one box per box statement mermaid parses', async () => {
			// Participants are grouped by the `Box` object mermaid's parser shares between them, which
			// the tests above build by hand. Parsing real source catches a parser that stops sharing it
			// (one box per participant) as well as grouping by name (same-named boxes merged).
			const mermaid = (await import('mermaid')).default
			// Registers mermaid's diagram types, as a conversion does before parsing.
			mermaid.initialize({ startOnLoad: false })
			const convert = async (source: string) => {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				const db = (await mermaid.mermaidAPI.getDiagramFromText(source)).db as SequenceDB
				const actorKeys = db.getActorKeys()
				const bp = sequenceToBlueprint(
					actorLayout(actorKeys.map((_, i) => i * 300)),
					db.getActors(),
					actorKeys,
					db.getMessages()
				)
				return boxNodes(bp).map((box) => [
					box.label,
					actorKeys.filter((key) => {
						const top = findNode(bp, `actor-top-${key}`)!
						return top.x >= box.x && top.x + top.w <= box.x + box.w
					}),
				])
			}

			// No box colors here: mermaid only splits a color off the label with the browser's CSS
			// parser, and jsdom's rejects mixed-case names, so `box Aqua Frontend` reads as one label.
			expect(
				await convert(`sequenceDiagram
    box Frontend
        participant A
        participant B
    end
    box Backend
        participant C
    end
    participant D
    A->>D: hi`)
			).toEqual([
				['Frontend', ['A', 'B']],
				['Backend', ['C']],
			])

			expect(
				await convert(`sequenceDiagram
    box Team
        participant A
    end
    box Team
        participant B
    end`)
			).toEqual([
				['Team', ['A']],
				['Team', ['B']],
			])
		})
	})
})

// ---------------------------------------------------------------------------
// countSequenceEvents tests
// ---------------------------------------------------------------------------

describe('countSequenceEvents', () => {
	it('counts only signal and note messages', () => {
		const messages = [
			{ type: LINETYPE.SOLID, from: 'A', to: 'B', message: 'Hello' },
			{ type: LINETYPE.DOTTED, from: 'B', to: 'A', message: 'Hi' },
			{ type: LINETYPE.LOOP_START, message: 'loop' },
			{ type: LINETYPE.LOOP_END },
			{ type: LINETYPE.NOTE, from: 'A', to: 'A', message: 'note' },
		] as unknown as Message[]

		expect(countSequenceEvents(messages)).toBe(3)
	})

	it('skips autonumber, fragment, and activation control messages', () => {
		const messages = [
			{ type: LINETYPE.AUTONUMBER },
			{ type: LINETYPE.ALT_START, message: 'alt' },
			{ type: LINETYPE.ALT_ELSE, message: 'else' },
			{ type: LINETYPE.ALT_END },
			{ type: LINETYPE.ACTIVE_START, from: 'A' },
			{ type: LINETYPE.ACTIVE_END, from: 'A' },
			{ type: LINETYPE.SOLID, from: 'A', to: 'B', message: 'real' },
		] as unknown as Message[]

		expect(countSequenceEvents(messages)).toBe(1)
	})
})

// ---------------------------------------------------------------------------
// Mindmap tests
// ---------------------------------------------------------------------------

function mindmapNode(
	id: number,
	descr: string,
	opts: {
		type?: number
		level?: number
		section?: number
		isRoot?: boolean
		children?: MindmapNode[]
	} = {}
): MindmapNode {
	return {
		id,
		descr,
		type: opts.type ?? 0,
		level: opts.level ?? 0,
		section: opts.section ?? 0,
		isRoot: opts.isRoot ?? false,
		children: opts.children ?? [],
	} as MindmapNode
}

function mindmapLayout(nodes: ParsedNode[]): ParsedMindmapLayout {
	return {
		nodes: new Map(nodes.map((n) => [n.id, n])),
	}
}

const emptySvg = document.createElement('div')

function mockSvgWithColors(colors: Map<string, string>): Element {
	const root = document.createElement('div')
	for (const [id, fill] of colors) {
		const group = document.createElement('div')
		group.classList.add('node')
		group.setAttribute('id', `node_${id}`)
		const rect = document.createElement('rect')
		rect.style.fill = fill
		group.appendChild(rect)
		root.appendChild(group)
	}
	return root
}

describe('mindmapToBlueprint', () => {
	it('maps root and child nodes with correct labels and positions', () => {
		const layout = mindmapLayout([
			node('0', 0, 0, 120, 60),
			node('1', -200, 100, 80, 40),
			node('2', 200, 100, 80, 40),
		])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			section: -1,
			children: [
				mindmapNode(1, 'Child A', { level: 1, section: 0 }),
				mindmapNode(2, 'Child B', { level: 1, section: 1 }),
			],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		expect(bp.diagramKind).toBe('mindmap')
		expect(bp.nodes).toHaveLength(3)

		const root = findNodeByLabel(bp, 'Root')!
		expect(root).toBeDefined()
		expect(root.x).toBe(0 - 120 / 2)
		expect(root.y).toBe(0 - 60 / 2)
		expect(root.w).toBe(120)
		expect(root.h).toBe(60)
		expect(root.fill).toBe('solid')
		expect(root.size).toBe('l')
		expect(root.align).toBe('middle')
		expect(root.verticalAlign).toBe('middle')

		const childA = findNodeByLabel(bp, 'Child A')!
		expect(childA).toBeDefined()
		expect(childA.size).toBe('m')
	})

	it('creates edges from parent to children with no arrowheads', () => {
		const layout = mindmapLayout([
			node('0', 0, 0, 100, 50),
			node('1', -150, 100, 80, 40),
			node('2', 150, 100, 80, 40),
		])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [
				mindmapNode(1, 'A', { level: 1, section: 0 }),
				mindmapNode(2, 'B', { level: 1, section: 1 }),
			],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		expect(bp.edges).toHaveLength(2)
		for (const e of bp.edges) {
			expect(e.startNodeId).toBe('0')
			expect(e.arrowheadEnd).toBe('none')
			expect(e.arrowheadStart).toBe('none')
			expect(e.bend).toBe(0)
		}
	})

	it('assigns decreasing edge sizes by tree depth', () => {
		const layout = mindmapLayout([
			node('0', 0, 0, 100, 50),
			node('1', 0, 100, 80, 40),
			node('2', 0, 200, 60, 30),
			node('3', 0, 300, 60, 30),
		])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [
				mindmapNode(1, 'L1', {
					level: 1,
					section: 0,
					children: [
						mindmapNode(2, 'L2', {
							level: 2,
							section: 0,
							children: [mindmapNode(3, 'L3', { level: 3, section: 0 })],
						}),
					],
				}),
			],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		expect(bp.edges).toHaveLength(3)
		expect(findEdge(bp, '0', '1')!.size).toBe('l')
		expect(findEdge(bp, '1', '2')!.size).toBe('m')
		expect(findEdge(bp, '2', '3')!.size).toBe('s')
	})

	it('maps mindmap node types to correct geo shapes', () => {
		const TYPES = MERMAID_MINDMAP_NODE_TYPE
		const layout = mindmapLayout([
			node('0', 0, 0, 100, 50),
			node('1', -300, 100, 80, 40),
			node('2', -150, 100, 80, 40),
			node('3', 0, 100, 60, 60),
			node('4', 150, 100, 80, 40),
			node('5', 300, 100, 80, 40),
			node('6', 450, 100, 80, 40),
		])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [
				mindmapNode(1, 'Default', { type: TYPES.DEFAULT, level: 1, section: 0 }),
				mindmapNode(2, 'Rect', { type: TYPES.RECT, level: 1, section: 1 }),
				mindmapNode(3, 'Circle', { type: TYPES.CIRCLE, level: 1, section: 2 }),
				mindmapNode(4, 'Cloud', { type: TYPES.CLOUD, level: 1, section: 3 }),
				mindmapNode(5, 'Bang', { type: TYPES.BANG, level: 1, section: 4 }),
				mindmapNode(6, 'Hexagon', { type: TYPES.HEXAGON, level: 1, section: 5 }),
			],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		expectNodeGeo(findNodeByLabel(bp, 'Default')!, 'rectangle', 'mindmap')
		expectNodeGeo(findNodeByLabel(bp, 'Rect')!, 'rectangle', 'mindmap')
		expectNodeGeo(findNodeByLabel(bp, 'Circle')!, 'ellipse', 'mindmap')
		expectNodeGeo(findNodeByLabel(bp, 'Cloud')!, 'cloud', 'mindmap')
		expectNodeGeo(findNodeByLabel(bp, 'Bang')!, 'star', 'mindmap')
		expectNodeGeo(findNodeByLabel(bp, 'Hexagon')!, 'hexagon', 'mindmap')
	})

	it('uses circle type to equalize width and height', () => {
		const layout = mindmapLayout([node('0', 0, 0, 100, 50), node('1', 200, 0, 60, 80)])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [
				mindmapNode(1, 'Round', { type: MERMAID_MINDMAP_NODE_TYPE.CIRCLE, level: 1, section: 0 }),
			],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		const round = findNodeByLabel(bp, 'Round')!
		expect(round.w).toBe(round.h)
		expect(round.w).toBe(80)
	})

	it('uses SVG-extracted colors, falls back to black', () => {
		const layout = mindmapLayout([
			node('0', 0, 0, 100, 50),
			node('1', -150, 100, 80, 40),
			node('2', 150, 100, 80, 40),
		])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			section: -1,
			children: [
				mindmapNode(1, 'With Color', { level: 1, section: 0 }),
				mindmapNode(2, 'No Color', { level: 1, section: 1 }),
			],
		})
		const svg = mockSvgWithColors(new Map([['1', 'rgb(224, 49, 49)']]))

		const bp = mindmapToBlueprint(layout, tree, svg)

		expect(findNodeByLabel(bp, 'With Color')!.color).toBe('red')
		expect(findNodeByLabel(bp, 'No Color')!.color).toBe('black')
	})

	it('colors edges to match their target node', () => {
		const layout = mindmapLayout([node('0', 0, 0, 100, 50), node('1', 150, 100, 80, 40)])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [mindmapNode(1, 'Child', { level: 1, section: 0 })],
		})
		const svg = mockSvgWithColors(new Map([['1', 'rgb(9, 146, 104)']]))

		const bp = mindmapToBlueprint(layout, tree, svg)

		expect(bp.edges).toHaveLength(1)
		expect(bp.edges[0].color).toBe('green')
	})

	it('all nodes have solid fill', () => {
		const layout = mindmapLayout([node('0', 0, 0, 100, 50), node('1', 150, 100, 80, 40)])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [mindmapNode(1, 'Child', { level: 1, section: 0 })],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		for (const n of bp.nodes) {
			expect(n.fill).toBe('solid')
		}
	})

	it('filters out edges referencing nodes missing from SVG layout', () => {
		// SVG only has root — child node missing from parsed layout
		const layout = mindmapLayout([node('0', 0, 0, 100, 50)])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [mindmapNode(1, 'Missing', { level: 1, section: 0 })],
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		expect(bp.nodes).toHaveLength(1)
		expect(bp.edges).toHaveLength(0)
	})

	it('defaults to black when no SVG color is extracted', () => {
		const layout = mindmapLayout([node('0', 0, 0, 100, 50)])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
		})

		const bp = mindmapToBlueprint(layout, tree, emptySvg)

		expect(findNodeByLabel(bp, 'Root')!.color).toBe('black')
	})
})

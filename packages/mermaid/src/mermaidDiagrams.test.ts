import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { MindmapNode } from 'mermaid/dist/diagrams/mindmap/mindmapTypes.js'
import type { Actor, Message } from 'mermaid/dist/diagrams/sequence/types.js'
import type { StateStmt } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import type { DiagramMermaidBlueprint, MermaidBlueprintNode, MermaidDiagramKind } from './blueprint'
import {
	defaultMermaidNodeRenderSpec,
	resolveMermaidNodeRender,
} from './defaultMermaidNodeRenderSpec'
import { flowchartToBlueprint } from './flowchartDiagram'
import { mindmapToBlueprint, type ParsedMindmapLayout } from './mindmapDiagram'
import {
	countSequenceEvents,
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
	return { start, end, points: points.map(([x, y]) => ({ x, y })) }
}

function diagramLayout(
	nodes: ParsedNode[],
	clusters: ParsedCluster[] = [],
	edges: ParsedEdge[] = []
): ParsedDiagramLayout {
	return {
		nodes: new Map(nodes.map((n) => [n.id, n])),
		clusters: new Map(clusters.map((c) => [c.id, c])),
		edges,
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
		const layout = diagramLayout(
			[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
			[],
			[
				edge('A', 'B', [
					[20, 0],
					[180, 0],
				]),
			]
		)
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B', { style: ['stroke-dasharray: 4 3'] })]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].dash).toBe('dashed')
	})

	it('maps dotted stroke to dotted dash', () => {
		const layout = diagramLayout(
			[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
			[],
			[
				edge('A', 'B', [
					[20, 0],
					[180, 0],
				]),
			]
		)
		const vertices = new Map([vertex('A'), vertex('B')])
		const edges = [flowEdge('A', 'B', { stroke: 'dotted' })]

		const bp = flowchartToBlueprint(layout, vertices, edges)
		expect(bp.edges[0].dash).toBe('dotted')
	})

	it('maps double_arrow edge type to bidirectional arrowheads', () => {
		const layout = diagramLayout(
			[node('A', 0, 0, 40, 40), node('B', 200, 0, 40, 40)],
			[],
			[
				edge('A', 'B', [
					[20, 0],
					[180, 0],
				]),
			]
		)
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
	const LINETYPE = {
		SOLID: 0,
		DOTTED: 1,
		NOTE: 2,
		SOLID_CROSS: 3,
		DOTTED_CROSS: 4,
		SOLID_OPEN: 5,
		DOTTED_OPEN: 6,
		LOOP_START: 10,
		LOOP_END: 11,
		ALT_START: 12,
		ALT_ELSE: 13,
		ALT_END: 14,
		OPT_START: 15,
		OPT_END: 16,
		ACTIVE_START: 17,
		ACTIVE_END: 18,
		PAR_START: 19,
		PAR_AND: 20,
		PAR_END: 21,
		AUTONUMBER: 26,
		CRITICAL_START: 27,
		CRITICAL_OPTION: 28,
		CRITICAL_END: 29,
		BREAK_START: 30,
		BREAK_END: 31,
		BIDIRECTIONAL_SOLID: 33,
		BIDIRECTIONAL_DOTTED: 34,
	} as const

	const PLACEMENT = {
		LEFTOF: 0,
		RIGHTOF: 1,
		OVER: 2,
	} as const

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

	function noteMsg(from: string, message: string, placement: number, to?: string): Message {
		return { type: LINETYPE.NOTE, from, to: to ?? from, message, placement } as unknown as Message
	}

	function twoActorLayout(): ParsedSequenceLayout {
		return {
			actorLayouts: [
				{ x: -150, y: -200, w: 100, h: 50, bottomY: 200 },
				{ x: 150, y: -200, w: 100, h: 50, bottomY: 200 },
			],
			noteRects: [],
		}
	}

	function threeActorLayout(
		noteRects: { x: number; y: number; w: number; h: number }[] = []
	): ParsedSequenceLayout {
		return {
			actorLayouts: [
				{ x: -300, y: -200, w: 100, h: 50, bottomY: 200 },
				{ x: 0, y: -200, w: 100, h: 50, bottomY: 200 },
				{ x: 300, y: -200, w: 100, h: 50, bottomY: 200 },
			],
			noteRects,
		}
	}

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

	it('creates note nodes with yellow color and correct labels', () => {
		const noteRect = { x: 10, y: 50, w: 120, h: 40 }
		const layout: ParsedSequenceLayout = {
			actorLayouts: [
				{ x: -150, y: -200, w: 100, h: 50, bottomY: 200 },
				{ x: 150, y: -200, w: 100, h: 50, bottomY: 200 },
			],
			noteRects: [noteRect],
		}
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

	it('maps actor types to correct geo', () => {
		const layout: ParsedSequenceLayout = {
			actorLayouts: [{ x: 0, y: -200, w: 100, h: 50, bottomY: 200 }],
			noteRects: [],
		}
		const actors = new Map([actor('User', { type: 'actor' })])
		const messages = [msg(LINETYPE.SOLID, 'User', 'User', 'think')]

		const bp = sequenceToBlueprint(layout, actors, ['User'], messages)

		expectNodeGeo(findNode(bp, 'actor-top-User')!, 'ellipse', 'sequence')
	})
})

// ---------------------------------------------------------------------------
// countSequenceEvents tests
// ---------------------------------------------------------------------------

describe('countSequenceEvents', () => {
	it('counts only signal and note messages', () => {
		const messages = [
			{ type: 0, from: 'A', to: 'B', message: 'Hello' },
			{ type: 1, from: 'B', to: 'A', message: 'Hi' },
			{ type: 10, message: 'loop' },
			{ type: 11 },
			{ type: 2, from: 'A', to: 'A', message: 'note' },
		] as unknown as Message[]

		expect(countSequenceEvents(messages)).toBe(3)
	})

	it('skips autonumber, fragment, and activation control messages', () => {
		const messages = [
			{ type: 26 },
			{ type: 12, message: 'alt' },
			{ type: 13, message: 'else' },
			{ type: 14 },
			{ type: 17, from: 'A' },
			{ type: 18, from: 'A' },
			{ type: 0, from: 'A', to: 'B', message: 'real' },
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
		const TYPES = { DEFAULT: 0, ROUNDED_RECT: 1, RECT: 2, CIRCLE: 3, CLOUD: 4, BANG: 5, HEXAGON: 6 }
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
		const CIRCLE = 3
		const layout = mindmapLayout([node('0', 0, 0, 100, 50), node('1', 200, 0, 60, 80)])
		const tree = mindmapNode(0, 'Root', {
			isRoot: true,
			level: 0,
			children: [mindmapNode(1, 'Round', { type: CIRCLE, level: 1, section: 0 })],
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

import type { FlowchartModel, MindmapModel, StateModel } from 'pele'
import { flowchartToBlueprint, parseFlowchartLayout } from './flowchartDiagram'
import { parseMindmapLayout } from './mindmapDiagram'
import { parsePathPoints, parsePeleDiagram, parsePeleLayout } from './peleDiagram'
import { parseStateDiagramLayout, stateToBlueprint } from './stateDiagram'
import { LAYOUT_SCALE } from './utils'

async function render(text: string) {
	const { pele, model, type } = (await parsePeleDiagram(text))!
	const container = document.createElement('div')
	container.innerHTML = pele.render(model).svg
	return { root: container.querySelector('svg')!, model, type }
}

describe('parsePeleDiagram', () => {
	it('detects, loads and parses each diagram type on demand', async () => {
		expect((await parsePeleDiagram('graph TD\n  A --> B'))?.type).toBe('flowchart')
		expect((await parsePeleDiagram('stateDiagram-v2\n  [*] --> A'))?.type).toBe('state')
		expect((await parsePeleDiagram('sequenceDiagram\n  A->>B: hi'))?.type).toBe('sequence')
		expect((await parsePeleDiagram('mindmap\n  root'))?.type).toBe('mindmap')
		expect(await parsePeleDiagram('not a diagram at all')).toBeNull()
	})
})

describe('parsePeleLayout', () => {
	it('reads nodes, clusters, edges and edge labels from any diagram type', async () => {
		const { root, model } = await render(`flowchart LR
  A[Start] -->|go| B{Choice}
  subgraph S1 [Group]
    C((End))
  end
  B --> C`)

		const layout = parseFlowchartLayout(root, model as FlowchartModel)

		expect([...layout.nodes.keys()]).toEqual(['A', 'B', 'C'])
		expect([...layout.clusters.keys()]).toEqual(['S1'])
		expect(layout.edges.map(({ id, start, end }) => ({ id, start, end }))).toEqual([
			{ id: 'L_A_B_0', start: 'A', end: 'B' },
			{ id: 'L_B_C_0', start: 'B', end: 'C' },
		])
		expect([...layout.edgeLabels.keys()]).toEqual(['L_A_B_0'])

		const circle = layout.nodes.get('C')!
		expect(circle.width).toBe(circle.height)
		// Every node sits inside its cluster, in the same scaled space.
		const group = layout.clusters.get('S1')!
		expect(circle.center.x).toBeGreaterThan(group.topLeft.x)
		expect(circle.center.x).toBeLessThan(group.topLeft.x + group.width)
	})

	it('keeps the lines the layout wrapped a label into', async () => {
		const text = `flowchart TD
  A[System validates whether the currently selected shipping address is complete] -->|a fairly long edge label that should wrap somewhere| B[Done]`
		const { root, model } = await render(text)

		const flowchart = model as FlowchartModel
		const layout = parseFlowchartLayout(root, flowchart)
		const bp = flowchartToBlueprint(layout, flowchart.nodes, flowchart.edges)

		const label = bp.nodes.find((node) => node.id === 'A')!.label!
		expect(label.split('\n').length).toBeGreaterThan(1)
		expect(label.replace(/\n/g, ' ')).toBe(
			'System validates whether the currently selected shipping address is complete'
		)
		expect(bp.edges[0].label!.split('\n').length).toBeGreaterThan(1)
		expect(bp.edges[0].labelPosition).toBeGreaterThan(0)
		expect(bp.edges[0].labelPosition).toBeLessThan(1)
	})

	it('scales positions by LAYOUT_SCALE', () => {
		const container = document.createElement('div')
		container.innerHTML = `<svg><g transform="translate(10,20)">
			<g class="pele-node" data-id="A" transform="translate(30,40)"><rect x="-5" y="-4" width="10" height="8"/></g>
		</g></svg>`

		const node = parsePeleLayout(container.firstElementChild!).nodes.get('A')!

		expect(node).toEqual({
			id: 'A',
			center: { x: 40 * LAYOUT_SCALE, y: 60 * LAYOUT_SCALE },
			width: 10 * LAYOUT_SCALE,
			height: 8 * LAYOUT_SCALE,
		})
	})

	it("names a state's note after the state it belongs to", async () => {
		const { root } = await render(`stateDiagram-v2
  [*] --> Idle
  note right of Idle: waiting`)

		const layout = parseStateDiagramLayout(root)

		expect([...layout.nodes.keys()].sort()).toEqual(['Idle', 'Idle----note', 'root_start'])
	})

	it("keys mindmap nodes by the model's numeric id", async () => {
		const { root, model } = await render(`mindmap
  root((Root))
    A
    B`)

		const layout = parseMindmapLayout(root, model as MindmapModel)

		expect([...layout.nodes.keys()].sort()).toEqual(['0', '1', '2'])
	})

	it('places every mindmap node, including ones that repeat a name', async () => {
		const { root, model } = await render(`mindmap
  Meals
    Monday
      Breakfast
    Tuesday
      Breakfast`)

		const layout = parseMindmapLayout(root, model as MindmapModel)

		expect([...layout.nodes.keys()].sort()).toEqual(['0', '1', '2', '3', '4'])
		const [first, second] = (model as MindmapModel).nodes.filter((n) => n.descr === 'Breakfast')
		expect(layout.nodes.get(String(first.id))!.center).not.toEqual(
			layout.nodes.get(String(second.id))!.center
		)
	})

	it('reads state diagram composites as clusters', async () => {
		const { root, model } = await render(`stateDiagram-v2
  state Busy {
    [*] --> a
  }`)

		expect((model as StateModel).states.get('Busy')?.doc?.length).toBeGreaterThan(0)
		expect([...parseStateDiagramLayout(root).clusters.keys()]).toEqual(['Busy'])
	})
})

// The conversion reads positions back out of pele's SVG, which relies on details pele doesn't
// document. Each test pins one of them, so a pele upgrade that changes it fails here rather than
// drawing diagrams subtly wrong.
describe("what the conversion relies on in pele's output", () => {
	async function renderWithMeasurer(text: string) {
		const { pele } = (await parsePeleDiagram(text))!
		const sizes = new Map<string, number>()
		pele.render(text, {
			fontSize: 16,
			measurer: {
				width(label: string, size: number) {
					sizes.set(label, size)
					return label.length * size * 0.5
				},
			},
		})
		return sizes
	}

	it('draws mindmap nodes in model order with the root last', async () => {
		const { root, model } = await render(`mindmap
  Meals
    Monday
      Breakfast
    Tuesday
      Breakfast`)
		const mindmap = model as MindmapModel

		expect(
			[...root.querySelectorAll('.pele-node')].map((el) => el.getAttribute('data-id'))
		).toEqual([
			...mindmap.nodes.filter((n) => !n.isRoot).map((n) => n.nodeId),
			...mindmap.nodes.filter((n) => n.isRoot).map((n) => n.nodeId),
		])

		// So each repeated name lands under its own parent.
		const layout = parseMindmapLayout(root, mindmap)
		const center = (descr: string, nth = 0) =>
			layout.nodes.get(String(mindmap.nodes.filter((n) => n.descr === descr)[nth].id))!.center
		const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
			Math.hypot(a.x - b.x, a.y - b.y)
		expect(distance(center('Breakfast', 0), center('Monday'))).toBeLessThan(
			distance(center('Breakfast', 0), center('Tuesday'))
		)
		expect(distance(center('Breakfast', 1), center('Tuesday'))).toBeLessThan(
			distance(center('Breakfast', 1), center('Monday'))
		)
	})

	it("ids a state's notes as <state>----note-<n>", async () => {
		const { root } = await render(`stateDiagram-v2
  [*] --> Idle
  note right of Idle: waiting`)

		const ids = [...root.querySelectorAll('.pele-note')].map((el) => el.getAttribute('data-id'))
		expect(ids).toHaveLength(1)
		expect(ids[0]).toMatch(/^Idle----note-\d+$/)
	})

	it('keeps one note per state, drawn where pele drew that note', async () => {
		// pele draws both notes but its model keeps one, so the conversion shows one. Both SVG notes
		// map to the same id; the kept one must win, or its text sits at the other note's position.
		const { root, model } = await render(`stateDiagram-v2
  [*] --> Idle
  note right of Idle: first
  note left of Idle: second`)

		const kept = (model as StateModel).states.get('Idle')!.note!.text.trim()
		const rawNotes = parsePeleLayout(root).nodes
		const keptRawId = [...root.querySelectorAll('.pele-note')]
			.find((el) => el.textContent?.trim() === kept)!
			.getAttribute('data-id')!

		expect(parseStateDiagramLayout(root).nodes.get('Idle----note')!.center).toEqual(
			rawNotes.get(keptRawId)!.center
		)
	})

	it('labels each state transition with its own text, matched by position', async () => {
		// Transition paths carry no state ids, so they are matched to relations by proximity.
		const { root, model } = await render(`stateDiagram-v2
  [*] --> Idle
  Idle --> Busy: start
  Busy --> Idle: finish
  Busy --> Done: ship
  Idle --> Done: skip`)
		const state = model as StateModel

		const bp = stateToBlueprint(parseStateDiagramLayout(root), state.states, state.relations)

		const labels = Object.fromEntries(
			bp.edges.filter((e) => e.label).map((e) => [`${e.startNodeId}->${e.endNodeId}`, e.label])
		)
		expect(labels).toEqual({
			'Idle->Busy': 'start',
			'Busy->Idle': 'finish',
			'Busy->Done': 'ship',
			'Idle->Done': 'skip',
		})
	})

	it('measures edge labels, and only edge labels and state notes, below the node font size', async () => {
		// createLayoutTextMeasurer adds the arrow label margin to any text measured below the node
		// size. State notes are caught too, so they get the margin in left-right layouts.
		const flowchart = await renderWithMeasurer(`flowchart TD
  subgraph G [Cluster title]
    A[Node] -->|edge label| B{Choice}
  end`)
		expect([...flowchart].filter(([, size]) => size < 16).map(([label]) => label)).toEqual([
			'edge label',
		])

		const state = await renderWithMeasurer(`stateDiagram-v2
  [*] --> Idle
  Idle --> Busy: go
  note right of Idle: waiting
  state Comp {
    [*] --> x
  }`)
		expect(
			[...state]
				.filter(([, size]) => size < 16)
				.map(([label]) => label)
				.sort()
		).toEqual(['go', 'waiting'])
	})
})

describe('parsePathPoints', () => {
	it('reads route points from absolute and relative path commands', () => {
		expect(parsePathPoints('M0,0L10,0C15,0 15,5 15,10V20H30')).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 15, y: 0 },
			{ x: 15, y: 5 },
			{ x: 15, y: 10 },
			{ x: 15, y: 20 },
			{ x: 30, y: 20 },
		])
		expect(parsePathPoints('M-10,-5A10,5 0 0 1 10,-5')).toEqual([
			{ x: -10, y: -5 },
			{ x: 10, y: -5 },
		])
	})
})

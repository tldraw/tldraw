import type { FlowchartModel, MindmapModel, StateModel } from 'pele'
import { parseFlowchartLayout } from './flowchartDiagram'
import { parseMindmapLayout } from './mindmapDiagram'
import { parsePathPoints, parsePeleDiagram, parsePeleLayout } from './peleDiagram'
import { parseStateDiagramLayout } from './stateDiagram'
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

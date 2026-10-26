import type { SequenceModel } from 'pele'
import { parsePeleDiagram } from './peleDiagram'
import { LINETYPE, parseSequenceLayout, sequenceToBlueprint } from './sequenceDiagram'

const measureLabelWidth = () => 0

async function renderLayout(text: string) {
	const parsed = await parsePeleDiagram(text)
	if (!parsed) throw new Error('not a diagram')
	const model = parsed.model as SequenceModel
	const container = document.createElement('div')
	container.innerHTML = parsed.pele.render(model, { fontSize: 16 }).svg
	return { model, layout: parseSequenceLayout(container.querySelector('svg')!, model) }
}

async function toBlueprint(text: string) {
	const { model, layout } = await renderLayout(text)
	const blueprint = sequenceToBlueprint(
		layout,
		model.actors,
		[...model.actors.keys()],
		model.messages,
		model.createdActors,
		model.destroyedActors,
		measureLabelWidth
	)
	return { ...blueprint, lines: blueprint.lines ?? [] }
}

describe('pele sequence renderer', () => {
	it('maps each message line type to an arrow', async () => {
		const { edges } = await toBlueprint(`sequenceDiagram
  A->>B: solid
  B-->>A: dotted
  A-xB: cross
  B--xA: dotted cross
  A-)B: async
  A->B: open
  A<<->>B: both ways`)

		expect(
			edges.map(({ startNodeId, endNodeId, label, dash, arrowheadStart, arrowheadEnd }) => ({
				startNodeId,
				endNodeId,
				label,
				dash,
				arrowheadStart,
				arrowheadEnd,
			}))
		).toEqual([
			{
				startNodeId: 'lifeline-A',
				endNodeId: 'lifeline-B',
				label: 'solid',
				dash: 'solid',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
			},
			{
				startNodeId: 'lifeline-B',
				endNodeId: 'lifeline-A',
				label: 'dotted',
				dash: 'dotted',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
			},
			{
				startNodeId: 'lifeline-A',
				endNodeId: 'lifeline-B',
				label: 'cross',
				dash: 'solid',
				arrowheadStart: 'none',
				arrowheadEnd: 'bar',
			},
			{
				startNodeId: 'lifeline-B',
				endNodeId: 'lifeline-A',
				label: 'dotted cross',
				dash: 'dotted',
				arrowheadStart: 'none',
				arrowheadEnd: 'bar',
			},
			{
				startNodeId: 'lifeline-A',
				endNodeId: 'lifeline-B',
				label: 'async',
				dash: 'solid',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
			},
			{
				startNodeId: 'lifeline-A',
				endNodeId: 'lifeline-B',
				label: 'open',
				dash: 'solid',
				arrowheadStart: 'none',
				arrowheadEnd: 'none',
			},
			{
				startNodeId: 'lifeline-A',
				endNodeId: 'lifeline-B',
				label: 'both ways',
				dash: 'solid',
				arrowheadStart: 'arrow',
				arrowheadEnd: 'arrow',
			},
		])
		const anchors = edges.map((edge) => edge.anchorStartY!)
		expect(anchors.every((y, i) => i === 0 || y > anchors[i - 1])).toBe(true)
	})

	it('gives actors and participants the same box, labelled by their alias', async () => {
		const { nodes, lines, groups } = await toBlueprint(`sequenceDiagram
  participant A as Alice
  actor B as Bob
  A->>B: hi`)

		const actorBoxes = nodes.filter((node) => node.id.startsWith('actor-'))
		expect(actorBoxes.map(({ id, kind, label }) => ({ id, kind, label }))).toEqual([
			{ id: 'actor-top-A', kind: 'participant', label: 'Alice' },
			{ id: 'actor-bottom-A', kind: 'participant', label: 'Alice' },
			{ id: 'actor-top-B', kind: 'actor', label: 'Bob' },
			{ id: 'actor-bottom-B', kind: 'actor', label: 'Bob' },
		])
		const [aliceTop, , bobTop] = actorBoxes
		expect({ y: bobTop.y, w: bobTop.w, h: bobTop.h }).toEqual({
			y: aliceTop.y,
			w: aliceTop.w,
			h: aliceTop.h,
		})
		expect(lines.map(({ id, y }) => ({ id, y }))).toEqual([
			{ id: 'lifeline-A', y: aliceTop.y + aliceTop.h },
			{ id: 'lifeline-B', y: aliceTop.y + aliceTop.h },
		])
		expect(groups).toEqual([
			['actor-top-A', 'lifeline-A', 'actor-bottom-A'],
			['actor-top-B', 'lifeline-B', 'actor-bottom-B'],
		])
	})

	it('loops a self message back onto its own lifeline', async () => {
		const { edges } = await toBlueprint(`sequenceDiagram
  A->>B: go
  B->>B: think
  B-->>A: done`)

		const [go, think, done] = edges
		expect({
			startNodeId: think.startNodeId,
			endNodeId: think.endNodeId,
			bend: think.bend,
		}).toEqual({ startNodeId: 'lifeline-B', endNodeId: 'lifeline-B', bend: -80 })
		expect(think.anchorEndY).toBeGreaterThan(think.anchorStartY!)
		expect(think.anchorStartY).toBeGreaterThan(go.anchorStartY!)
		expect(done.anchorStartY).toBeGreaterThan(think.anchorEndY!)
	})

	it('places notes beside, over, and across lifelines', async () => {
		const { nodes, lines } = await toBlueprint(`sequenceDiagram
  A->>B: hi
  Note over A,B: across
  Note right of B: beside
  Note over A: over`)

		const notes = nodes.filter((node) => node.kind === 'sequence_note')
		expect(notes.map(({ id, label, color }) => ({ id, label, color }))).toEqual([
			{ id: 'note-1', label: 'across', color: 'yellow' },
			{ id: 'note-2', label: 'beside', color: 'yellow' },
			{ id: 'note-3', label: 'over', color: 'yellow' },
		])
		const [a, b] = lines.map((line) => line.x)
		const [across, beside, over] = notes
		expect(across.x).toBeLessThan(a)
		expect(across.x + across.w).toBeGreaterThan(b)
		expect(beside.x).toBeGreaterThan(b)
		expect(over.x + over.w / 2).toBeCloseTo(a)
		expect(across.y).toBeLessThan(beside.y)
		expect(beside.y).toBeLessThan(over.y)
	})

	it('frames loops and alts, with a separator per else', async () => {
		const { nodes, lines } = await toBlueprint(`sequenceDiagram
  A->>B: first
  loop Every minute
    A->>B: tick
    alt ok
      B->>A: yes
    else nope
      B->>A: no
    end
  end`)

		const fragments = nodes.filter((node) => node.kind.startsWith('sequence_fragment'))
		expect(fragments.map(({ id, kind, label }) => ({ id, kind, label }))).toEqual([
			{ id: 'fragment-0', kind: 'sequence_fragment', label: 'alt [ok]' },
			{ id: 'fragment-0-section-1', kind: 'sequence_fragment_section', label: '[nope]' },
			{ id: 'fragment-1', kind: 'sequence_fragment', label: 'loop [Every minute]' },
		])
		const [alt, , loop] = fragments
		expect(loop.y).toBeLessThan(alt.y)
		expect(loop.y + loop.h).toBeGreaterThan(alt.y + alt.h)
		const separator = lines.find((line) => line.id === 'fragment-0-sep-1')!
		expect(separator.y).toBeGreaterThan(alt.y)
		expect(separator.y).toBeLessThan(alt.y + alt.h)
	})

	it('reads a row for every message and note, and a frame for every fragment', async () => {
		const { model, layout } = await renderLayout(`sequenceDiagram
  A->>B: Hello
  loop Every minute
    B->>B: Tick
    alt Healthy
      B-->>A: Fine
    else Failing
      Note over A,B: Retry
      A->>B: Again
    end
  end
  rect rgb(200, 150, 255)
    B-->>A: Done
  end`)

		const rowTypes: number[] = [LINETYPE.SOLID, LINETYPE.DOTTED, LINETYPE.NOTE]
		const eventIndices = model.messages.flatMap((m, i) => (rowTypes.includes(m.type!) ? [i] : []))
		expect([...layout.rowYs.keys()].sort((a, b) => a - b)).toEqual(eventIndices)
		const ys = eventIndices.map((i) => layout.rowYs.get(i)!)
		expect(ys.every((y, i) => i === 0 || y > ys[i - 1])).toBe(true)
		expect(layout.noteRects).toHaveLength(1)

		const endOf = (type: number) => model.messages.findIndex((m) => m.type === type)
		const loop = layout.fragmentFrames.get(endOf(LINETYPE.LOOP_END))!
		const alt = layout.fragmentFrames.get(endOf(LINETYPE.ALT_END))!
		const rect = layout.fragmentFrames.get(endOf(LINETYPE.RECT_END))!
		expect(layout.fragmentFrames.size).toBe(3)
		expect(loop.sectionYs).toEqual([])
		expect(alt.sectionYs).toHaveLength(1)
		expect(alt.top).toBeGreaterThan(loop.top)
		expect(alt.bottom).toBeLessThan(loop.bottom)
		expect(rect.top).toBeGreaterThan(loop.bottom)
	})

	it('opens and closes created and destroyed participants on their rows', async () => {
		const { nodes, lines, edges } = await toBlueprint(`sequenceDiagram
  autonumber
  A->>B: hi
  create participant C
  B->>C: make
  destroy C
  A-xC: kill
  A->>B: bye`)

		const lifelines = new Map(lines.map((line) => [line.id, line]))
		const a = lifelines.get('lifeline-A')!
		const c = lifelines.get('lifeline-C')!
		expect(c.y).toBeGreaterThan(a.y)
		expect(c.y + c.endY!).toBeLessThan(a.y + a.endY!)
		expect(nodes.find((node) => node.id === 'actor-bottom-C')!.y).toBeLessThan(
			nodes.find((node) => node.id === 'actor-bottom-A')!.y
		)
		expect(
			edges.map(({ endNodeId, decoration }) => ({ endNodeId, number: decoration?.value }))
		).toEqual([
			{ endNodeId: 'lifeline-B', number: '1' },
			{ endNodeId: 'actor-top-C', number: '2' },
			{ endNodeId: 'actor-bottom-C', number: '3' },
			{ endNodeId: 'lifeline-B', number: '4' },
		])
	})

	it('rejects text pele cannot parse', async () => {
		await expect(toBlueprint('sequenceDiagram\n  A->>')).rejects.toThrow()
	})
})

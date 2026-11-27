import type { SequenceModel } from 'pele'
import { defaultMermaidNodeRenderSpec } from './defaultMermaidNodeRenderSpec'
import type { MeasureLabelSize } from './mermaidNodeCreateShape'
import { parsePeleDiagram } from './peleDiagram'
import {
	getSelfMessageLoop,
	LINETYPE,
	parseSequenceLayout,
	sequenceToBlueprint,
} from './sequenceDiagram'

const measureLabelWidth = () => 0

async function renderLayout(text: string, measureLabel?: MeasureLabelSize) {
	const parsed = await parsePeleDiagram(text)
	if (!parsed) throw new Error('not a diagram')
	const model = parsed.model as SequenceModel
	const container = document.createElement('div')
	container.innerHTML = parsed.pele.render(model, { fontSize: 16 }).svg
	return {
		model,
		layout: parseSequenceLayout(container.querySelector('svg')!, model, measureLabel),
	}
}

async function toBlueprint(text: string, measureLabel?: MeasureLabelSize) {
	const { model, layout } = await renderLayout(text, measureLabel)
	const blueprint = sequenceToBlueprint(
		layout,
		model.actors,
		[...model.actors.keys()],
		model.messages,
		model.createdActors,
		model.destroyedActors,
		measureLabel ? (label, size) => measureLabel(label, size).w : measureLabelWidth
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
		}).toEqual({
			startNodeId: 'lifeline-B',
			endNodeId: 'lifeline-B',
			bend: -getSelfMessageLoop(0).bend,
		})
		expect(think.anchorEndY).toBeGreaterThan(think.anchorStartY!)
		expect(think.anchorStartY).toBeGreaterThan(go.anchorStartY!)
		expect(done.anchorStartY).toBeGreaterThan(think.anchorEndY!)
	})

	it("bends a self message's loop past half its label, and makes room for the loop", async () => {
		// tldraw centres the label on the loop's far point, so a shallower loop puts the label on
		// the lifeline; and a loop that deep is far taller than the layout's.
		const text = `sequenceDiagram
  A->>B: go
  B->>B: recompute the whole thing
  B-->>A: done`
		const measureLabel: MeasureLabelSize = (label) => ({ w: label.length * 10, h: 30 })
		const { model, layout } = await renderLayout(text, measureLabel)
		const loop = getSelfMessageLoop(measureLabel('recompute the whole thing', 's').w)
		const unadjusted = (await renderLayout(text)).layout

		const { edges } = await toBlueprint(text, measureLabel)

		expect(edges[1].bend).toBe(-loop.bend)
		expect(loop.bend).toBeGreaterThan(measureLabel('recompute the whole thing', 's').w / 2)
		expect(model.messages[1].from).toBe(model.messages[1].to)
		// Unmeasured, the loop is sized for an empty label; the rows either side of it move apart by
		// exactly how much taller the measured loop is.
		const gap = (l: typeof layout) => l.rowYs.get(2)! - l.rowYs.get(0)!
		expect(gap(layout) - gap(unadjusted)).toBeCloseTo(loop.height - getSelfMessageLoop(0).height)
	})

	it('makes room for a note taller than the layout drew it', async () => {
		// Grown in place, a tall note reached into the footer below it.
		const text = `sequenceDiagram
  A->>B: go
  Note over B: a note with a lot to say`
		const measureLabel: MeasureLabelSize = () => ({ w: 100, h: 200 })
		const { layout } = await renderLayout(text, measureLabel)
		const unadjusted = (await renderLayout(text)).layout

		const { nodes } = await toBlueprint(text, measureLabel)

		const note = nodes.find((node) => node.kind === 'sequence_note')!
		expect(note.h).toBe(200)
		const footerGap = (l: typeof layout, noteBottom: number) =>
			l.actorLayouts[1].bottomY - noteBottom
		const unadjustedNote = unadjusted.noteRects[0]
		const unadjustedNoteBottom = unadjusted.rowYs.get(1)! + unadjustedNote.h / 2
		expect(footerGap(layout, note.y + note.h)).toBeCloseTo(
			footerGap(unadjusted, unadjustedNoteBottom)
		)
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

	it("draws a section's title as text, inset where a box's label sat", async () => {
		const text = `sequenceDiagram
  alt ok
    A->>B: yes
  else nope
    B->>A: no
  end`
		const padding = 8
		const measureLabel: MeasureLabelSize = (label) => ({
			w: label.length * 7 + padding * 2,
			h: 20 + padding * 2,
		})
		const { nodes } = await toBlueprint(text, measureLabel)
		const frame = nodes.find((node) => node.id === 'fragment-0')!
		const section = nodes.find((node) => node.id === 'fragment-0-section-1')!

		expect(defaultMermaidNodeRenderSpec('sequence', section.kind)).toEqual({ variant: 'text' })
		expect(section.x - frame.x).toBe(5 + padding)
		expect(section.x + section.w).toBe(frame.x + frame.w - 5)
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

	it("widens a frame around one participant's self-message to hold its title and label", async () => {
		const { nodes } = await toBlueprint(`sequenceDiagram
  A->>B: go
  opt Customer included coupon
    B->>B: Apply discount rules
  end`)

		const frame = nodes.find((node) => node.kind === 'sequence_fragment')!
		const actor = nodes.find((node) => node.id === 'actor-top-B')!
		// Sized from the lifeline alone, the frame would end 30 past B's box.
		expect(frame.x + frame.w).toBeGreaterThan(actor.x + actor.w + 60)
	})

	it("ids messages, their labels and notes as i<n>, the event's index in the model", async () => {
		// parseSequenceLayout matches rows to model events by this id alone.
		const parsed = (await parsePeleDiagram(`sequenceDiagram
  A->>B: Hello
  Note over A: aside
  B-->>A: Back`))!
		const model = parsed.model as SequenceModel
		const container = document.createElement('div')
		container.innerHTML = parsed.pele.render(model, { fontSize: 16 }).svg
		const idsOf = (selector: string) =>
			[...container.querySelectorAll(selector)].map((el) => el.getAttribute('data-id'))
		const indexOf = (text: string) => `i${model.messages.findIndex((m) => m.message === text)}`

		expect(idsOf('.pele-message')).toEqual([indexOf('Hello'), indexOf('Back')])
		expect(idsOf('.pele-edge-label')).toEqual([indexOf('Hello'), indexOf('Back')])
		expect(idsOf('.pele-note')).toEqual([indexOf('aside')])
	})

	it("positions label text by its baseline, which the label's top is worked out from", async () => {
		const parsed = (await parsePeleDiagram('sequenceDiagram\n  A->>B: Hello'))!
		const container = document.createElement('div')
		container.innerHTML = parsed.pele.render(parsed.model, { fontSize: 16 }).svg
		const text = container.querySelector('.pele-edge-label text')!
		const line = container.querySelector('.pele-message path')!

		expect(text.getAttribute('dominant-baseline')).toBeNull()
		expect(text.getAttribute('alignment-baseline')).toBeNull()
		expect(text.getAttribute('dy')).toBeNull()
		// The label sits above its arrow, with the baseline between the two.
		const arrowY = Number(line.getAttribute('d')!.match(/^M[-\d.]+,([-\d.]+)/)![1])
		expect(Number(text.getAttribute('y'))).toBeLessThan(arrowY)
	})

	it('rejects text pele cannot parse', async () => {
		await expect(toBlueprint('sequenceDiagram\n  A->>')).rejects.toThrow()
	})
})

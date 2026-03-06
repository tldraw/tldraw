import { Mat, PI2, TLArrowShape, TLGeoShape, VecLike } from '@tldraw/editor'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { getArrowInfo } from '../lib/shapes/arrow/getArrowInfo'
import { renderPlaintextFromRichText } from '../lib/utils/text/richText'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('mermaid external text import', () => {
	it('imports mermaid flowcharts as center-connected diagram shapes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart LR
				A[Start] --> B{Decision}
				B --> C[Done]
			`,
		})

		const shapes = editor.getCurrentPageShapes()
		const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(3)
		expect(arrows).toHaveLength(2)
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(0)

		for (const arrow of arrows) {
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			expect(bindings.map((binding) => binding.props.terminal).sort()).toEqual(['end', 'start'])
			for (const binding of bindings) {
				expect(binding.props.normalizedAnchor.x).toBe(0.5)
				expect(binding.props.normalizedAnchor.y).toBe(0.5)
			}
		}
	})

	it('applies classDef fill colors as solid node fills', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TD
  A[Start] --> B[End]
  classDef green fill:#00ff00
  classDef blue fill:#0000ff
  class A green
  class B blue`,
		})

		const geoByLabel = new Map(
			editor
				.getCurrentPageShapes()
				.filter((shape): shape is TLGeoShape => shape.type === 'geo')
				.map((shape) => [renderPlaintextFromRichText(editor, shape.props.richText).trim(), shape])
		)

		const start = geoByLabel.get('Start')
		const end = geoByLabel.get('End')
		expect(start).toBeDefined()
		expect(end).toBeDefined()

		expect(start!.props.fill).toBe('solid')
		expect(start!.props.color).toBe('light-green')
		expect(end!.props.fill).toBe('solid')
		expect(end!.props.color).toBe('blue')
	})

	it('selects imported mermaid shapes after paste', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `sequenceDiagram
A->>B: Init
loop Retry until success
	A->>B: Retry
end
B-->>A: Ack`,
			html: `<pre><code>sequenceDiagram
A-&gt;&gt;B: Init
loop Retry until success
	A-&gt;&gt;B: Retry
end
B--&gt;&gt;A: Ack</code></pre>`,
		})

		expect(editor.getSelectedShapeIds().length).toBeGreaterThan(0)
	})

	it('imports fenced mermaid code blocks', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `\`\`\`mermaid
flowchart TD
A --> B
\`\`\``,
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(2)
		expect(shapes.filter((shape) => shape.type === 'arrow')).toHaveLength(1)
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(0)
	})

	it('imports mermaid when rich text html is present', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> A
A --> [*]`,
			html: `<pre><code>stateDiagram-v2
[*] --&gt; A
A --&gt; [*]</code></pre>`,
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(3)
		expect(shapes.filter((shape) => shape.type === 'arrow')).toHaveLength(2)
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(0)
	})

	it('falls back to plain text when parsing fails', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TDX
A --> B`,
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(1)
		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(0)
		expect(shapes.filter((shape) => shape.type === 'arrow')).toHaveLength(0)
	})

	it('falls back to plain text for unsupported mermaid mindmap diagrams', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `mindmap
Root
	Child`,
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(1)
		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(0)
		expect(shapes.filter((shape) => shape.type === 'arrow')).toHaveLength(0)
	})

	it('renders subgraphs as containing geo shapes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TB
c1-->a2
subgraph one
  a1-->a2
end
subgraph two
  b1-->b2
end
one --> two`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const one = geoByLabel.get('one')
		const two = geoByLabel.get('two')
		const c1 = geoByLabel.get('c1')
		const a1 = geoByLabel.get('a1')
		const b1 = geoByLabel.get('b1')
		const b2 = geoByLabel.get('b2')

		expect(one).toBeDefined()
		expect(two).toBeDefined()
		expect(c1).toBeDefined()
		expect(a1).toBeDefined()
		expect(b1).toBeDefined()
		expect(b2).toBeDefined()

		expect(one!.props.dash).toBe('dashed')
		expect(one!.props.fill).toBe('none')
		expect(two!.props.dash).toBe('dashed')
		expect(two!.props.fill).toBe('none')

		// Mermaid container padding should leave generous space around child shapes.
		expect(a1!.x - one!.x).toBeGreaterThanOrEqual(48)
		expect(one!.x + one!.props.w - (a1!.x + a1!.props.w)).toBeGreaterThanOrEqual(48)
		expect(one!.y + one!.props.h - (a1!.y + a1!.props.h)).toBeGreaterThanOrEqual(40)

		expect(containsGeo(one!, a1!)).toBe(true)
		expect(containsGeo(one!, c1!)).toBe(false)
		expect(containsGeo(two!, b1!)).toBe(true)
		expect(containsGeo(two!, b2!)).toBe(true)

		const pageId = editor.getCurrentPageId()
		expect(one!.parentId).toBe(pageId)
		expect(two!.parentId).toBe(pageId)
		expect(a1!.parentId).toBe(pageId)
		expect(b1!.parentId).toBe(pageId)
		expect(b2!.parentId).toBe(pageId)
		expect(shapes.filter((shape) => shape.type === 'group')).toHaveLength(0)
	})

	it('keeps nodes referenced in a subgraph line without grouping imported shapes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TB
    c1-->a2
    subgraph one
    a1-->a2
    end
    subgraph two
    b1-->b2
    end
    subgraph three
    c1-->c2
    end`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const a1 = geoByLabel.get('a1')
		const a2 = geoByLabel.get('a2')
		const c1 = geoByLabel.get('c1')
		const c2 = geoByLabel.get('c2')
		const one = geoByLabel.get('one')
		const three = geoByLabel.get('three')

		expect(a1).toBeDefined()
		expect(a2).toBeDefined()
		expect(c1).toBeDefined()
		expect(c2).toBeDefined()
		expect(one).toBeDefined()
		expect(three).toBeDefined()

		const pageId = editor.getCurrentPageId()
		expect(a1!.parentId).toBe(pageId)
		expect(a2!.parentId).toBe(pageId)
		expect(c1!.parentId).toBe(pageId)
		expect(c2!.parentId).toBe(pageId)
		expect(one!.parentId).toBe(pageId)
		expect(three!.parentId).toBe(pageId)
		expect(shapes.filter((shape) => shape.type === 'group')).toHaveLength(0)
	})

	it('does not infer subgraph parents from label text', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TB
A["Alpha"]
subgraph one
  X["A"]
end`,
		})

		const geoShapes = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const alpha = geoShapes.find(
			(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === 'Alpha'
		)
		const labeledA = geoShapes.find(
			(shape) =>
				renderPlaintextFromRichText(editor, shape.props.richText).trim() === 'A' &&
				shape.props.dash !== 'dashed'
		)
		const one = geoShapes.find(
			(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === 'one'
		)

		expect(alpha).toBeDefined()
		expect(labeledA).toBeDefined()
		expect(one).toBeDefined()

		expect(containsGeo(one!, labeledA!)).toBe(true)
		expect(containsGeo(one!, alpha!)).toBe(false)
	})

	it('keeps markdown flowchart subgraph containers from overlapping', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart LR
	subgraph "One"
	  a("\`The **cat**
	  in the hat\`") -- "edge label" --> b{{"\`The **dog** in the hog\`"}}
	end
	subgraph "Two"
	  c("\`The **cat**
	  in the hat\`") -- "edge label" --> d{"The **dog** in the hog"}
	end`,
		})

		const subgraphContainers = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLGeoShape => shape.type === 'geo')
			.filter((shape) => shape.props.dash === 'dashed' && shape.props.fill === 'none')
			.sort((a, b) => a.x - b.x)

		expect(subgraphContainers).toHaveLength(2)

		const first = subgraphContainers[0]
		const second = subgraphContainers[1]
		expect(second.x).toBeGreaterThanOrEqual(first.x + first.props.w)
	})

	it('adds opposite bends for reverse-direction edges between the same nodes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
A --> B
B --> A`,
		})

		const arrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

		expect(arrows).toHaveLength(2)
		expect(arrows.every((arrow) => arrow.props.bend === 40)).toBe(true)
	})

	it('renders state start/end terminals as filled 12x12 ellipses', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> A
A --> [*]`,
		})

		const terminalNodes = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLGeoShape => shape.type === 'geo')
			.filter((shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === '')

		expect(terminalNodes).toHaveLength(2)
		expect(terminalNodes.every((shape) => shape.props.geo === 'ellipse')).toBe(true)
		expect(terminalNodes.every((shape) => shape.props.w === 12 && shape.props.h === 12)).toBe(true)
		expect(terminalNodes.every((shape) => shape.props.fill === 'fill')).toBe(true)
	})

	it('increases state terminal spacing when terminal edges are labeled', async () => {
		const unlabeledEditor = new TestEditor()
		await defaultHandleExternalTextContent(unlabeledEditor, {
			text: `stateDiagram-v2
[*]-->Accumulate
Accumulate--> [*]`,
		})

		const labeledEditor = new TestEditor()
		await defaultHandleExternalTextContent(labeledEditor, {
			text: `stateDiagram-v2
[*]-->Accumulate: start
Accumulate--> [*]: end`,
		})

		const unlabeled = getTerminalVerticalGaps(unlabeledEditor, 'Accumulate')
		const labeled = getTerminalVerticalGaps(labeledEditor, 'Accumulate')

		expect(unlabeled).toBeDefined()
		expect(labeled).toBeDefined()
		expect(labeled!.startGap).toBeGreaterThan(unlabeled!.startGap)
		expect(labeled!.endGap).toBeGreaterThan(unlabeled!.endGap)
	})

	it('distributes bends across multiple same-direction edges between the same nodes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart LR
A --> B
A --> B
A --> B`,
		})

		const bends = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
			.map((arrow) => arrow.props.bend)
			.sort((a, b) => a - b)

		expect(bends).toEqual([-40, 40, 80])
	})

	it('keeps flowchart edges straight when layer ordering can align them', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TD
A
B
Y --> B
X --> A`,
		})

		const geoByLabel = new Map(
			editor
				.getCurrentPageShapes()
				.filter((shape): shape is TLGeoShape => shape.type === 'geo')
				.map((shape) => [renderPlaintextFromRichText(editor, shape.props.richText).trim(), shape])
		)

		const yToB = getArrowBetween(editor, geoByLabel.get('Y')!.id, geoByLabel.get('B')!.id)
		const xToA = getArrowBetween(editor, geoByLabel.get('X')!.id, geoByLabel.get('A')!.id)

		expect(yToB).toBeDefined()
		expect(xToA).toBeDefined()
		expect(yToB!.props.bend).toBe(0)
		expect(xToA!.props.bend).toBe(0)
	})

	it('reorders nodes within a layer to reduce edge crossings', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TD
A
B
D
C
A --> C
B --> D`,
		})

		const geoByLabel = getGeoByLabel(editor)
		const a = geoByLabel.get('A')
		const b = geoByLabel.get('B')
		const c = geoByLabel.get('C')
		const d = geoByLabel.get('D')

		expect(a).toBeDefined()
		expect(b).toBeDefined()
		expect(c).toBeDefined()
		expect(d).toBeDefined()

		expect(getCenterX(a!)).toBeLessThan(getCenterX(b!))
		expect(getCenterX(c!)).toBeLessThan(getCenterX(d!))
	})

	it('uses per-layer breadth sizing for sibling spacing', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TD
A["This is a very wide node label that should not inflate the spacing between small siblings"]
A --> B
A --> C`,
		})

		const geoByLabel = getGeoByLabel(editor)
		const a = geoByLabel.get(
			'This is a very wide node label that should not inflate the spacing between small siblings'
		)
		const b = geoByLabel.get('B')
		const c = geoByLabel.get('C')

		expect(a).toBeDefined()
		expect(b).toBeDefined()
		expect(c).toBeDefined()

		const siblingGap = c!.x - (b!.x + b!.props.w)
		expect(siblingGap).toBeLessThanOrEqual(120)
	})

	it('keeps upward flowchart edges straight when layer ordering can align them', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart BT
A
B
Y --> B
X --> A`,
		})

		const geoByLabel = new Map(
			editor
				.getCurrentPageShapes()
				.filter((shape): shape is TLGeoShape => shape.type === 'geo')
				.map((shape) => [renderPlaintextFromRichText(editor, shape.props.richText).trim(), shape])
		)

		const yToB = getArrowBetween(editor, geoByLabel.get('Y')!.id, geoByLabel.get('B')!.id)
		const xToA = getArrowBetween(editor, geoByLabel.get('X')!.id, geoByLabel.get('A')!.id)

		expect(yToB).toBeDefined()
		expect(xToA).toBeDefined()
		expect(yToB!.props.bend).toBe(0)
		expect(xToA!.props.bend).toBe(0)
	})

	it('positions state bent arrow labels closer to the start of the arrow', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> Active
state Active {
  [*] --> NumLockOff
  NumLockOff --> NumLockOn : EvNumLockPressed
  NumLockOn --> NumLockOff : EvNumLockPressed
}`,
		})

		const arrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const labeledBentArrows = arrows.filter(
			(arrow) =>
				arrow.props.bend !== 0 &&
				renderPlaintextFromRichText(editor, arrow.props.richText).trim() === 'EvNumLockPressed'
		)

		expect(labeledBentArrows).toHaveLength(2)
		expect(labeledBentArrows.every((arrow) => arrow.props.labelPosition === 0.3)).toBe(true)
	})

	it('keeps entry transitions straight in state concurrency regions', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> Active
state Active {
  [*] --> NumLockOff
  NumLockOff --> NumLockOn : EvNumLockPressed
  NumLockOn --> NumLockOff : EvNumLockPressed
  --
  [*] --> CapsLockOff
  CapsLockOff --> CapsLockOn : EvCapsLockPressed
  CapsLockOn --> CapsLockOff : EvCapsLockPressed
  --
  [*] --> ScrollLockOff
  ScrollLockOff --> ScrollLockOn : EvScrollLockPressed
  ScrollLockOn --> ScrollLockOff : EvScrollLockPressed
}`,
		})

		const geoById = new Map(
			editor
				.getCurrentPageShapes()
				.filter((shape): shape is TLGeoShape => shape.type === 'geo')
				.map((shape) => [shape.id, shape])
		)

		const entryArrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
			.filter((arrow) => {
				const startBinding = editor
					.getBindingsFromShape(arrow, 'arrow')
					.find((binding) => binding.props.terminal === 'start')
				if (!startBinding) return false

				const startShape = geoById.get(startBinding.toId)
				if (!startShape) return false

				const startLabel = renderPlaintextFromRichText(editor, startShape.props.richText).trim()
				return startLabel === ''
			})

		expect(entryArrows.length).toBeGreaterThan(0)
		expect(entryArrows.every((arrow) => arrow.props.bend === 0)).toBe(true)
	})

	it('preserves distinct end terminals in state concurrency regions', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> Active
state Active {
  [*] --> NumLockOff
  NumLockOff --> [*]
  --
  [*] --> CapsLockOff
  CapsLockOff --> [*]
  --
  [*] --> ScrollLockOff
  ScrollLockOff --> [*]
}`,
		})

		const geoShapes = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const arrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const blankGeos = geoShapes.filter(
			(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === ''
		)

		const outgoingCounts = new Map<string, number>()
		const incomingCounts = new Map<string, number>()
		for (const arrow of arrows) {
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			const start = bindings.find((binding) => binding.props.terminal === 'start')
			const end = bindings.find((binding) => binding.props.terminal === 'end')
			if (start) outgoingCounts.set(start.toId, (outgoingCounts.get(start.toId) ?? 0) + 1)
			if (end) incomingCounts.set(end.toId, (incomingCounts.get(end.toId) ?? 0) + 1)
		}

		const endTerminals = blankGeos.filter(
			(shape) => (outgoingCounts.get(shape.id) ?? 0) === 0 && (incomingCounts.get(shape.id) ?? 0) > 0
		)
		expect(endTerminals).toHaveLength(3)

		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const distinctRegionEnds = new Set(
			['NumLockOff', 'CapsLockOff', 'ScrollLockOff'].map((label) => {
				const state = geoByLabel.get(label)
				expect(state).toBeDefined()

				const arrow = arrows.find((candidate) => {
					const bindings = editor.getBindingsFromShape(candidate, 'arrow')
					const start = bindings.find((binding) => binding.props.terminal === 'start')
					const end = bindings.find((binding) => binding.props.terminal === 'end')
					return start?.toId === state!.id && endTerminals.some((terminal) => terminal.id === end?.toId)
				})

				expect(arrow).toBeDefined()

				const endBinding = editor
					.getBindingsFromShape(arrow!, 'arrow')
					.find((binding) => binding.props.terminal === 'end')
				return endBinding!.toId
			})
		)

		expect(distinctRegionEnds.size).toBe(3)
	})

	it('aligns state nodes in the same column and row by center', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
state if_state <<choice>>
[*] --> IsPositive
IsPositive --> if_state
if_state --> False: if n < 0
if_state --> True : if n >= 0`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const isPositive = geoByLabel.get('IsPositive')
		const choice = geoByLabel.get('if_state')
		const falseState = geoByLabel.get('False')
		const trueState = geoByLabel.get('True')

		expect(isPositive).toBeDefined()
		expect(choice).toBeDefined()
		expect(falseState).toBeDefined()
		expect(trueState).toBeDefined()

		const columnCenterX = getCenterX(choice!)
		expect(Math.abs(getCenterX(isPositive!) - columnCenterX)).toBeLessThan(1)
		expect(Math.abs(getCenterX(falseState!) - columnCenterX)).toBeLessThan(1)
		expect(Math.abs(getCenterY(falseState!) - getCenterY(trueState!))).toBeLessThan(1)
	})

	it('keeps a horizontal gap between sibling composite state containers', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> First
First --> Second
First --> Third
state First {
	[*] --> fir
	fir --> [*]
}
state Second {
	[*] --> sec
	sec --> [*]
}
state Third {
	[*] --> thi
	thi --> [*]
}`,
		})

		const geoByLabel = new Map(
			editor
				.getCurrentPageShapes()
				.filter((shape): shape is TLGeoShape => shape.type === 'geo')
				.map((shape) => [renderPlaintextFromRichText(editor, shape.props.richText).trim(), shape])
		)

		const first = geoByLabel.get('First')
		const second = geoByLabel.get('Second')
		const third = geoByLabel.get('Third')
		expect(first).toBeDefined()
		expect(second).toBeDefined()
		expect(third).toBeDefined()

		const firstToSecondGap = second!.x - (first!.x + first!.props.w)
		const secondToThirdGap = third!.x - (second!.x + second!.props.w)
		expect(firstToSecondGap).toBeGreaterThan(0)
		expect(secondToThirdGap).toBeGreaterThan(0)
	})

	it('bends long state arrows that would cross through another node', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> Still
Still --> [*]
Still --> Moving
Moving --> Still
Moving --> Crash
Crash --> [*]`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const terminalGeos = geoShapes.filter(
			(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === ''
		)
		const rootEnd = terminalGeos.sort((a, b) => b.y - a.y)[0]

		expect(rootEnd).toBeDefined()

		const arrowsToRootEnd = arrows.filter((arrow) => {
			const endBinding = editor
				.getBindingsFromShape(arrow, 'arrow')
				.find((binding) => binding.props.terminal === 'end')
			return endBinding?.toId === rootEnd.id
		})

		expect(arrowsToRootEnd.length).toBeGreaterThan(0)

		const longestArrowToRootEnd = arrowsToRootEnd.sort(
			(a, b) => getArrowLength(b) - getArrowLength(a)
		)[0]
		expect(longestArrowToRootEnd.props.bend).not.toBe(0)
	})

	it('increases bend on long flowchart back-links to avoid intermediate nodes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TD
A[Start] --> B{Is it?}
B -->|Yes| C[OK]
C --> D[Rethink]
D --> B
B ---->|No| E[End]`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const rethink = geoByLabel.get('Rethink')
		const isIt = geoByLabel.get('Is it?')
		const ok = geoByLabel.get('OK')

		expect(rethink).toBeDefined()
		expect(isIt).toBeDefined()
		expect(ok).toBeDefined()

		const loopArrow = arrows.find((arrow) => {
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			const startBinding = bindings.find((binding) => binding.props.terminal === 'start')
			const endBinding = bindings.find((binding) => binding.props.terminal === 'end')
			return startBinding?.toId === rethink!.id && endBinding?.toId === isIt!.id
		})

		expect(loopArrow).toBeDefined()

		const loopPoints = getArrowPagePolyline(editor, loopArrow!, 80)
		const okBounds = editor.getShapePageBounds(ok!.id)!
		const okInteriorRect = {
			x: okBounds.x + 2,
			y: okBounds.y + 2,
			w: Math.max(0, okBounds.w - 4),
			h: Math.max(0, okBounds.h - 4),
		}

		expect(polylineIntersectsRect(loopPoints, okInteriorRect)).toBe(false)
	})

	it('routes self-edges on the right side and increases bend for labels', async () => {
		const plainEditor = new TestEditor()
		await defaultHandleExternalTextContent(plainEditor, {
			text: `flowchart TD
A --> A`,
		})

		const plainArrow = plainEditor
			.getCurrentPageShapes()
			.find((shape): shape is TLArrowShape => shape.type === 'arrow')
		expect(plainArrow).toBeDefined()

		const plainBindings = plainEditor.getBindingsFromShape(plainArrow!, 'arrow')
		const plainStart = plainBindings.find((binding) => binding.props.terminal === 'start')
		const plainEnd = plainBindings.find((binding) => binding.props.terminal === 'end')

		expect(plainStart).toBeDefined()
		expect(plainEnd).toBeDefined()
		expect(plainStart!.props.normalizedAnchor.x).toBe(1)
		expect(plainEnd!.props.normalizedAnchor.x).toBe(0.9)
		expect(plainStart!.props.normalizedAnchor.y).toBeLessThan(plainEnd!.props.normalizedAnchor.y)
		expect(plainArrow!.props.bend).toBeLessThan(-40)
		expect(plainArrow!.props.labelPosition).toBe(0.5)

		const labeledEditor = new TestEditor()
		await defaultHandleExternalTextContent(labeledEditor, {
			text: `flowchart TD
A -->|A very long self-edge label for spacing| A`,
		})

		const labeledArrow = labeledEditor
			.getCurrentPageShapes()
			.find((shape): shape is TLArrowShape => shape.type === 'arrow')
		expect(labeledArrow).toBeDefined()
		expect(Math.abs(labeledArrow!.props.bend)).toBeGreaterThan(Math.abs(plainArrow!.props.bend))
		expect(labeledArrow!.props.labelPosition).toBe(0.5)
	})

	it('keeps self-transition labels centered in state diagrams', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
A --> A: first
A --> A: second`,
		})

		const arrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

		expect(arrows).toHaveLength(2)
		expect(arrows.every((arrow) => arrow.props.labelPosition === 0.5)).toBe(true)
	})
})

function containsGeo(container: TLGeoShape, child: TLGeoShape) {
	return (
		container.x <= child.x &&
		container.y <= child.y &&
		container.x + container.props.w >= child.x + child.props.w &&
		container.y + container.props.h >= child.y + child.props.h
	)
}

function getCenterX(shape: TLGeoShape) {
	return shape.x + shape.props.w / 2
}

function getCenterY(shape: TLGeoShape) {
	return shape.y + shape.props.h / 2
}

function getGeoByLabel(editor: TestEditor) {
	return new Map(
		editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLGeoShape => shape.type === 'geo')
			.map((shape) => [renderPlaintextFromRichText(editor, shape.props.richText).trim(), shape])
	)
}

function getArrowLength(shape: TLArrowShape) {
	const start = {
		x: shape.x + shape.props.start.x,
		y: shape.y + shape.props.start.y,
	}
	const end = {
		x: shape.x + shape.props.end.x,
		y: shape.y + shape.props.end.y,
	}
	return Math.hypot(end.x - start.x, end.y - start.y)
}

function getArrowTerminalAnchors(editor: TestEditor, sourceId: string, targetId: string) {
	const arrows = editor
		.getCurrentPageShapes()
		.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

	for (const arrow of arrows) {
		const bindings = editor.getBindingsFromShape(arrow, 'arrow')
		const start = bindings.find((binding) => binding.props.terminal === 'start')
		const end = bindings.find((binding) => binding.props.terminal === 'end')
		if (start?.toId === sourceId && end?.toId === targetId) {
			return {
				start: start.props.normalizedAnchor,
				end: end.props.normalizedAnchor,
			}
		}
	}

	return null
}

function getArrowBetween(editor: TestEditor, sourceId: string, targetId: string) {
	const arrows = editor
		.getCurrentPageShapes()
		.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

	for (const arrow of arrows) {
		const bindings = editor.getBindingsFromShape(arrow, 'arrow')
		const start = bindings.find((binding) => binding.props.terminal === 'start')
		const end = bindings.find((binding) => binding.props.terminal === 'end')
		if (start?.toId === sourceId && end?.toId === targetId) {
			return arrow
		}
	}

	return null
}

function getArrowPagePolyline(editor: TestEditor, arrow: TLArrowShape, segments: number) {
	const info = getArrowInfo(editor, arrow)
	if (!info) return []

	const arrowTransform = editor.getShapePageTransform(arrow)!

	if (info.type === 'arc') {
		const startAngle = Math.atan2(
			info.start.point.y - info.bodyArc.center.y,
			info.start.point.x - info.bodyArc.center.x
		)
		const points: VecLike[] = []

		for (let i = 0; i <= segments; i++) {
			const t = i / segments
			const angle = normalizeAngle(startAngle + info.bodyArc.size * t)
			points.push(
				Mat.applyToPoint(arrowTransform, {
					x: info.bodyArc.center.x + Math.cos(angle) * info.bodyArc.radius,
					y: info.bodyArc.center.y + Math.sin(angle) * info.bodyArc.radius,
				})
			)
		}

		return points
	}

	if (info.type === 'elbow') {
		return info.route.points.map((point) => Mat.applyToPoint(arrowTransform, point))
	}

	return [
		Mat.applyToPoint(arrowTransform, info.start.point),
		Mat.applyToPoint(arrowTransform, info.end.point),
	]
}

function normalizeAngle(angle: number) {
	let next = angle
	while (next <= -Math.PI) next += PI2
	while (next > Math.PI) next -= PI2
	return next
}

function polylineIntersectsRect(
	points: VecLike[],
	rect: { x: number; y: number; w: number; h: number }
) {
	for (let i = 0; i < points.length - 1; i++) {
		if (segmentIntersectsRect(points[i], points[i + 1], rect)) return true
	}
	return false
}

function segmentIntersectsRect(
	a: VecLike,
	b: VecLike,
	rect: { x: number; y: number; w: number; h: number }
) {
	if (pointInRect(a, rect) || pointInRect(b, rect)) return true

	const topLeft = { x: rect.x, y: rect.y }
	const topRight = { x: rect.x + rect.w, y: rect.y }
	const bottomRight = { x: rect.x + rect.w, y: rect.y + rect.h }
	const bottomLeft = { x: rect.x, y: rect.y + rect.h }

	return (
		segmentsIntersect(a, b, topLeft, topRight) ||
		segmentsIntersect(a, b, topRight, bottomRight) ||
		segmentsIntersect(a, b, bottomRight, bottomLeft) ||
		segmentsIntersect(a, b, bottomLeft, topLeft)
	)
}

function pointInRect(point: VecLike, rect: { x: number; y: number; w: number; h: number }) {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.w &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.h
	)
}

function segmentsIntersect(a: VecLike, b: VecLike, c: VecLike, d: VecLike) {
	const o1 = orientation(a, b, c)
	const o2 = orientation(a, b, d)
	const o3 = orientation(c, d, a)
	const o4 = orientation(c, d, b)

	if (o1 !== o2 && o3 !== o4) return true
	if (o1 === 0 && onSegment(a, c, b)) return true
	if (o2 === 0 && onSegment(a, d, b)) return true
	if (o3 === 0 && onSegment(c, a, d)) return true
	if (o4 === 0 && onSegment(c, b, d)) return true

	return false
}

function orientation(a: VecLike, b: VecLike, c: VecLike) {
	const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
	if (Math.abs(value) < 0.00001) return 0
	return value > 0 ? 1 : 2
}

function onSegment(a: VecLike, b: VecLike, c: VecLike) {
	return (
		b.x <= Math.max(a.x, c.x) &&
		b.x >= Math.min(a.x, c.x) &&
		b.y <= Math.max(a.y, c.y) &&
		b.y >= Math.min(a.y, c.y)
	)
}

function getTerminalVerticalGaps(editor: TestEditor, stateLabel: string) {
	const geoShapes = editor
		.getCurrentPageShapes()
		.filter((shape): shape is TLGeoShape => shape.type === 'geo')
	const stateShape = geoShapes.find(
		(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === stateLabel
	)
	if (!stateShape) return null

	const terminalShapes = geoShapes
		.filter((shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === '')
		.sort((a, b) => a.y - b.y)
	const topTerminal = terminalShapes[0]
	const bottomTerminal = terminalShapes[terminalShapes.length - 1]
	if (!topTerminal || !bottomTerminal) return null

	return {
		startGap: stateShape.y - (topTerminal.y + topTerminal.props.h),
		endGap: bottomTerminal.y - (stateShape.y + stateShape.props.h),
	}
}

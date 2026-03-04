import { TLArrowShape, TLGeoShape } from '@tldraw/editor'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { renderPlaintextFromRichText } from '../lib/utils/text/richText'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('mermaid external text import', () => {
	it('imports mermaid flowcharts as connected diagram shapes', async () => {
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
		}
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
		const a1 = geoByLabel.get('a1')
		const b1 = geoByLabel.get('b1')
		const b2 = geoByLabel.get('b2')

		expect(one).toBeDefined()
		expect(two).toBeDefined()
		expect(a1).toBeDefined()
		expect(b1).toBeDefined()
		expect(b2).toBeDefined()

		expect(one!.props.dash).toBe('dashed')
		expect(one!.props.fill).toBe('none')
		expect(two!.props.dash).toBe('dashed')
		expect(two!.props.fill).toBe('none')

		expect(containsGeo(one!, a1!)).toBe(true)
		expect(containsGeo(two!, b1!)).toBe(true)
		expect(containsGeo(two!, b2!)).toBe(true)

		expect(one!.parentId).toBe(a1!.parentId)
		expect(two!.parentId).toBe(b1!.parentId)
		expect(two!.parentId).toBe(b2!.parentId)
		expect(one!.parentId).not.toBe(two!.parentId)
		expect(editor.getShape(one!.parentId!)?.type).toBe('group')
		expect(editor.getShape(two!.parentId!)?.type).toBe('group')
	})

	it('keeps nodes referenced in a subgraph line grouped with that subgraph', async () => {
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

		expect(a1!.parentId).toBe(a2!.parentId)
		expect(c1!.parentId).toBe(c2!.parentId)
		expect(one!.parentId).toBe(a1!.parentId)
		expect(three!.parentId).toBe(c1!.parentId)
		expect(editor.getShape(one!.parentId!)?.type).toBe('group')
		expect(editor.getShape(three!.parentId!)?.type).toBe('group')
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

import { Editor, getArrowBindings, TLArrowShape, TLParentId, TLShape, TLShapeId } from 'tldraw'
import type { TLMermaidClassShape } from './classShape'
import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'
import { createEditor } from './test/createEditor'

// jsdom lays out no text; mermaid only needs some size for it to render.
const svgPrototype = SVGElement.prototype as any
beforeAll(() => {
	svgPrototype.getBBox = function () {
		return { x: 0, y: 0, width: Math.max(8, (this.textContent ?? '').length * 8), height: 16 }
	}
	svgPrototype.getComputedTextLength = function () {
		return (this.textContent ?? '').length * 8
	}
})
afterAll(() => {
	delete svgPrototype.getBBox
	delete svgPrototype.getComputedTextLength
})

async function paste(source: string, { withMermaidUtils = true } = {}) {
	const editor = createEditor({ withMermaidUtils })
	await createMermaidDiagram(editor, source)
	return editor
}

const shapesOfType = (editor: Editor, type: string) =>
	editor.getCurrentPageShapes().filter((shape) => shape.type === type)
const text = (editor: Editor, shape: TLShape) => editor.getShapeUtil(shape).getText(shape)
const classNamed = (editor: Editor, name: string) =>
	(shapesOfType(editor, 'mermaid-class') as TLMermaidClassShape[]).find(
		(shape) => shape.props.name === name
	)!
const labelReading = (editor: Editor, value: string) =>
	shapesOfType(editor, 'text').find((shape) => text(editor, shape) === value)!
const nameOf = (editor: Editor, id: TLParentId | undefined) => {
	const shape = id && editor.getShape(id as TLShapeId)
	return shape ? (shape as TLMermaidClassShape).props.name : undefined
}

/** Whether a label sits beside a class: within 60px of its box. */
function isBeside(editor: Editor, label: TLShape, cls: TLShape) {
	const { center } = editor.getShapePageBounds(label)!
	return editor.getShapePageBounds(cls)!.clone().expandBy(60).containsPoint(center)
}

describe('class diagrams', () => {
	it('draws each class as a box of its annotations, name, attributes, and methods', async () => {
		const editor = await paste(`classDiagram
    class Box~T~ {
        <<interface>>
        +List~int~ items
        +int count$
        +open() bool
        +close()*
    }
    class Empty`)

		expect(classNamed(editor, 'Box<T>').props).toMatchObject({
			annotations: ['interface'],
			attributes: [{ text: '+List<int> items' }, { text: '+int count', classifier: 'static' }],
			methods: [{ text: '+open() : bool' }, { text: '+close()', classifier: 'abstract' }],
		})
		expect(classNamed(editor, 'Empty').props).toMatchObject({ attributes: [], methods: [] })
	})

	it('draws each relation with its UML ends', async () => {
		const editor = await paste(`classDiagram
    Animal <|-- Duck
    Duck ..|> Swimmer
    Zoo *-- Animal
    Zoo o-- Keeper
    Duck ..> Water
    Zoo -- Ticket`)

		const relations = (shapesOfType(editor, 'arrow') as TLArrowShape[]).map((arrow) => {
			const { start, end } = getArrowBindings(editor, arrow)
			const { arrowheadStart, arrowheadEnd, fill, dash } = arrow.props
			return [
				nameOf(editor, start?.toId),
				nameOf(editor, end?.toId),
				arrowheadStart,
				arrowheadEnd,
				fill,
				dash,
			]
		})
		expect(relations).toEqual([
			['Animal', 'Duck', 'triangle', 'none', 'none', 'solid'],
			['Duck', 'Swimmer', 'none', 'triangle', 'none', 'dashed'],
			['Zoo', 'Animal', 'diamond', 'none', 'fill', 'solid'],
			['Zoo', 'Keeper', 'diamond', 'none', 'none', 'solid'],
			['Duck', 'Water', 'none', 'arrow', 'none', 'dashed'],
			['Zoo', 'Ticket', 'none', 'none', 'none', 'solid'],
		])
	})

	it('loops a relation to itself close to its class', async () => {
		// Where mermaid routed one as a hairpin hundreds of pixels long.
		const editor = await paste(`classDiagram
    namespace Catalog {
        class Product
        class Node
    }
    Node "1" o-- "*" Product : groups
    Node --> Node : next`)

		const loop = shapesOfType(editor, 'arrow').find((arrow) => text(editor, arrow) === 'next')!
		const node = editor.getShapePageBounds(classNamed(editor, 'Node'))!
		expect(editor.getShapePageBounds(loop)!.h).toBeLessThan(node.h + Math.max(node.w, node.h))
	})

	describe('multiplicities', () => {
		const source = `classDiagram
    namespace Shop {
        class Order
    }
    Customer "1" --> "*" Order : places
    class Invoice`

		it('sit beside the class at their end, with the title on the arrow', async () => {
			const editor = await paste(source)

			const [arrow] = shapesOfType(editor, 'arrow')
			expect(text(editor, arrow)).toBe('places')
			expect(nameOf(editor, labelReading(editor, '1').parentId)).toBe('Customer')
			expect(nameOf(editor, labelReading(editor, '*').parentId)).toBe('Order')
			expect(isBeside(editor, labelReading(editor, '*'), classNamed(editor, 'Order'))).toBe(true)
		})

		it('follow their class, and the namespace holding it, and go back on undo', async () => {
			const editor = await paste(source)
			const order = classNamed(editor, 'Order')
			const star = labelReading(editor, '*')
			const start = editor.getShapePageBounds(star)!.center
			editor.markHistoryStoppingPoint()

			editor.updateShape({ id: order.id, type: order.type, x: order.x + 400 })
			expect(isBeside(editor, labelReading(editor, '*'), classNamed(editor, 'Order'))).toBe(true)
			const [shop] = shapesOfType(editor, 'geo')
			editor.updateShape({ id: shop.id, type: shop.type, y: shop.y + 400 })
			expect(isBeside(editor, labelReading(editor, '*'), classNamed(editor, 'Order'))).toBe(true)

			editor.undo()
			expect(editor.getShapePageBounds(star)!.center).toMatchObject({ x: start.x, y: start.y })
		})

		it('follow the arrow onto a class it is dragged to', async () => {
			const editor = await paste(source)
			const arrow = shapesOfType(editor, 'arrow')[0] as TLArrowShape
			const invoice = classNamed(editor, 'Invoice')

			editor.deleteBinding(getArrowBindings(editor, arrow).end!)
			editor.createBinding({
				type: 'arrow',
				fromId: arrow.id,
				toId: invoice.id,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			})
			editor.updateShape<TLArrowShape>({ id: arrow.id, type: 'arrow', props: { bend: 0 } })

			expect(nameOf(editor, labelReading(editor, '*').parentId)).toBe('Invoice')
		})

		it('stay with a duplicated diagram, and go with their arrow or their class', async () => {
			const editor = await paste(source)
			const [group] = shapesOfType(editor, 'group')
			editor.duplicateShapes([group.id], { x: 0, y: 2000 })
			const copies = shapesOfType(editor, 'text').filter((label) => text(editor, label) === '*')
			expect(
				copies.map((label) => isBeside(editor, label, editor.getShape(label.parentId)!))
			).toEqual([true, true])

			editor.deleteShape(classNamed(editor, 'Order').id)
			expect(
				shapesOfType(editor, 'text')
					.map((label) => text(editor, label))
					.sort()
			).toEqual(['*', '1', '1'])
			editor.deleteShapes(shapesOfType(editor, 'arrow'))
			expect(shapesOfType(editor, 'text')).toEqual([])
		})
	})

	describe('namespaces', () => {
		const source = (hierarchical: boolean) => `---
config:
  class:
    hierarchicalNamespaces: ${hierarchical}
---
classDiagram
    namespace Earth.Volcano.Summit {
        class Crater
    }
    namespace Earth {
        class Hotspot
    }
    Hotspot --> Crater`
		const frames = (editor: Editor) =>
			shapesOfType(editor, 'geo').map((frame) => [
				text(editor, frame),
				editor.getShape(frame.parentId)?.type === 'geo'
					? text(editor, editor.getShape(frame.parentId)!)
					: undefined,
			])

		it('nest, named after each level, with room for every name', async () => {
			const editor = await paste(source(true))

			expect(frames(editor)).toEqual([
				['Earth', undefined],
				['Volcano', 'Earth'],
				['Summit', 'Volcano'],
			])
			const [earth, volcano, summit] = shapesOfType(editor, 'geo').map(
				(frame) => editor.getShapePageBounds(frame)!.y
			)
			expect(volcano - earth).toBeGreaterThanOrEqual(50)
			expect(summit - volcano).toBeGreaterThanOrEqual(50)
			expect(text(editor, editor.getShape(classNamed(editor, 'Crater').parentId)!)).toBe('Summit')
		})

		it('stay flat and named in full when not hierarchical', async () => {
			const editor = await paste(source(false))

			expect(frames(editor)).toEqual([
				['Earth', undefined],
				['Earth.Volcano.Summit', undefined],
			])
		})
	})

	it('falls back to labelled rectangles without the mermaid utils, and says which to add', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const editor = await paste(
			`classDiagram
    Order "1" *-- "*" Line : has
    class Order {
        +total() Money
    }`,
			{ withMermaidUtils: false }
		)

		expect(shapesOfType(editor, 'geo').map((shape) => text(editor, shape))).toEqual([
			'Order\n\n+total() : Money',
			'Line',
		])
		expect(shapesOfType(editor, 'arrow').map((shape) => text(editor, shape))).toEqual([
			'1 — has — *',
		])
		expect(warn.mock.calls.map(([message]) => message)).toEqual([
			expect.stringContaining('Pass MermaidClassShapeUtil'),
			expect.stringContaining('Pass MermaidEndLabelBindingUtil'),
		])
		warn.mockRestore()
	})

	it('names the missing util when a mapper asks for the class shape without registering it', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		await expect(
			createMermaidDiagram(createEditor({ withMermaidUtils: false }), 'classDiagram\n    class A', {
				blueprintRender: {
					mapNodeToRenderSpec: () => ({ variant: 'shape', type: 'mermaid-class', props: {} }),
				},
			})
		).rejects.toThrow(MermaidDiagramError)
		expect(String(error.mock.calls[0][0])).toContain(
			"MermaidClassShapeUtil isn't in the editor's shapeUtils"
		)
		error.mockRestore()
	})
})

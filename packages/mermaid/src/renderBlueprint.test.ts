import type { Editor, TLShape } from 'tldraw'
import { describe, expect, it, vi } from 'vitest'
import type { DiagramMermaidBlueprint } from './blueprint'
import type { TLMermaidClassShape } from './classShape'
import { renderBlueprint } from './renderBlueprint'
import { createEditor } from './test/createEditor'

function mockEditor() {
	const bounds = (w: number, h: number) => ({
		x: 0,
		y: 0,
		w,
		h,
		midX: w / 2,
		midY: h / 2,
		maxX: w,
		center: { x: w / 2, y: h / 2 },
	})
	const editor = {
		hasShapeUtil: vi.fn(() => false),
		bindingUtils: {},
		createShape: vi.fn(),
		getShape: vi.fn((id) => ({ id, type: 'geo', x: 0, y: 0 })),
		getShapePageBounds: vi.fn(() => bounds(80, 40)),
		updateShape: vi.fn(),
		run: vi.fn((fn) => fn()),
		createBindings: vi.fn(),
		groupShapes: vi.fn(),
		sendToBack: vi.fn(),
	}
	return editor as any
}

describe('renderBlueprint', () => {
	it('anchors an arrow across the width of its shape, not only down its middle', () => {
		const editor = mockEditor()
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'flowchart',
			nodes: [{ id: 'B', kind: 'rect', x: 0, y: 0, w: 80, h: 40 }],
			edges: [
				{
					startNodeId: 'B',
					endNodeId: 'B',
					bend: -60,
					anchorStartX: 0.375,
					anchorStartY: 1,
					anchorEndX: 0.75,
					anchorEndY: 1,
				},
			],
		}

		renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

		const [bindings] = editor.createBindings.mock.calls[0]
		expect(bindings.map((binding: any) => binding.props.normalizedAnchor)).toEqual([
			{ x: 0.375, y: 1 },
			{ x: 0.75, y: 1 },
		])
	})

	it('draws an unsized edge at the same size as an unsized node', () => {
		const editor = mockEditor()
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'state',
			nodes: [
				{ id: 'Idle', kind: 'default', label: 'Idle', x: 0, y: 0, w: 80, h: 40 },
				{ id: 'Running', kind: 'default', label: 'Running', x: 0, y: 200, w: 80, h: 40 },
			],
			edges: [{ startNodeId: 'Idle', endNodeId: 'Running', label: 'start', bend: 0 }],
		}

		renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

		const sizes = editor.createShape.mock.calls.map(([shape]: any) => [
			shape.type,
			shape.props.size,
		])
		expect(sizes).toEqual([
			['geo', 'm'],
			['geo', 'm'],
			['arrow', 'm'],
		])
	})

	it('sends background nodes behind the lines, keeping their own order', () => {
		const editor = mockEditor()
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'sequence',
			nodes: [
				{ id: 'box', kind: 'sequence_box', x: 0, y: 0, w: 200, h: 200, background: true },
				{ id: 'rect', kind: 'sequence_fragment', x: 10, y: 50, w: 180, h: 50, background: true },
				{ id: 'actor', kind: 'participant', x: 50, y: 0, w: 100, h: 40 },
			],
			edges: [],
			lines: [{ id: 'lifeline', x: 100, y: 40, endY: 160 }],
		}

		renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

		// Creation order is z-order, so the line sits beneath every node until the background nodes move.
		const created = editor.createShape.mock.calls.map(([shape]: any) => shape)
		expect(created.map((shape: any) => shape.type)).toEqual(['line', 'geo', 'geo', 'geo'])
		expect(editor.sendToBack).toHaveBeenCalledExactlyOnceWith([created[1].id, created[2].id])
	})

	describe('class diagrams', () => {
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'class',
			nodes: [
				{
					id: 'Order',
					kind: 'class',
					x: 0,
					y: 0,
					w: 200,
					h: 200,
					label: 'Order<br><br>+total() Money',
					classBox: {
						annotations: [],
						name: 'Order',
						attributes: [],
						methods: [{ text: '+total() Money', classifier: 'static' }],
					},
				},
				{ id: 'Line', kind: 'class', x: 400, y: 0, w: 80, h: 40, label: 'Line' },
			],
			edges: [
				{
					startNodeId: 'Order',
					endNodeId: 'Line',
					bend: 0,
					label: 'has',
					startLabel: '1',
					endLabel: '*',
				},
			],
		}
		const render = (editor: Editor) =>
			renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })
		const shapesOfType = (editor: Editor, type: string) =>
			editor.getCurrentPageShapes().filter((shape) => shape.type === type)
		const text = (editor: Editor, shape: TLShape) => editor.getShapeUtil(shape).getText(shape)

		it('draws a class box sized to its lines, centred where mermaid put it', () => {
			const editor = createEditor()
			render(editor)

			const order = shapesOfType(editor, 'mermaid-class').find(
				(shape) => (shape as TLMermaidClassShape).props.name === 'Order'
			) as TLMermaidClassShape
			expect(order.props).toMatchObject({
				name: 'Order',
				methods: [{ text: '+total() Money', classifier: 'static' }],
			})
			expect(order.props.w).toBeLessThan(200)
			// Mermaid centred Order at x = 100 and Line at x = 440.
			const [line] = shapesOfType(editor, 'geo')
			const centerX = (shape: TLShape) => editor.getShapePageBounds(shape)!.center.x
			expect(centerX(line) - centerX(order)).toBe(340)
		})

		it('falls back to labelled rectangles and a folded arrow label without the mermaid utils', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const editor = createEditor({ withMermaidUtils: false })
			render(editor)

			expect(warn.mock.calls.map(([message]) => message)).toEqual([
				expect.stringContaining('Pass MermaidClassShapeUtil'),
				expect.stringContaining('Pass MermaidEndLabelBindingUtil'),
			])
			warn.mockRestore()

			expect(shapesOfType(editor, 'geo').map((shape) => text(editor, shape))).toEqual([
				'Order\n\n+total() Money',
				'Line',
			])
			expect(shapesOfType(editor, 'arrow').map((shape) => text(editor, shape))).toEqual([
				'1 — has — *',
			])
			expect(shapesOfType(editor, 'text')).toEqual([])
		})

		it('lets a mapper choose the shape, and explains one asking for an unregistered class shape', () => {
			const editor = createEditor()
			renderBlueprint(editor, blueprint, {
				position: { x: 0, y: 0 },
				centerOnPosition: false,
				mapNodeToRenderSpec: () => ({ variant: 'geo', geo: 'ellipse' }),
			})
			expect(shapesOfType(editor, 'mermaid-class')).toEqual([])

			expect(() =>
				renderBlueprint(createEditor({ withMermaidUtils: false }), blueprint, {
					mapNodeToRenderSpec: () => ({ variant: 'shape', type: 'mermaid-class', props: {} }),
				})
			).toThrow("MermaidClassShapeUtil isn't in the editor's shapeUtils")
		})

		it('puts the end labels beside the arrow, bound to it, with the title in the middle', () => {
			const editor = createEditor()
			render(editor)

			const [arrow] = shapesOfType(editor, 'arrow')
			expect(text(editor, arrow)).toBe('has')
			const labels = shapesOfType(editor, 'text')
			expect(labels.map((shape) => text(editor, shape))).toEqual(['1', '*'])
			expect(
				labels.map(
					(label) =>
						editor
							.getBindingsToShape(label, 'mermaid-end-label')
							.find((binding) => binding.fromId === arrow.id)?.props
				)
			).toEqual([{ terminal: 'start' }, { terminal: 'end' }])
		})
	})
})

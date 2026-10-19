import { describe, expect, it, vi } from 'vitest'
import type { DiagramMermaidBlueprint } from './blueprint'
import { MermaidClassShapeUtil } from './classShape'
import { renderBlueprint } from './renderBlueprint'

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

	describe('class boxes', () => {
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'class',
			nodes: [
				{
					id: 'Animal',
					kind: 'class',
					x: 0,
					y: 0,
					w: 200,
					h: 200,
					label: 'Animal<br><br>+int age',
					classBox: {
						annotations: [],
						name: 'Animal',
						attributes: [{ text: '+int age' }],
						methods: [{ text: '+count() int', classifier: 'static' }],
					},
				},
			],
			edges: [],
		}

		function classShapeEditor(hasClassShape: boolean) {
			const editor = mockEditor()
			editor.hasShapeUtil = vi.fn((type: string) => hasClassShape && type === 'mermaid-class')
			editor.getShapeUtil = vi.fn(() => ({
				getDefaultProps: MermaidClassShapeUtil.prototype.getDefaultProps,
			}))
			editor.getCurrentTheme = vi.fn(() => ({
				fontSize: 16,
				lineHeight: 1.35,
				strokeWidth: 2,
				fonts: { draw: { fontFamily: 'tldraw_draw' } },
			}))
			editor.textMeasure = { measureText: vi.fn((text: string) => ({ w: text.length * 10 })) }
			return editor
		}

		it('draws a class box, sized to its lines and centred where mermaid put it', () => {
			const editor = classShapeEditor(true)

			renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

			const [shape] = editor.createShape.mock.calls[0]
			expect(shape.type).toBe('mermaid-class')
			expect(shape.props).toMatchObject({
				name: 'Animal',
				attributes: [{ text: '+int age' }],
				methods: [{ text: '+count() int', classifier: 'static' }],
			})
			expect(shape.x + shape.props.w / 2).toBe(100)
			expect(shape.y + shape.props.h / 2).toBe(100)
		})

		it('falls back to a labelled rectangle when the class shape is not registered', () => {
			const editor = classShapeEditor(false)

			renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

			const [shape] = editor.createShape.mock.calls[0]
			expect(shape).toMatchObject({ type: 'geo', props: { geo: 'rectangle', w: 200, h: 200 } })
		})

		it('lets a mapper choose the shape over the class box', () => {
			const editor = classShapeEditor(true)

			renderBlueprint(editor, blueprint, {
				position: { x: 0, y: 0 },
				centerOnPosition: false,
				mapNodeToRenderSpec: () => ({ variant: 'geo', geo: 'ellipse' }),
			})

			const [shape] = editor.createShape.mock.calls[0]
			expect(shape).toMatchObject({ type: 'geo', props: { geo: 'ellipse' } })
		})
	})

	describe('end labels', () => {
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'class',
			nodes: [
				{ id: 'Order', kind: 'class', x: 0, y: 0, w: 80, h: 40 },
				{ id: 'Line', kind: 'class', x: 200, y: 0, w: 80, h: 40 },
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
		const arrowLabel = (editor: any) => {
			const arrow = editor.createShape.mock.calls.find(([s]: any) => s.type === 'arrow')[0]
			return arrow.props.richText.content[0].content[0].text
		}

		it('folds them into the arrow label when the end label binding is not registered', () => {
			const editor = mockEditor()

			renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

			expect(arrowLabel(editor)).toBe('1 — has — *')
			expect(editor.createShape.mock.calls.filter(([s]: any) => s.type === 'text')).toEqual([])
		})

		it('binds a label to each end, watching the arrow and both shapes it joins', () => {
			const editor = mockEditor()
			editor.bindingUtils = { 'mermaid-multiplicity': {} }

			renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

			expect(arrowLabel(editor)).toBe('has')
			const labels = editor.createShape.mock.calls
				.map(([s]: any) => s)
				.filter((s: any) => s.type === 'text')
			expect(labels.map((s: any) => s.props.richText.content[0].content[0].text)).toEqual([
				'1',
				'*',
			])
			const endLabelBindings = editor.createBindings.mock.calls
				.flatMap(([bindings]: any) => bindings)
				.filter((b: any) => b.type === 'mermaid-multiplicity')
			expect(endLabelBindings.map((b: any) => [b.toId === labels[0].id, b.props.terminal])).toEqual(
				[
					[true, 'start'],
					[true, 'start'],
					[true, 'start'],
					[false, 'end'],
					[false, 'end'],
					[false, 'end'],
				]
			)
		})
	})
})

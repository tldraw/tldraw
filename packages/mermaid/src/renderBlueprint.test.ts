import { describe, expect, it, vi } from 'vitest'
import type { DiagramMermaidBlueprint } from './blueprint'
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
	const created: any[] = []
	const editor = {
		createShape: vi.fn((shape) => created.push(shape)),
		getShape: vi.fn((id) => ({ id, type: 'geo', x: 0, y: 0 })),
		// Text is set shorter than mermaid's box, so it gets centred within it.
		getShapePageBounds: vi.fn((id) =>
			created.find((shape) => shape.id === id)?.type === 'text' ? bounds(80, 20) : bounds(80, 40)
		),
		updateShape: vi.fn(),
		run: vi.fn((fn) => fn()),
		createBindings: vi.fn(),
		groupShapes: vi.fn(),
	}
	return { editor: editor as any, created }
}

describe('renderBlueprint', () => {
	it('sets a label with labelBounds as its own text, not on the arrow', () => {
		const { editor, created } = mockEditor()
		const blueprint: DiagramMermaidBlueprint = {
			diagramKind: 'flowchart',
			nodes: [{ id: 'B', kind: 'rect', x: 0, y: 0, w: 80, h: 40 }],
			edges: [
				{
					startNodeId: 'B',
					endNodeId: 'B',
					label: 'next page',
					bend: -60,
					anchorStartX: 0.375,
					anchorStartY: 1,
					anchorEndX: 0.75,
					anchorEndY: 1,
					labelBounds: { x: 0, y: 60, w: 80, h: 40 },
				},
			],
		}

		renderBlueprint(editor, blueprint, { position: { x: 0, y: 0 }, centerOnPosition: false })

		const arrow = created.find((shape) => shape.type === 'arrow')
		expect(arrow.props).not.toHaveProperty('richText')

		const text = created.find((shape) => shape.type === 'text')
		expect(text).toMatchObject({ x: 0, y: 60, props: { w: 80, autoSize: false } })
		expect(editor.updateShape).toHaveBeenCalledWith({ id: text.id, type: 'text', y: 70 })
	})

	it('anchors an arrow across the width of its shape, not only down its middle', () => {
		const { editor } = mockEditor()
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
})

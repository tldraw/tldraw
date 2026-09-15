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
	const editor = {
		createShape: vi.fn(),
		getShape: vi.fn((id) => ({ id, type: 'geo', x: 0, y: 0 })),
		getShapePageBounds: vi.fn(() => bounds(80, 40)),
		updateShape: vi.fn(),
		run: vi.fn((fn) => fn()),
		createBindings: vi.fn(),
		groupShapes: vi.fn(),
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
})

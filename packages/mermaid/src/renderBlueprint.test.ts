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
})

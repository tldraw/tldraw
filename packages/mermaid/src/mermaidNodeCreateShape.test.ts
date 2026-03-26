import { describe, expect, it, vi } from 'vitest'
import { defaultCreateMermaidNodeFromBlueprint } from './mermaidNodeCreateShape'

describe('defaultCreateMermaidNodeFromBlueprint', () => {
	it('creates a geo shape with merged props', () => {
		const createShape = vi.fn()
		const getShape = vi.fn(() => ({ id: 's1', type: 'geo' }))
		const editor = { createShape, getShape } as any
		const node = {
			id: 'A',
			kind: 'rect',
			x: 0,
			y: 0,
			w: 100,
			h: 50,
			label: 'Hi',
		}
		defaultCreateMermaidNodeFromBlueprint({
			editor,
			node,
			shapeId: 's1' as any,
			x: 10,
			y: 20,
			diagramKind: 'flowchart',
			render: { variant: 'geo', geo: 'diamond' },
		})
		expect(createShape).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 's1',
				type: 'geo',
				x: 10,
				y: 20,
				props: expect.objectContaining({
					geo: 'diamond',
					w: 100,
					h: 50,
				}),
			})
		)
	})

	it('creates a custom shape type with merged props', () => {
		const createShape = vi.fn()
		const getShape = vi.fn(() => ({ id: 's2', type: 'text' }))
		const editor = { createShape, getShape } as any
		const node = {
			id: 'B',
			kind: 'rect',
			x: 0,
			y: 0,
			w: 80,
			h: 40,
		}
		defaultCreateMermaidNodeFromBlueprint({
			editor,
			node,
			shapeId: 's2' as any,
			x: 0,
			y: 0,
			diagramKind: 'flowchart',
			render: {
				variant: 'shape',
				type: 'text',
				props: { font: 'draw' },
			},
		})
		expect(createShape).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 's2',
				type: 'text',
				props: expect.objectContaining({
					w: 80,
					h: 40,
					font: 'draw',
				}),
			})
		)
	})
})

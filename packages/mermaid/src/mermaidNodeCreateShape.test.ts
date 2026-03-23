import type { TLShapeId } from 'tldraw'
import { describe, expect, it, vi } from 'vitest'
import { defaultCreateMermaidNodeFromBlueprint } from './mermaidNodeCreateShape'

describe('defaultCreateMermaidNodeFromBlueprint', () => {
	it('creates a geo shape from render.variant geo', () => {
		const createShape = vi.fn()
		const getShape = vi.fn(() => ({ id: 'shape:s1', type: 'geo' }))
		const editor = { createShape, getShape } as any

		defaultCreateMermaidNodeFromBlueprint({
			editor,
			node: {
				id: 'n',
				x: 0,
				y: 0,
				w: 10,
				h: 20,
				kind: 'rect',
				render: { variant: 'geo', geo: 'diamond' },
			},
			shapeId: 'shape:s1' as TLShapeId,
			x: 5,
			y: 6,
			diagramKind: 'flowchart',
		})

		expect(createShape).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'shape:s1',
				type: 'geo',
				x: 5,
				y: 6,
				props: expect.objectContaining({ geo: 'diamond', w: 10, h: 20 }),
			})
		)
		expect(getShape).toHaveBeenCalledWith('shape:s1')
	})

	it('merges layout props with variant shape props', () => {
		const createShape = vi.fn()
		const getShape = vi.fn(() => ({ id: 'shape:s2', type: 'note' }))
		const editor = { createShape, getShape } as any

		defaultCreateMermaidNodeFromBlueprint({
			editor,
			node: {
				id: 'n',
				x: 0,
				y: 0,
				w: 30,
				h: 40,
				kind: 'rect',
				color: 'red' as const,
				render: {
					variant: 'shape',
					type: 'note',
					props: { growY: 12 },
				},
			},
			shapeId: 'shape:s2' as TLShapeId,
			x: 1,
			y: 2,
			diagramKind: 'flowchart',
		})

		expect(createShape).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'note',
				props: expect.objectContaining({ w: 30, h: 40, color: 'red', growY: 12 }),
			})
		)
	})
})

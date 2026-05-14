import { describe, expect, it, vi } from 'vitest'

vi.mock('tldraw', async (importOriginal) => {
	const actual = await importOriginal<typeof import('tldraw')>()
	let nextId = 0
	return {
		...actual,
		createShapeId: () => `shape:mock-${nextId++}` as any,
		toRichText: (text: string) => ({
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
		}),
		Vec: {
			Min: (a: { x: number; y: number }, b: { x: number; y: number }) => ({
				x: Math.min(a.x, b.x),
				y: Math.min(a.y, b.y),
			}),
		},
	}
})

import type { DiagramMermaidBlueprint, MermaidDiagramKind } from './blueprint'
import { renderBlueprint } from './renderBlueprint'

function makeFakeEditor() {
	const shapes = new Map<string, any>()
	const bindings: any[] = []
	let groupCounter = 0
	const pageId = 'page:mock' as const

	const editor: any = {
		user: { getIsPasteAtCursorMode: () => false },
		inputs: { getCurrentPagePoint: () => ({ x: 0, y: 0 }) },
		getViewportPageBounds: () => ({ center: { x: 0, y: 0 } }),
		getCurrentPageId: () => pageId,
		createShape: (shape: any) => {
			shapes.set(shape.id, { ...shape, meta: shape.meta ?? {}, parentId: pageId })
		},
		createBindings: (newBindings: any[]) => {
			bindings.push(...newBindings)
		},
		getShape: (id: string) => shapes.get(id),
		getShapePageBounds: (id: string) => {
			const shape = shapes.get(id)
			if (!shape) return undefined
			return {
				x: shape.x,
				y: shape.y,
				w: shape.props?.w ?? 100,
				h: shape.props?.h ?? 50,
				center: {
					x: shape.x + (shape.props?.w ?? 100) / 2,
					y: shape.y + (shape.props?.h ?? 50) / 2,
				},
			}
		},
		updateShape: (update: any) => {
			const existing = shapes.get(update.id)
			if (!existing) return
			shapes.set(update.id, {
				...existing,
				...update,
				meta: update.meta ?? existing.meta,
				props: { ...existing.props, ...(update.props ?? {}) },
			})
		},
		groupShapes: (memberIds: string[]) => {
			const groupId = `shape:group-${groupCounter++}`
			shapes.set(groupId, {
				id: groupId,
				type: 'group',
				x: 0,
				y: 0,
				parentId: pageId,
				meta: {},
				props: {},
			})
			for (const memberId of memberIds) {
				const member = shapes.get(memberId)
				if (member) shapes.set(memberId, { ...member, parentId: groupId })
			}
		},
		run: (fn: () => void) => fn(),
	}

	return { editor, shapes }
}

const flowchartBlueprint: DiagramMermaidBlueprint = {
	diagramKind: 'flowchart',
	nodes: [
		{ id: 'a', x: 0, y: 0, w: 100, h: 50, kind: 'rect', label: 'A' },
		{ id: 'b', x: 200, y: 0, w: 100, h: 50, kind: 'rect', label: 'B' },
	],
	edges: [{ startNodeId: 'a', endNodeId: 'b', bend: 0 }],
}

describe('renderBlueprint', () => {
	it('stamps the root group with meta.mermaidDiagramKind', () => {
		const { editor, shapes } = makeFakeEditor()

		renderBlueprint(editor, flowchartBlueprint, {
			position: { x: 0, y: 0 },
			centerOnPosition: false,
		})

		const root = [...shapes.values()].find((shape) => shape.type === 'group')
		expect(root).toBeDefined()
		expect(root.meta).toEqual({ mermaidDiagramKind: 'flowchart' })
	})

	it.each<MermaidDiagramKind>(['flowchart', 'state', 'sequence', 'mindmap'])(
		'stamps diagramKind=%s on the root',
		(diagramKind) => {
			const { editor, shapes } = makeFakeEditor()

			renderBlueprint(
				editor,
				{ ...flowchartBlueprint, diagramKind },
				{ position: { x: 0, y: 0 }, centerOnPosition: false }
			)

			const root = [...shapes.values()].find((shape) => shape.type === 'group')
			expect(root.meta.mermaidDiagramKind).toBe(diagramKind)
		}
	)

	it('stamps the single root shape when no grouping is needed', () => {
		const { editor, shapes } = makeFakeEditor()

		renderBlueprint(
			editor,
			{
				diagramKind: 'flowchart',
				nodes: [{ id: 'only', x: 0, y: 0, w: 100, h: 50, kind: 'rect', label: 'Only' }],
				edges: [],
			},
			{ position: { x: 0, y: 0 }, centerOnPosition: false }
		)

		const root = [...shapes.values()].find((shape) => shape.type !== 'group')
		expect(root).toBeDefined()
		expect(root.meta).toEqual({ mermaidDiagramKind: 'flowchart' })
	})
})

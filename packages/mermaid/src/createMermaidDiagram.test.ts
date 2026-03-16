// Mock tldraw so the browser runner never bundles the full workspace
// package (which contains untransformed JSX). We only provide the
// runtime values that createMermaidDiagram.ts and renderBlueprint.ts
// actually call; the type-only imports (Editor, TLShapeId, etc.) are
// elided by TypeScript and don't need runtime values.
let shapeIdCounter = 0
vi.mock('tldraw', () => ({
	createShapeId: () => `shape:mock-${shapeIdCounter++}` as any,
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
}))

import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'

function createMockEditor() {
	const shapes = new Map<string, any>()
	const bindings: any[] = []

	const editor = {
		createShape: vi.fn((shape: any) => {
			shapes.set(shape.id, { ...shape })
		}),
		createBindings: vi.fn((b: any[]) => {
			bindings.push(...b)
		}),
		run: vi.fn((fn: () => void) => fn()),
		getShapePageBounds: vi.fn((id: string) => {
			const s = shapes.get(id)
			if (!s) return null
			const w = s.props?.w ?? 100
			const h = s.props?.h ?? 60
			return {
				x: s.x,
				y: s.y,
				w,
				h,
				center: { x: s.x + w / 2, y: s.y + h / 2 },
			}
		}),
		getShape: vi.fn((id: string) => shapes.get(id) ?? null),
		groupShapes: vi.fn(),
		getCurrentPageId: vi.fn(() => 'page:page'),
		updateShape: vi.fn((update: any) => {
			const existing = shapes.get(update.id)
			if (existing) {
				if (update.x !== undefined) existing.x = update.x
				if (update.y !== undefined) existing.y = update.y
			}
		}),
		user: { getIsPasteAtCursorMode: vi.fn(() => false) },
		inputs: { getCurrentPagePoint: vi.fn(() => ({ x: 0, y: 0 })) },
		getViewportPageBounds: vi.fn(() => ({
			center: { x: 540, y: 360 },
		})),
	}

	return { editor: editor as any, shapes, bindings }
}

function createdShapesOfType(editor: any, type: string) {
	return editor.createShape.mock.calls
		.map((call: any[]) => call[0])
		.filter((s: any) => s.type === type)
}

beforeEach(() => {
	shapeIdCounter = 0
})

describe('createMermaidDiagram', () => {
	it('creates geo and arrow shapes from a flowchart', async () => {
		const { editor } = createMockEditor()

		await createMermaidDiagram(editor, 'flowchart TD\n  A[Start] --> B[End]', {
			blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
		})

		const geoShapes = createdShapesOfType(editor, 'geo')
		const arrowShapes = createdShapesOfType(editor, 'arrow')

		expect(geoShapes.length).toBeGreaterThanOrEqual(2)
		expect(arrowShapes.length).toBeGreaterThanOrEqual(1)
		expect(editor.createBindings).toHaveBeenCalled()
	})

	it('creates shapes from a state diagram', async () => {
		const { editor } = createMockEditor()

		await createMermaidDiagram(
			editor,
			'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active: start',
			{ blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false } }
		)

		const geoShapes = createdShapesOfType(editor, 'geo')
		const arrowShapes = createdShapesOfType(editor, 'arrow')

		expect(geoShapes.length).toBeGreaterThanOrEqual(2)
		expect(arrowShapes.length).toBeGreaterThanOrEqual(1)
	})

	it('creates shapes from a sequence diagram', async () => {
		const { editor } = createMockEditor()

		await createMermaidDiagram(editor, 'sequenceDiagram\n  Alice->>Bob: Hello', {
			blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
		})

		const geoShapes = createdShapesOfType(editor, 'geo')
		const arrowShapes = createdShapesOfType(editor, 'arrow')

		expect(geoShapes.length).toBeGreaterThanOrEqual(2)
		expect(arrowShapes.length).toBeGreaterThanOrEqual(1)
	})

	it('calls onUnsupportedDiagram for unsupported diagram types', async () => {
		const { editor } = createMockEditor()
		const onUnsupportedDiagram = vi.fn(async () => {})

		await createMermaidDiagram(editor, 'pie\n  "Dogs" : 386', {
			onUnsupportedDiagram,
			blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
		})

		expect(onUnsupportedDiagram).toHaveBeenCalledOnce()
		const svgArg = onUnsupportedDiagram.mock.calls[0] as unknown as [string]
		expect(svgArg[0]).toContain('<svg')
		expect(editor.createShape).not.toHaveBeenCalled()
	})

	it('throws MermaidDiagramError for invalid input', async () => {
		const { editor } = createMockEditor()

		await expect(
			createMermaidDiagram(editor, 'not a diagram at all', {
				blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
			})
		).rejects.toThrow(MermaidDiagramError)

		await expect(createMermaidDiagram(editor, 'not a diagram at all')).rejects.toMatchObject({
			type: 'parse',
		})
	})

	it('offsets shapes when position option is provided', async () => {
		const { editor } = createMockEditor()

		await createMermaidDiagram(editor, 'flowchart TD\n  A[Start] --> B[End]', {
			blueprintRender: { position: { x: 500, y: 300 }, centerOnPosition: false },
		})

		const geoShapes = createdShapesOfType(editor, 'geo')
		expect(geoShapes.length).toBeGreaterThanOrEqual(2)

		for (const shape of geoShapes) {
			expect(shape.x).toBeGreaterThanOrEqual(500)
			expect(shape.y).toBeGreaterThanOrEqual(300)
		}
	})
})

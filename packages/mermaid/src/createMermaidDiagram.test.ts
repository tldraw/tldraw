vi.mock('tldraw', async (importOriginal) => {
	const actual = await importOriginal<typeof import('tldraw')>()
	return {
		...actual,
		createShapeId: () => `shape:mock-0` as any,
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

import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'

describe('createMermaidDiagram', () => {
	it('throws MermaidDiagramError for invalid input', async () => {
		const editor = {} as any

		await expect(
			createMermaidDiagram(editor, 'not a diagram at all', {
				blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
			})
		).rejects.toThrow(MermaidDiagramError)

		await expect(createMermaidDiagram(editor, 'not a diagram at all')).rejects.toMatchObject({
			type: 'parse',
		})
	})
})

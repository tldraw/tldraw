import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'
import { parsePeleDiagram } from './peleDiagram'

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

	it('throws a parse error for a known diagram type with broken syntax', async () => {
		await expect(createMermaidDiagram({} as any, 'flowchart LR\n  A -->')).rejects.toMatchObject({
			diagramType: 'flowchart',
			type: 'parse',
		})
	})

	it('hands diagram types it cannot convert to onUnsupportedDiagram as an SVG', async () => {
		const pie = 'pie title Pets\n  "Dogs" : 386\n  "Cats" : 85'
		const onUnsupportedDiagram = vi.fn(async (_svg: string) => {})

		await createMermaidDiagram({} as any, pie, { onUnsupportedDiagram })

		expect(onUnsupportedDiagram).toHaveBeenCalledOnce()
		expect(onUnsupportedDiagram.mock.calls[0][0]).toMatch(/^<svg[^>]*class="pele pele-pie"/)
		await expect(createMermaidDiagram({} as any, pie)).rejects.toMatchObject({
			diagramType: 'pie',
			type: 'unsupported',
		})
	})

	describe('config set inside the diagram', () => {
		const source = `flowchart LR
    A[Some label] --> B[Another label]`

		async function width(text: string, config?: Record<string, any>) {
			const { pele } = (await parsePeleDiagram(text))!
			return pele.render(text, { fontSize: 25, config }).width
		}

		it.each([
			['an init directive', `%%{init: {"themeVariables": {"fontSize": "10px"}}}%%\n${source}`],
			['frontmatter', `---\nconfig:\n  themeVariables:\n    fontSize: 10px\n---\n${source}`],
		])('cannot shrink the layout font size from %s', async (_, text) => {
			// A smaller layout font sizes every box for text narrower than tldraw draws it.
			expect(await width(text)).toBe(await width(source))
		})

		it("applies the host's layout settings when the diagram sets none", async () => {
			expect(await width(source, { flowchart: { rankSpacing: 300 } })).toBeGreaterThan(
				await width(source)
			)
		})

		it("outranks the host's layout settings", async () => {
			const spaced = `---\nconfig:\n  flowchart:\n    rankSpacing: 300\n---\n${source}`

			expect(await width(spaced, { flowchart: { rankSpacing: 10 } })).toBe(await width(spaced))
			expect(await width(spaced)).toBeGreaterThan(await width(source))
		})
	})
})

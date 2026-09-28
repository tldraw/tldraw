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

	describe('config set inside the diagram', () => {
		// The config mermaid lays `source` out with, after our `initialize` and its own directives.
		async function effectiveConfig(source: string, mermaidConfig?: Record<string, any>) {
			// Runs our `mermaid.initialize` and then fails to parse, leaving mermaid configured.
			await expect(
				createMermaidDiagram({} as any, 'not a diagram at all', { mermaidConfig })
			).rejects.toThrow()
			const mermaid = (await import('mermaid')).default
			await mermaid.parse(source)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			return mermaid.mermaidAPI.getConfig()
		}

		const directive = `%%{init: {
  "securityLevel": "loose",
  "themeVariables": { "fontSize": "16px", "primaryColor": "#eef7ff" }
}}%%
stateDiagram-v2
    [*] --> Draft`

		const frontmatter = `---
config:
  securityLevel: loose
  themeVariables:
    fontSize: 16px
    primaryColor: "#eef7ff"
---
stateDiagram-v2
    [*] --> Draft`

		it.each([
			['an init directive', directive],
			['frontmatter', frontmatter],
		])('cannot shrink the layout font size from %s', async (_, source) => {
			const config = await effectiveConfig(source)

			// A smaller layout font sizes every box for text narrower than tldraw draws it.
			expect(config.themeVariables.fontSize).not.toBe('16px')
			// Only the font size is locked; the rest of the diagram's styling still applies.
			expect(config.themeVariables.primaryColor).toBe('#eef7ff')
			// Mermaid's own secure keys still apply alongside ours.
			expect(config.securityLevel).not.toBe('loose')
		})

		it('keeps secure keys the host passes in', async () => {
			const config = await effectiveConfig(
				`%%{init: {"theme": "dark"}}%%
stateDiagram-v2
    [*] --> Draft`,
				{ secure: ['theme'] }
			)

			expect(config.theme).not.toBe('dark')
		})
	})
})

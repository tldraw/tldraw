import { vi } from 'vitest'
import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'

async function getMermaid() {
	return (await import('mermaid')).default
}

describe('createMermaidDiagram', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

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
		// The config mermaid lays `source` out with part way through converting it. The conversion
		// then stops as a parse error.
		async function configDuringConversion(source: string) {
			const mermaid = await getMermaid()
			const parse = mermaid.parse
			let config: any
			vi.spyOn(mermaid, 'parse').mockImplementation(async (text) => {
				await parse(text)
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				config = mermaid.mermaidAPI.getConfig()
				return false as any
			})
			await expect(createMermaidDiagram({} as any, source)).rejects.toThrow()
			return config
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
			const config = await configDuringConversion(source)

			// A smaller layout font sizes every box for text narrower than tldraw draws it.
			expect(config.themeVariables.fontSize).not.toBe('16px')
			// Only the font size is overridden; the rest of the diagram's styling still applies.
			expect(config.themeVariables.primaryColor).toBe('#eef7ff')
			expect(config.securityLevel).not.toBe('loose')
		})
	})

	it("leaves the host app's own mermaid config as it was", async () => {
		const mermaid = await getMermaid()
		mermaid.initialize({
			theme: 'dark',
			fontFamily: 'Comic Sans MS',
			flowchart: { nodeSpacing: 5 },
		})
		try {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const { getSiteConfig } = mermaid.mermaidAPI
			const before = getSiteConfig()

			// Parses, then fails to lay out in jsdom, which has no text measurement.
			await expect(createMermaidDiagram({} as any, 'flowchart TD\n  A --> B')).rejects.toThrow()

			expect(getSiteConfig()).toEqual(before)
		} finally {
			mermaid.initialize({})
		}
	})
})

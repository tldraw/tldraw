import type { Mermaid, MermaidConfig } from 'mermaid'
import { createMermaidDiagram, MermaidDiagramError } from './createMermaidDiagram'

let mermaid: Mermaid

beforeAll(async () => {
	mermaid = (await import('mermaid')).default
})

afterEach(() => {
	vi.restoreAllMocks()
	mermaid.initialize({})
})

function getSiteConfig() {
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	return mermaid.mermaidAPI.getSiteConfig()
}

function getConfig() {
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	return mermaid.mermaidAPI.getConfig()
}

// The config mermaid lays each `source` out with, part way through converting it: after our
// `initialize` and the diagram's own directives. Each conversion then fails as a parse error.
async function configsDuringConversion(sources: string[], mermaidConfig?: Record<string, any>) {
	const parse = mermaid.parse
	const configs = new Map<string, ReturnType<typeof getConfig>>()
	vi.spyOn(mermaid, 'parse').mockImplementation(async (source) => {
		await parse(source)
		configs.set(source as string, getConfig())
		return false as any
	})
	await Promise.all(
		sources.map((source) =>
			expect(createMermaidDiagram({} as any, source, { mermaidConfig })).rejects.toThrow()
		)
	)
	return sources.map((source) => configs.get(source)!)
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
		it.each([
			['an init directive', directive],
			['frontmatter', frontmatter],
		])('cannot shrink the layout font size from %s', async (_, source) => {
			const [config] = await configsDuringConversion([source])

			// A smaller layout font sizes every box for text narrower than tldraw draws it.
			expect(config.themeVariables.fontSize).not.toBe('16px')
			// Only the font size is locked; the rest of the diagram's styling still applies.
			expect(config.themeVariables.primaryColor).toBe('#eef7ff')
			// Mermaid's own secure keys still apply alongside ours.
			expect(config.securityLevel).not.toBe('loose')
		})

		it('keeps secure keys the host passes in', async () => {
			const [config] = await configsDuringConversion(
				[
					`%%{init: {"theme": "dark"}}%%
stateDiagram-v2
    [*] --> Draft`,
				],
				{ secure: ['theme'] }
			)

			expect(config.theme).not.toBe('dark')
		})
	})

	describe("the host app's own mermaid config", () => {
		const hostConfig: MermaidConfig = {
			theme: 'dark',
			fontFamily: 'Comic Sans MS',
			secure: ['theme'],
			flowchart: { nodeSpacing: 5 },
		}

		it('is left as it was after a conversion', async () => {
			mermaid.initialize(hostConfig)
			const before = getSiteConfig()

			await expect(createMermaidDiagram({} as any, 'not a diagram at all')).rejects.toThrow()

			expect(getSiteConfig()).toEqual(before)
		})

		it('is left as it was after overlapping conversions', async () => {
			mermaid.initialize(hostConfig)
			const before = getSiteConfig()

			const configs = await configsDuringConversion([directive, frontmatter])

			// Neither conversion lays out with the host's config part way through the other.
			for (const config of configs) {
				expect(config.themeVariables.fontSize).not.toBe('16px')
				expect(config.flowchart?.nodeSpacing).not.toBe(5)
			}
			expect(getSiteConfig()).toEqual(before)
		})

		it('is restored when mermaid rejects the conversion config', async () => {
			mermaid.initialize(hostConfig)
			const before = getSiteConfig()

			await expect(
				createMermaidDiagram({} as any, 'not a diagram at all', {
					mermaidConfig: { themeVariables: { primaryColor: 'not a color' } },
				})
			).rejects.toThrow()

			expect(getSiteConfig()).toEqual(before)
			// A conversion left holding the config would stall every later one.
			await expect(createMermaidDiagram({} as any, 'not a diagram at all')).rejects.toThrow(
				MermaidDiagramError
			)
		})

		it('is restored before onUnsupportedDiagram runs', async () => {
			mermaid.initialize(hostConfig)
			const before = getSiteConfig()
			vi.spyOn(mermaid, 'render').mockResolvedValue({ svg: '<svg></svg>' } as any)

			let configInCallback
			await createMermaidDiagram({} as any, 'pie\n  "a": 1', {
				async onUnsupportedDiagram() {
					configInCallback = getSiteConfig()
					// Waiting on the conversion that called us would never finish.
					await expect(createMermaidDiagram({} as any, 'not a diagram at all')).rejects.toThrow()
				},
			})

			expect(configInCallback).toEqual(before)
		})

		it("still lets the host's diagrams choose their own layout and theme", async () => {
			mermaid.initialize({ theme: 'dark' })
			const sources = [
				// A layout the host never set must not be pinned over the one a diagram asks for.
				'flowchart-elk TD\n  a --> b',
				'%%{init: {"theme": "forest"}}%%\nflowchart TD\n  a --> b',
			]
			async function hostConfigs() {
				const configs = []
				for (const source of sources) {
					await mermaid.parse(source)
					configs.push(getConfig())
				}
				return configs
			}
			const before = await hostConfigs()

			await expect(createMermaidDiagram({} as any, 'not a diagram at all')).rejects.toThrow()

			expect(await hostConfigs()).toEqual(before)
		})
	})
})

import { FontEmbedder } from './FontEmbedder'

describe('FontEmbedder', () => {
	let style: HTMLStyleElement

	beforeEach(() => {
		style = document.createElement('style')
		style.textContent = `
			@font-face { font-family: 'Font A'; src: url('/font-a.woff2'); }
			@font-face { font-family: 'Font B'; src: url('/font-b.woff2'); }
		`
		document.head.appendChild(style)
	})

	afterEach(() => {
		style.remove()
	})

	it('embeds every family in a font-family list, even when an earlier one was already seen', async () => {
		const embedder = new FontEmbedder()
		embedder.startFindingDocumentFontFaces(document)

		embedder.onFontFamilyValue(`'Font A'`)
		embedder.onFontFamilyValue(`'Font A', 'Font B'`)

		const css = await embedder.createCss()
		expect(css).toContain('Font A')
		expect(css).toContain('Font B')
	})
})

import { vi } from 'vitest'
import { fetchCssFontFaces, FontEmbedder } from './FontEmbedder'
import { parseCssFontFaces } from './parseCss'

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

	it('retries a failed font fetch on the next export', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		// the parsed sheet is shared across exports through the fetch cache
		const fontFaces = parseCssFontFaces(
			`@font-face { font-family: 'Font A'; src: url(a.woff2); }`,
			'https://example.com/fonts.css'
		)
		const blob = new Blob(['font'], { type: 'font/woff2' })
		vi.spyOn(window, 'fetch')
			.mockResolvedValueOnce({ ok: false } as Response)
			.mockResolvedValue({ ok: true, blob: async () => blob } as Response)

		const exportCss = async () => {
			const embedder = new FontEmbedder()
			embedder.startFindingDocumentFontFaces(document)
			;(embedder as any).fontFacesPromise = Promise.resolve(fontFaces)
			embedder.onFontFamilyValue(`'Font A'`)
			return embedder.createCss()
		}

		expect(await exportCss()).toContain('url(a.woff2)')
		expect(await exportCss()).toContain('data:font/woff2;base64,')
	})
})

describe('fetchCssFontFaces', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('resolves when stylesheets @import each other', async () => {
		const sheets: Record<string, string> = {
			'https://example.com/a.css': `@import url(b.css); @font-face { font-family: 'Font A'; src: url(a.woff2); }`,
			'https://example.com/b.css': `@import url(a.css); @font-face { font-family: 'Font B'; src: url(b.woff2); }`,
		}
		vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
			const url = String(input)
			return { ok: true, url, text: async () => sheets[url] } as Response
		})

		const fontFaces = await fetchCssFontFaces('https://example.com/a.css')
		expect(fontFaces.map((f) => [...f.fontFamilies])).toEqual([['font a'], ['font b']])
	})

	it('keeps font order in source order when siblings import the same sheet', async () => {
		const sheets: Record<string, string> = {
			'https://example.com/root.css': `@import url(c.css); @import url(d.css);`,
			'https://example.com/c.css': `@import url(e.css); @font-face { font-family: 'Font C'; src: url(c.woff2); }`,
			'https://example.com/d.css': `@import url(e.css); @font-face { font-family: 'Font D'; src: url(d.woff2); }`,
			'https://example.com/e.css': `@font-face { font-family: 'Font E'; src: url(e.woff2); }`,
		}
		vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
			const url = String(input)
			// the first sibling resolves last, so the shared sheet is reached through the second first
			if (url.endsWith('c.css')) await new Promise((resolve) => setTimeout(resolve, 20))
			return { ok: true, url, text: async () => sheets[url] } as Response
		})

		const fontFaces = await fetchCssFontFaces('https://example.com/root.css')
		expect(fontFaces.map((f) => [...f.fontFamilies][0])).toEqual([
			'font c',
			'font e',
			'font d',
			'font e',
		])
	})
})

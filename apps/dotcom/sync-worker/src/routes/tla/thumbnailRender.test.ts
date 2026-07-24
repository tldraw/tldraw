import { describe, expect, it } from 'vitest'
import { makeSnapshot } from './screenshotTestHelpers'
import { buildThumbnailRenderUrl, enumerateBoardPages } from './thumbnailRender'

describe('enumerateBoardPages', () => {
	it('lists pages in fractional-index order with names and content flags', () => {
		const pages = enumerateBoardPages(
			makeSnapshot([
				{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
				{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
				{ id: 'page:c', name: '', index: 'a3', shapes: 0 },
			])
		)
		expect(pages).toEqual([
			{ index: 0, id: 'page:a', name: 'Cover', hasContent: true },
			{ index: 1, id: 'page:b', name: 'Ideas', hasContent: true },
			{ index: 2, id: 'page:c', name: 'Page 3', hasContent: false },
		])
	})
})

describe('buildThumbnailRenderUrl', () => {
	it('builds the render page URL with the token', () => {
		const url = new URL(buildThumbnailRenderUrl('https://render.example', 'the-token'))
		expect(url.pathname).toBe('/__thumbnail-render')
		expect(url.searchParams.get('token')).toBe('the-token')
	})
})

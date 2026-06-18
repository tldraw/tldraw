import { describe, expect, it } from 'vitest'
import { canonicalDocsPageUrl, canonicalizeDocsSitemapPath } from './sitemap-canonical-paths'

describe('canonicalizeDocsSitemapPath', () => {
	it('maps duplicate-content alias paths to canonical URLs', () => {
		expect(canonicalizeDocsSitemapPath('/getting-started/quick-start')).toBe('/quick-start')
		expect(canonicalizeDocsSitemapPath('/getting-started/installation')).toBe('/installation')
		expect(canonicalizeDocsSitemapPath('/releases-versioning')).toBe('/releases')
	})

	it('leaves canonical paths unchanged', () => {
		expect(canonicalizeDocsSitemapPath('/quick-start')).toBe('/quick-start')
		expect(canonicalizeDocsSitemapPath('/releases')).toBe('/releases')
	})
})

describe('canonicalDocsPageUrl', () => {
	it('emits production-absolute canonical for alias and canonical paths', () => {
		expect(canonicalDocsPageUrl('/getting-started/quick-start')).toBe(
			'https://tldraw.dev/quick-start'
		)
		expect(canonicalDocsPageUrl('/quick-start')).toBe('https://tldraw.dev/quick-start')
	})
})

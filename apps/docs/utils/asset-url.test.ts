import { describe, expect, it } from 'vitest'
import { assetUrl } from './asset-url'

describe('assetUrl', () => {
	it('returns the original path when ASSET_PREFIX is unset', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			delete process.env.ASSET_PREFIX
			delete process.env.VERCEL_URL
			expect(assetUrl('/favicon.svg')).toBe('/favicon.svg')
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})

	it('returns the original path when ASSET_PREFIX is empty/whitespace', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			process.env.ASSET_PREFIX = '   '
			delete process.env.VERCEL_URL
			expect(assetUrl('/favicon.svg')).toBe('/favicon.svg')
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})

	it('prefixes root-relative paths', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			delete process.env.VERCEL_URL
			expect(assetUrl('/images/foo.png')).toBe('https://docs.example.com/images/foo.png')
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})

	it('strips a trailing slash from the prefix', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			process.env.ASSET_PREFIX = 'https://docs.example.com/'
			delete process.env.VERCEL_URL
			expect(assetUrl('/images/foo.png')).toBe('https://docs.example.com/images/foo.png')
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})

	it('uses VERCEL_URL when ASSET_PREFIX is unset', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			delete process.env.ASSET_PREFIX
			process.env.VERCEL_URL = 'tldraw-docs-abc123.vercel.app'
			expect(assetUrl('/images/foo.png')).toBe(
				'https://tldraw-docs-abc123.vercel.app/images/foo.png'
			)
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})

	it('prefers ASSET_PREFIX over VERCEL_URL', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			process.env.ASSET_PREFIX = 'https://explicit.example.com'
			process.env.VERCEL_URL = 'tldraw-docs-abc123.vercel.app'
			expect(assetUrl('/favicon.svg')).toBe('https://explicit.example.com/favicon.svg')
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})

	it('does not change non-root-relative paths', () => {
		const prevPrefix = process.env.ASSET_PREFIX
		const prevVercel = process.env.VERCEL_URL
		try {
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			delete process.env.VERCEL_URL
			expect(assetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
			expect(assetUrl('relative.png')).toBe('relative.png')
		} finally {
			process.env.ASSET_PREFIX = prevPrefix
			process.env.VERCEL_URL = prevVercel
		}
	})
})

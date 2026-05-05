import { describe, expect, it } from 'vitest'
import { assetUrl } from './asset-url'

describe('assetUrl', () => {
	it('returns the original path when ASSET_PREFIX is unset', () => {
		const prev = process.env.ASSET_PREFIX
		try {
			delete process.env.ASSET_PREFIX
			expect(assetUrl('/favicon.svg')).toBe('/favicon.svg')
		} finally {
			process.env.ASSET_PREFIX = prev
		}
	})

	it('returns the original path when ASSET_PREFIX is empty/whitespace', () => {
		const prev = process.env.ASSET_PREFIX
		try {
			process.env.ASSET_PREFIX = '   '
			expect(assetUrl('/favicon.svg')).toBe('/favicon.svg')
		} finally {
			process.env.ASSET_PREFIX = prev
		}
	})

	it('prefixes root-relative paths', () => {
		const prev = process.env.ASSET_PREFIX
		try {
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			expect(assetUrl('/images/foo.png')).toBe('https://docs.example.com/images/foo.png')
		} finally {
			process.env.ASSET_PREFIX = prev
		}
	})

	it('strips a trailing slash from the prefix', () => {
		const prev = process.env.ASSET_PREFIX
		try {
			process.env.ASSET_PREFIX = 'https://docs.example.com/'
			expect(assetUrl('/images/foo.png')).toBe('https://docs.example.com/images/foo.png')
		} finally {
			process.env.ASSET_PREFIX = prev
		}
	})

	it('does not change non-root-relative paths', () => {
		const prev = process.env.ASSET_PREFIX
		try {
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			expect(assetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
			expect(assetUrl('relative.png')).toBe('relative.png')
		} finally {
			process.env.ASSET_PREFIX = prev
		}
	})
})

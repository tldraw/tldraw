import { describe, expect, it } from 'vitest'
import { assetUrl } from './asset-url'

describe('assetUrl', () => {
	it('returns the original path when no origin env is set', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			expect(assetUrl('/favicon.svg')).toBe('/favicon.svg')
		} finally {
			restoreEnv(prev)
		}
	})

	it('returns the original path when ASSET_PREFIX is empty/whitespace', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = '   '
			expect(assetUrl('/favicon.svg')).toBe('/favicon.svg')
		} finally {
			restoreEnv(prev)
		}
	})

	it('prefixes root-relative paths with ASSET_PREFIX', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			expect(assetUrl('/images/foo.png')).toBe('https://docs.example.com/images/foo.png')
		} finally {
			restoreEnv(prev)
		}
	})

	it('strips a trailing slash from the prefix', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = 'https://docs.example.com/'
			expect(assetUrl('/images/foo.png')).toBe('https://docs.example.com/images/foo.png')
		} finally {
			restoreEnv(prev)
		}
	})

	it('uses VERCEL_URL when ASSET_PREFIX is unset', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.VERCEL_URL = 'tldraw-docs-abc123.vercel.app'
			expect(assetUrl('/images/foo.png')).toBe(
				'https://tldraw-docs-abc123.vercel.app/images/foo.png'
			)
		} finally {
			restoreEnv(prev)
		}
	})

	it('uses NEXT_PUBLIC_VERCEL_URL when other origins unset', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.NEXT_PUBLIC_VERCEL_URL = 'preview.vercel.app'
			expect(assetUrl('/x')).toBe('https://preview.vercel.app/x')
		} finally {
			restoreEnv(prev)
		}
	})

	it('prefers ASSET_PREFIX over NEXT_PUBLIC_DOCS_ASSET_PREFIX', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = 'https://primary.example.com'
			process.env.NEXT_PUBLIC_DOCS_ASSET_PREFIX = 'https://ignored.example.com'
			expect(assetUrl('/favicon.svg')).toBe('https://primary.example.com/favicon.svg')
		} finally {
			restoreEnv(prev)
		}
	})

	it('uses NEXT_PUBLIC_DOCS_ASSET_PREFIX when ASSET_PREFIX unset', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.NEXT_PUBLIC_DOCS_ASSET_PREFIX = 'https://docs-public.example.com'
			expect(assetUrl('/images/a.png')).toBe('https://docs-public.example.com/images/a.png')
		} finally {
			restoreEnv(prev)
		}
	})

	it('uses NEXT_PUBLIC_ASSET_PREFIX when earlier keys unset', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.NEXT_PUBLIC_ASSET_PREFIX = 'https://np.example.com'
			expect(assetUrl('/b.png')).toBe('https://np.example.com/b.png')
		} finally {
			restoreEnv(prev)
		}
	})

	it('prefers ASSET_PREFIX over VERCEL_URL', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = 'https://explicit.example.com'
			process.env.VERCEL_URL = 'tldraw-docs-abc123.vercel.app'
			expect(assetUrl('/favicon.svg')).toBe('https://explicit.example.com/favicon.svg')
		} finally {
			restoreEnv(prev)
		}
	})

	it('does not change https URLs or relative filenames', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			expect(assetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
			expect(assetUrl('relative.png')).toBe('relative.png')
		} finally {
			restoreEnv(prev)
		}
	})

	it('does not prefix protocol-relative URLs', () => {
		const prev = saveEnv()
		try {
			clearAssetEnv()
			process.env.ASSET_PREFIX = 'https://docs.example.com'
			expect(assetUrl('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png')
		} finally {
			restoreEnv(prev)
		}
	})
})

function saveEnv() {
	return {
		ASSET_PREFIX: process.env.ASSET_PREFIX,
		NEXT_PUBLIC_ASSET_PREFIX: process.env.NEXT_PUBLIC_ASSET_PREFIX,
		NEXT_PUBLIC_DOCS_ASSET_PREFIX: process.env.NEXT_PUBLIC_DOCS_ASSET_PREFIX,
		VERCEL_URL: process.env.VERCEL_URL,
		NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
	}
}

function restoreEnv(prev: ReturnType<typeof saveEnv>) {
	for (const [k, v] of Object.entries(prev)) {
		if (v === undefined) delete process.env[k as keyof typeof prev]
		else process.env[k as keyof typeof prev] = v
	}
}

function clearAssetEnv() {
	delete process.env.ASSET_PREFIX
	delete process.env.NEXT_PUBLIC_ASSET_PREFIX
	delete process.env.NEXT_PUBLIC_DOCS_ASSET_PREFIX
	delete process.env.VERCEL_URL
	delete process.env.NEXT_PUBLIC_VERCEL_URL
}

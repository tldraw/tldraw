import { GitStorage } from '@pierre/storage'
import { Environment } from '../types'

/** Stable 0–99 bucket for staggered Pierre rollout (same slug always maps to the same bucket). */
export function hashSlugToBucket(slug: string): number {
	let h = 0
	for (let i = 0; i < slug.length; i++) {
		h = (Math.imul(h, 31) + slug.charCodeAt(i)) | 0
	}
	return (h >>> 0) % 100
}

/** In production, Pierre snapshots are enabled for 10% of app file slugs (bucket < 10). Elsewhere, all slugs. */
export function isSlugInPierreRollout(env: Environment, slug: string): boolean {
	if (env.TLDRAW_ENV !== 'production') {
		return true
	}
	return hashSlugToBucket(slug) < 10
}

export function createPierreClient(env: Environment): GitStorage | undefined {
	if (!env.PIERRE_KEY) {
		return undefined
	}

	try {
		return new GitStorage({
			name: 'tldraw',
			key: env.PIERRE_KEY,
		})
	} catch (error) {
		console.error('Failed to initialize Pierre client:', error)
		return undefined
	}
}

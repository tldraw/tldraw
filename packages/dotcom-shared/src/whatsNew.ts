export interface WhatsNewUpdate {
	id: string
	title: string
	/** Markdown. */
	body: string
	status: 'draft' | 'published'
	/** Set on first publish and never changed, so unpublishing to fix a mistake doesn't re-announce it. */
	publishedAt: number | null
	createdAt: number
	updatedAt: number
}

export interface WhatsNewStore {
	version: number
	updates: WhatsNewUpdate[]
}

export interface WhatsNewResponse {
	updates: WhatsNewUpdate[]
}

/** Upload routes only take single-segment object names, so this is a name prefix, not a folder. */
export const WHATS_NEW_MEDIA_PREFIX = 'whats-new-'

export const WHATS_NEW_MEDIA_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'video/mp4': 'mp4',
}

export const WHATS_NEW_MEDIA_MAX_BYTES = 20 * 1024 * 1024

/** Drafts first (updatedAt desc), then Published (publishedAt desc). */
export function sortWhatsNewUpdates(updates: WhatsNewUpdate[]): WhatsNewUpdate[] {
	const drafts = updates
		.filter((u) => u.status === 'draft')
		.sort((a, b) => b.updatedAt - a.updatedAt)
	const published = updates
		.filter((u) => u.status === 'published')
		.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
	return [...drafts, ...published]
}

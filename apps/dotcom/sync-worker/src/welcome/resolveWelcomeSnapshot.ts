import { RoomSnapshot } from '@tldraw/sync-core'
import { createPostgresConnectionPool } from '../postgres'
import { getPublishedRoomSnapshot } from '../routes/tla/getPublishedFile'
import { Environment } from '../types'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'

/**
 * The content a new workspace's first file is seeded with (createSource 'welcome'): the
 * published snapshot of the file currently marked as the welcome template, or a committed
 * default when none is marked or the marked one can't be loaded (fresh env, deploy skew,
 * unpublished, missing R2). Always resolves — the default guarantees a usable file.
 */
export async function resolveWelcomeSnapshot(env: Environment): Promise<RoomSnapshot> {
	const slug = await getWelcomeTemplateSlug(env)
	if (slug) {
		try {
			const published = await getPublishedRoomSnapshot(env, slug)
			if (published) return published
		} catch {
			// fall through to the committed default
		}
	}
	return JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
}

async function getWelcomeTemplateSlug(env: Environment): Promise<string | null> {
	try {
		const row = await createPostgresConnectionPool(env, 'resolveWelcomeSnapshot')
			.selectFrom('welcome_template')
			.select('publishedSlug')
			.executeTakeFirst()
		return row?.publishedSlug ?? null
	} catch {
		// no row / table missing → use the committed default
		return null
	}
}

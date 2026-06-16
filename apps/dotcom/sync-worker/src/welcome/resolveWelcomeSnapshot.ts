import { RoomSnapshot } from '@tldraw/sync-core'
import { createPostgresConnectionPool } from '../postgres'
import { getPublishedRoomSnapshot } from '../routes/tla/getPublishedFile'
import { Environment } from '../types'
import { defaultWelcomeSnapshotJson } from './defaultWelcomeSnapshot'

/**
 * The content a new workspace's first file is seeded with (createSource 'welcome'): the
 * published snapshot of the file currently marked as the welcome template, or a committed
 * default when none is marked or the marked one can't be loaded. Always resolves — the
 * default guarantees a usable file.
 *
 * Falling back is deliberate, but a template that is *set yet unreadable* (unpublished,
 * missing R2, transient DB error) is a misconfiguration, not the fresh-env no-template case,
 * so it is reported via `reportError` while still degrading to the default. `reportError` is
 * the calling Durable Object's error reporter; the no-template case is silent.
 */
export async function resolveWelcomeSnapshot(
	env: Environment,
	reportError?: (e: unknown) => void
): Promise<RoomSnapshot> {
	// Runs inside a Durable Object, so destroy the pool to avoid an idle connection holding
	// the DO awake (see TLPostgresPool in postgres.ts).
	const pg = createPostgresConnectionPool(env, 'resolveWelcomeSnapshot')
	try {
		const row = await pg.selectFrom('welcome_template').select('publishedSlug').executeTakeFirst()
		if (row?.publishedSlug) {
			const published = await getPublishedRoomSnapshot(env, row.publishedSlug)
			if (published) return published
			// A template is configured but its published snapshot is gone — flag it, don't
			// silently serve the default as if nothing were set.
			reportError?.(new Error(`welcome template ${row.publishedSlug} has no published snapshot`))
		}
	} catch (e) {
		// A configured template that fails to load, or a DB error reading the pointer — report
		// it; only a genuinely-absent template should fall back silently.
		reportError?.(e)
	} finally {
		await pg.destroy()
	}
	return JSON.parse(defaultWelcomeSnapshotJson) as RoomSnapshot
}

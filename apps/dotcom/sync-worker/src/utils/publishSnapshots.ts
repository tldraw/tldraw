import { TlaFile } from '@tldraw/dotcom-shared'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { getRoomDurableObject } from './durableObjects'

// Infra errors propagate so the outbox consumer can retry; a missing snapshot is terminal and skips.
export async function publishSnapshot(
	env: Environment,
	file: TlaFile,
	reportError?: (error: unknown) => void
) {
	// make sure the room's snapshot is up to date
	await getRoomDurableObject(env, file.id).awaitPersist()
	// and that it exists
	const snapshot = await env.ROOMS.get(getR2KeyForRoom({ slug: file.id, isApp: true }))

	if (!snapshot) {
		// No persisted room content (e.g. created and trashed before the first persist):
		// there is nothing to publish and retrying cannot produce it.
		const error = new Error(`publishSnapshot: no snapshot for file ${file.id}, skipping`)
		reportError?.(error)
		console.error(error.message)
		return
	}
	const blob = await snapshot.blob()

	// Create a new slug for the published room
	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

	// Bang the snapshot into the database
	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
		blob
	)
	const currentTime = new Date().toISOString()
	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
		blob
	)
}

export async function unpublishSnapshot(env: Environment, file: TlaFile) {
	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)
	await env.ROOM_SNAPSHOTS.delete(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true })
	)
}
